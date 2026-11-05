-- Rodata — esquema inicial
-- Os dados pertencem a uma ORGANIZAÇÃO (o negócio do fretista). Fretista e analista são
-- membros da mesma organização e têm os mesmos poderes: lançar, editar e analisar.
-- Valores monetários em centavos (bigint). Datas de calendário (date, sem hora).

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Perfis
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null default '',
  created_at  timestamptz not null default now()
);

-- Cria o perfil automaticamente no cadastro (o app envia { name } em options.data).
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Organizações e membros
-- ---------------------------------------------------------------------------
create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create table public.organization_members (
  org_id     uuid not null references public.organizations (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  -- owner: quem criou (pode remover outros membros). member: convidado.
  role       text not null default 'member' check (role in ('owner', 'member')),
  joined_at  timestamptz not null default now(),
  primary key (org_id, user_id)
);

create index organization_members_user_idx on public.organization_members (user_id);

-- O usuário logado é membro da organização?
-- security definer para não entrar em recursão com as políticas de organization_members.
create function public.is_member(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_members m
    where m.org_id = p_org and m.user_id = auth.uid()
  );
$$;

create function public.is_owner(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_members m
    where m.org_id = p_org and m.user_id = auth.uid() and m.role = 'owner'
  );
$$;

-- Convites por código (enviado pelo WhatsApp)
create table public.organization_invites (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  code        text not null unique,
  created_by  uuid references public.profiles (id) on delete set null,
  status      text not null default 'pending' check (status in ('pending', 'used', 'revoked')),
  used_by     uuid references public.profiles (id) on delete set null,
  used_at     timestamptz,
  expires_at  timestamptz not null default now() + interval '7 days',
  created_at  timestamptz not null default now()
);

create index organization_invites_org_idx on public.organization_invites (org_id);

-- ---------------------------------------------------------------------------
-- Configuração do negócio
-- O público é o MEI Caminhoneiro: o teto anual é fixo no app (src/domain/mei.ts).
-- A abertura do MEI só importa no primeiro ano, quando o teto é proporcional.
-- ---------------------------------------------------------------------------
create table public.organization_settings (
  org_id          uuid primary key references public.organizations (id) on delete cascade,
  -- primeiro dia do mês de abertura (o app pede só mês/ano)
  mei_opened_at   date,
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Viagens — id gerado no aparelho (permite criar viagem sem internet)
-- ---------------------------------------------------------------------------
create table public.trips (
  id                 uuid primary key,
  org_id             uuid not null references public.organizations (id) on delete cascade,
  created_by         uuid default auth.uid() references public.profiles (id) on delete set null,
  title              text not null default '',
  origin             text not null default '',
  destination        text not null default '',
  trip_date          date not null,
  freight_cents      bigint not null check (freight_cents >= 0),
  fuel_cents         bigint not null default 0 check (fuel_cents >= 0),
  toll_cents         bigint not null default 0 check (toll_cents >= 0),
  food_cents         bigint not null default 0 check (food_cents >= 0),
  maintenance_cents  bigint not null default 0 check (maintenance_cents >= 0),
  other_cents        bigint not null default 0 check (other_cents >= 0),
  cost_cents         bigint generated always as
                       (fuel_cents + toll_cents + food_cents + maintenance_cents + other_cents) stored,
  km                 integer check (km is null or km >= 0),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index trips_org_date_idx on public.trips (org_id, trip_date desc);
create index trips_search_idx on public.trips
  using gin ((title || ' ' || origin || ' ' || destination) extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Anotações
-- ---------------------------------------------------------------------------
create table public.notes (
  id          uuid primary key,
  org_id      uuid not null references public.organizations (id) on delete cascade,
  author_id   uuid default auth.uid() references public.profiles (id) on delete set null,
  title       text not null,
  body        text not null default '',
  note_date   date not null default current_date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index notes_org_date_idx on public.notes (org_id, note_date desc);
create index notes_search_idx on public.notes
  using gin ((title || ' ' || body) extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------------
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trips_touch before update on public.trips
  for each row execute function public.touch_updated_at();
create trigger notes_touch before update on public.notes
  for each row execute function public.touch_updated_at();
create trigger organization_settings_touch before update on public.organization_settings
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: membro da organização pode tudo nos dados dela
-- ---------------------------------------------------------------------------
alter table public.profiles              enable row level security;
alter table public.organizations         enable row level security;
alter table public.organization_members  enable row level security;
alter table public.organization_invites  enable row level security;
alter table public.organization_settings enable row level security;
alter table public.trips                 enable row level security;
alter table public.notes                 enable row level security;

-- perfis: o próprio e os de quem está em alguma organização comigo
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1 from public.organization_members mine
      join public.organization_members theirs on theirs.org_id = mine.org_id
      where mine.user_id = auth.uid() and theirs.user_id = profiles.id
    )
  );
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- organizações: membros veem e renomeiam; criação via create_organization(); dono exclui
create policy orgs_select on public.organizations for select to authenticated
  using (public.is_member(id));
create policy orgs_update on public.organizations for update to authenticated
  using (public.is_member(id)) with check (public.is_member(id));
create policy orgs_delete on public.organizations for delete to authenticated
  using (public.is_owner(id));

-- membros: veem os colegas; cada um pode sair; o dono remove outros
-- (a entrada é sempre pelo accept_invite / create_organization)
create policy members_select on public.organization_members for select to authenticated
  using (public.is_member(org_id));
create policy members_delete on public.organization_members for delete to authenticated
  using (user_id = auth.uid() or (public.is_owner(org_id) and role <> 'owner'));

-- convites: membros veem, criam (via create_invite) e cancelam
create policy invites_select on public.organization_invites for select to authenticated
  using (public.is_member(org_id));
create policy invites_insert on public.organization_invites for insert to authenticated
  with check (public.is_member(org_id) and created_by = auth.uid() and status = 'pending');
create policy invites_update on public.organization_invites for update to authenticated
  using (public.is_member(org_id)) with check (status = 'revoked');

-- configuração, viagens e anotações: tudo para membros
create policy settings_all on public.organization_settings for all to authenticated
  using (public.is_member(org_id)) with check (public.is_member(org_id));
create policy trips_all on public.trips for all to authenticated
  using (public.is_member(org_id)) with check (public.is_member(org_id));
create policy notes_all on public.notes for all to authenticated
  using (public.is_member(org_id)) with check (public.is_member(org_id));

-- ---------------------------------------------------------------------------
-- Funções de organização
-- ---------------------------------------------------------------------------
create function public.create_organization(p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid;
begin
  if auth.uid() is null then
    raise exception 'Faça login para criar a organização' using errcode = '28000';
  end if;
  insert into public.organizations (name, created_by)
  values (trim(p_name), auth.uid())
  returning id into v_org;
  insert into public.organization_members (org_id, user_id, role)
  values (v_org, auth.uid(), 'owner');
  insert into public.organization_settings (org_id) values (v_org);
  return v_org;
end;
$$;

create function public.create_invite(p_org uuid) returns public.organization_invites
language plpgsql security invoker set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- sem 0/O/1/I para não confundir
  v_code text;
  result public.organization_invites;
begin
  if not public.is_member(p_org) then
    raise exception 'Você não faz parte desta organização' using errcode = '42501';
  end if;
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    begin
      insert into public.organization_invites (org_id, code, created_by)
      values (p_org, v_code, auth.uid())
      returning * into result;
      return result;
    exception when unique_violation then
      -- código repetido: tenta outro
    end;
  end loop;
end;
$$;

create function public.accept_invite(p_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_invite public.organization_invites;
begin
  if auth.uid() is null then
    raise exception 'Faça login para aceitar o convite' using errcode = '28000';
  end if;

  select * into v_invite
  from public.organization_invites
  where code = upper(trim(p_code))
    and status = 'pending'
    and expires_at > now()
  for update;

  if v_invite.id is null then
    raise exception 'Código inválido, expirado ou já usado' using errcode = 'P0002';
  end if;

  -- já é membro: não gasta o convite
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

-- ---------------------------------------------------------------------------
-- Análises (security invoker → respeitam o RLS)
-- ---------------------------------------------------------------------------

-- Totais de um período. Receita total = soma dos fretes; receita faturada = total − custos.
create function public.period_totals(p_org uuid, p_start date, p_end date) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'trips',       count(*),
    'revenue',     coalesce(sum(freight_cents), 0),
    'fuel',        coalesce(sum(fuel_cents), 0),
    'toll',        coalesce(sum(toll_cents), 0),
    'food',        coalesce(sum(food_cents), 0),
    'maintenance', coalesce(sum(maintenance_cents), 0),
    'other',       coalesce(sum(other_cents), 0),
    'cost',        coalesce(sum(cost_cents), 0),
    'net',         coalesce(sum(freight_cents - cost_cents), 0),
    'km',          coalesce(sum(km), 0)
  )
  from public.trips
  where org_id = p_org
    and trip_date between p_start and p_end;
$$;

-- Topo do dashboard em uma única chamada: período analisado × período comparado.
create function public.dashboard_summary(
  p_org uuid, p_start date, p_end date, p_cmp_start date, p_cmp_end date
) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'current',  public.period_totals(p_org, p_start, p_end),
    'previous', public.period_totals(p_org, p_cmp_start, p_cmp_end)
  );
$$;

-- Série temporal com buckets vazios preenchidos com zero.
create function public.timeline(p_org uuid, p_start date, p_end date, p_grain text)
returns table (bucket date, revenue bigint, cost bigint)
language plpgsql stable security invoker set search_path = '' as $$
begin
  if p_grain not in ('day', 'week', 'month') then
    raise exception 'granularidade inválida: %', p_grain;
  end if;
  if p_end < p_start then
    raise exception 'período inválido';
  end if;
  if p_grain = 'day' and p_end - p_start > 400 then
    raise exception 'período longo demais para visão diária';
  end if;

  return query
  with buckets as (
    select generate_series(
      date_trunc(p_grain, p_start::timestamp),
      date_trunc(p_grain, p_end::timestamp),
      ('1 ' || p_grain)::interval
    )::date as bucket
  ),
  totals as (
    select date_trunc(p_grain, t.trip_date::timestamp)::date as bucket,
           sum(t.freight_cents) as revenue,
           sum(t.cost_cents) as cost
    from public.trips t
    where t.org_id = p_org
      and t.trip_date between p_start and p_end
    group by 1
  )
  select b.bucket, coalesce(x.revenue, 0)::bigint, coalesce(x.cost, 0)::bigint
  from buckets b
  left join totals x using (bucket)
  order by b.bucket;
end;
$$;

revoke execute on function public.create_organization(text) from anon, public;
revoke execute on function public.create_invite(uuid) from anon, public;
revoke execute on function public.accept_invite(text) from anon, public;
revoke execute on function public.period_totals(uuid, date, date) from anon, public;
revoke execute on function public.dashboard_summary(uuid, date, date, date, date) from anon, public;
revoke execute on function public.timeline(uuid, date, date, text) from anon, public;
grant execute on function public.create_organization(text) to authenticated;
grant execute on function public.create_invite(uuid) to authenticated;
grant execute on function public.accept_invite(text) to authenticated;
grant execute on function public.period_totals(uuid, date, date) to authenticated;
grant execute on function public.dashboard_summary(uuid, date, date, date, date) to authenticated;
grant execute on function public.timeline(uuid, date, date, text) to authenticated;
