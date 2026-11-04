-- Rodata — esquema inicial
-- Valores monetários em centavos (bigint). Datas no fuso America/Sao_Paulo (date, sem hora).

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Perfis
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null default '',
  role        text not null default 'driver' check (role in ('driver', 'analyst')),
  created_at  timestamptz not null default now()
);

-- Cria o perfil automaticamente quando alguém se cadastra.
-- O app envia { name, role } em options.data no signUp.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    case when new.raw_user_meta_data ->> 'role' = 'analyst' then 'analyst' else 'driver' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Vínculo fretista ↔ analista (convite por código)
-- ---------------------------------------------------------------------------
create table public.analyst_links (
  id           uuid primary key default gen_random_uuid(),
  driver_id    uuid not null references public.profiles (id) on delete cascade,
  analyst_id   uuid references public.profiles (id) on delete cascade,
  invite_code  text not null unique,
  status       text not null default 'pending' check (status in ('pending', 'active', 'revoked')),
  expires_at   timestamptz not null default now() + interval '7 days',
  accepted_at  timestamptz,
  created_at   timestamptz not null default now()
);

create index analyst_links_driver_idx on public.analyst_links (driver_id);
create index analyst_links_analyst_idx on public.analyst_links (analyst_id) where status = 'active';
create unique index analyst_links_pair_uq on public.analyst_links (driver_id, analyst_id)
  where status = 'active';

-- Quem pode ver os dados de um fretista: ele mesmo ou um analista com vínculo ativo.
-- security definer para não entrar em recursão com as políticas de analyst_links.
create function public.can_access_driver(p_driver uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_driver = auth.uid()
      or exists (
        select 1 from public.analyst_links l
        where l.driver_id = p_driver
          and l.analyst_id = auth.uid()
          and l.status = 'active'
      );
$$;

-- ---------------------------------------------------------------------------
-- Configuração do negócio (enquadramento e limite anual)
-- ---------------------------------------------------------------------------
create table public.business_settings (
  driver_id           uuid primary key references public.profiles (id) on delete cascade,
  regime              text not null default 'mei_tac' check (regime in ('mei', 'mei_tac', 'me', 'other')),
  cnpj_opened_at      date,
  -- nulo = usar o limite padrão do regime (definido no app, src/domain/mei.ts)
  annual_limit_cents  bigint check (annual_limit_cents is null or annual_limit_cents > 0),
  updated_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Viagens
-- id gerado no aparelho (permite criar viagem sem internet)
-- ---------------------------------------------------------------------------
create table public.trips (
  id                 uuid primary key,
  driver_id          uuid not null default auth.uid() references public.profiles (id) on delete cascade,
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

create index trips_driver_date_idx on public.trips (driver_id, trip_date desc);
create index trips_search_idx on public.trips
  using gin ((title || ' ' || origin || ' ' || destination) extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Anotações
-- ---------------------------------------------------------------------------
create table public.notes (
  id          uuid primary key,
  driver_id   uuid not null references public.profiles (id) on delete cascade,
  author_id   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title       text not null,
  body        text not null default '',
  note_date   date not null default current_date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index notes_driver_date_idx on public.notes (driver_id, note_date desc);
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
create trigger business_settings_touch before update on public.business_settings
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.analyst_links     enable row level security;
alter table public.business_settings enable row level security;
alter table public.trips             enable row level security;
alter table public.notes             enable row level security;

-- perfis: o próprio, e os perfis com quem há vínculo ativo (nas duas direções)
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or public.can_access_driver(id)
    or exists (
      select 1 from public.analyst_links l
      where l.analyst_id = profiles.id and l.driver_id = auth.uid() and l.status = 'active'
    )
  );
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- vínculos: fretista vê/cria/revoga os seus; analista vê os que aceitou
create policy links_select on public.analyst_links for select to authenticated
  using (driver_id = auth.uid() or analyst_id = auth.uid());
create policy links_insert on public.analyst_links for insert to authenticated
  with check (driver_id = auth.uid() and analyst_id is null and status = 'pending');
create policy links_update on public.analyst_links for update to authenticated
  using (driver_id = auth.uid() or analyst_id = auth.uid())
  with check (status = 'revoked');

-- configuração: leitura por quem acessa o fretista; escrita só pelo fretista
create policy settings_select on public.business_settings for select to authenticated
  using (public.can_access_driver(driver_id));
create policy settings_insert on public.business_settings for insert to authenticated
  with check (driver_id = auth.uid());
create policy settings_update on public.business_settings for update to authenticated
  using (driver_id = auth.uid()) with check (driver_id = auth.uid());

-- viagens: leitura por quem acessa o fretista; escrita só pelo fretista (RN-05)
create policy trips_select on public.trips for select to authenticated
  using (public.can_access_driver(driver_id));
create policy trips_insert on public.trips for insert to authenticated
  with check (driver_id = auth.uid());
create policy trips_update on public.trips for update to authenticated
  using (driver_id = auth.uid()) with check (driver_id = auth.uid());
create policy trips_delete on public.trips for delete to authenticated
  using (driver_id = auth.uid());

-- anotações: leitura por quem acessa o fretista; fretista e analista escrevem as próprias
create policy notes_select on public.notes for select to authenticated
  using (public.can_access_driver(driver_id));
create policy notes_insert on public.notes for insert to authenticated
  with check (author_id = auth.uid() and public.can_access_driver(driver_id));
create policy notes_update on public.notes for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid() and public.can_access_driver(driver_id));
create policy notes_delete on public.notes for delete to authenticated
  using (author_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Convites
-- ---------------------------------------------------------------------------
create function public.create_invite() returns public.analyst_links
language plpgsql security invoker set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- sem 0/O/1/I para não confundir
  code text;
  result public.analyst_links;
begin
  if auth.uid() is null then
    raise exception 'Faça login para convidar' using errcode = '28000';
  end if;
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    begin
      insert into public.analyst_links (driver_id, invite_code)
      values (auth.uid(), code)
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
  v_driver uuid;
begin
  if auth.uid() is null then
    raise exception 'Faça login para aceitar o convite' using errcode = '28000';
  end if;

  update public.analyst_links
     set analyst_id = auth.uid(), status = 'active', accepted_at = now()
   where invite_code = upper(trim(p_code))
     and status = 'pending'
     and expires_at > now()
     and driver_id <> auth.uid()
     and not exists (
       select 1 from public.analyst_links a
       where a.driver_id = analyst_links.driver_id
         and a.analyst_id = auth.uid()
         and a.status = 'active'
     )
  returning driver_id into v_driver;

  if v_driver is null then
    raise exception 'Código inválido, expirado ou já usado' using errcode = 'P0002';
  end if;
  return v_driver;
end;
$$;

-- ---------------------------------------------------------------------------
-- Análises (security invoker → respeitam o RLS)
-- ---------------------------------------------------------------------------

-- Totais de um período. Receita total = soma dos fretes; receita faturada = total − custos.
create function public.period_totals(p_driver uuid, p_start date, p_end date) returns jsonb
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
  where driver_id = p_driver
    and trip_date between p_start and p_end;
$$;

-- Topo do dashboard em uma única chamada: período analisado × período comparado.
create function public.dashboard_summary(
  p_driver uuid, p_start date, p_end date, p_cmp_start date, p_cmp_end date
) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'current',  public.period_totals(p_driver, p_start, p_end),
    'previous', public.period_totals(p_driver, p_cmp_start, p_cmp_end)
  );
$$;

-- Série temporal com buckets vazios preenchidos com zero.
create function public.timeline(p_driver uuid, p_start date, p_end date, p_grain text)
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
    where t.driver_id = p_driver
      and t.trip_date between p_start and p_end
    group by 1
  )
  select b.bucket, coalesce(x.revenue, 0)::bigint, coalesce(x.cost, 0)::bigint
  from buckets b
  left join totals x using (bucket)
  order by b.bucket;
end;
$$;

revoke execute on function public.create_invite() from anon, public;
revoke execute on function public.accept_invite(text) from anon, public;
revoke execute on function public.period_totals(uuid, date, date) from anon, public;
revoke execute on function public.dashboard_summary(uuid, date, date, date, date) from anon, public;
revoke execute on function public.timeline(uuid, date, date, text) from anon, public;
grant execute on function public.create_invite() to authenticated;
grant execute on function public.accept_invite(text) to authenticated;
grant execute on function public.period_totals(uuid, date, date) to authenticated;
grant execute on function public.dashboard_summary(uuid, date, date, date, date) to authenticated;
grant execute on function public.timeline(uuid, date, date, text) to authenticated;
