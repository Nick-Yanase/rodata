-- Endurecimento de segurança (revisão de 10/11/2026). Ver docs/seguranca.md.

-- 1) Autoria não pode ser falsificada: quem lança é sempre o usuário logado,
--    e a autoria não muda depois.
create function public.force_author() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'trips' then
    if tg_op = 'INSERT' then new.created_by := auth.uid();
    else new.created_by := old.created_by; end if;
  else
    if tg_op = 'INSERT' then new.author_id := auth.uid();
    else new.author_id := old.author_id; end if;
  end if;
  -- a viagem/anotação também não pode ser movida para outra organização
  if tg_op = 'UPDATE' then new.org_id := old.org_id; end if;
  return new;
end;
$$;

create trigger trips_force_author before insert or update on public.trips
  for each row execute function public.force_author();
create trigger notes_force_author before insert or update on public.notes
  for each row execute function public.force_author();

-- 2) Convites: limite de tentativas erradas (contra adivinhar códigos).
--    Erro não pode ser "raise", senão o registro da tentativa é desfeito junto:
--    código inválido devolve null e o app mostra a mensagem.
create table public.invite_attempts (
  user_id       uuid not null references auth.users (id) on delete cascade,
  attempted_at  timestamptz not null default now()
);
create index invite_attempts_user_idx on public.invite_attempts (user_id, attempted_at desc);
alter table public.invite_attempts enable row level security; -- sem políticas: só as funções acessam

create or replace function public.accept_invite(p_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_invite public.organization_invites;
  v_failures int;
begin
  if auth.uid() is null then
    raise exception 'Faça login para aceitar o convite' using errcode = '28000';
  end if;

  select count(*) into v_failures
  from public.invite_attempts
  where user_id = auth.uid() and attempted_at > now() - interval '1 hour';
  if v_failures >= 10 then
    raise exception 'Muitas tentativas. Espere uma hora e tente de novo.' using errcode = '54000';
  end if;

  select * into v_invite
  from public.organization_invites
  where code = upper(trim(p_code))
    and status = 'pending'
    and expires_at > now()
  for update;

  if v_invite.id is null then
    insert into public.invite_attempts (user_id) values (auth.uid());
    return null;
  end if;

  if exists (select 1 from public.organization_members
             where org_id = v_invite.org_id and user_id = auth.uid()) then
    return v_invite.org_id;
  end if;

  insert into public.organization_members (org_id, user_id, role)
  values (v_invite.org_id, auth.uid(), 'member');

  update public.organization_invites
     set status = 'used', used_by = auth.uid(), used_at = now()
   where id = v_invite.id;

  return v_invite.org_id;
end;
$$;

-- 3) O dono não sai da organização (ela ficaria sem ninguém para gerir membros).
drop policy members_delete on public.organization_members;
create policy members_delete on public.organization_members for delete to authenticated
  using (
    (user_id = auth.uid() and role <> 'owner')
    or (public.is_owner(org_id) and role <> 'owner')
  );

-- 4) Cancelar convite só muda o status; não troca organização nem código.
drop policy invites_update on public.organization_invites;
create policy invites_update on public.organization_invites for update to authenticated
  using (public.is_member(org_id))
  with check (public.is_member(org_id) and status = 'revoked');

create function public.invites_immutable() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.org_id <> old.org_id or new.code <> old.code or new.created_by is distinct from old.created_by then
    raise exception 'Convite não pode ser alterado' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger organization_invites_immutable before update on public.organization_invites
  for each row execute function public.invites_immutable();

-- 5) Foto de perfil só do próprio bucket (evita imagem externa que rastreia quem abre a lista).
alter table public.profiles
  add constraint profiles_avatar_own_bucket check (
    avatar_url is null
    or avatar_url like '%/storage/v1/object/public/avatars/' || id::text || '/%'
  );

-- 6) Limites de tamanho (evita encher o banco) e de valor (erros de digitação absurdos).
alter table public.profiles add constraint profiles_name_len check (length(name) <= 120);
alter table public.organizations add constraint organizations_name_len check (length(name) <= 120);
alter table public.trips
  add constraint trips_text_len check (length(title) <= 200 and length(origin) <= 120 and length(destination) <= 120),
  add constraint trips_amounts_max check (
    greatest(freight_cents, fuel_cents, toll_cents, food_cents, maintenance_cents, other_cents) <= 100000000000
  ),
  add constraint trips_km_max check (km is null or km <= 100000);
alter table public.notes add constraint notes_len check (length(title) <= 200 and length(body) <= 10000);
