-- Testes das políticas de acesso, das organizações e das funções de análise.
-- Rodar com: npm run test:db
\set ON_ERROR_STOP on
set client_min_messages = warning;

-- Usuários: fretista A, analista C (mesma organização no fim) e intruso B
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@x.com', '{"name":"Fretista A"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@x.com', '{"name":"Intruso B"}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@x.com', '{"name":"Analista C"}');

do $$ begin
  assert (select count(*) from public.profiles) = 3, 'trigger deve criar 3 perfis';
end $$;

create temp table ctx (key text primary key, val text);
grant all on ctx to authenticated;

set role authenticated;

-- A cria a organização e lança viagens
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
insert into ctx values ('org', public.create_organization('Transportes A')::text);

do $$
declare v_org uuid := (select val::uuid from ctx where key = 'org');
begin
  assert (select role from public.organization_members where org_id = v_org and user_id = auth.uid()) = 'owner',
    'quem cria é dono';
  assert (select count(*) from public.organization_settings where org_id = v_org) = 1, 'configuração criada junto';
end $$;

insert into public.trips (id, org_id, title, destination, trip_date, freight_cents, fuel_cents, toll_cents, food_cents, maintenance_cents)
select gen_random_uuid(), (select val::uuid from ctx where key = 'org'), v.*
from (values
  ('Viagem 1', 'Presidente Prudente - SP', date '2026-01-05', 60000::bigint, 10000::bigint, 5000::bigint, 3000::bigint, 2000::bigint),
  ('Viagem 2', 'Bauru - SP',              date '2026-01-20', 80000, 20000, 0, 0, 0),
  ('Viagem 3', 'Marília - SP',            date '2025-12-10', 50000, 10000, 0, 0, 0)
) as v(title, destination, trip_date, freight, fuel, toll, food, maint);

do $$
declare
  v_org uuid := (select val::uuid from ctx where key = 'org');
  s jsonb;
begin
  s := public.dashboard_summary(v_org, '2026-01-01', '2026-01-31', '2025-12-01', '2025-12-31');
  assert (s->'current'->>'revenue')::bigint = 140000, 'receita total jan = 1.400,00';
  assert (s->'current'->>'cost')::bigint = 40000, 'custo jan = 400,00';
  assert (s->'current'->>'net')::bigint = 100000, 'receita faturada jan = 1.000,00';
  assert (s->'current'->>'trips')::int = 2, '2 viagens em jan';
  assert (s->'previous'->>'revenue')::bigint = 50000, 'receita dez = 500,00';
  assert (select count(*) from public.timeline(v_org, '2026-01-01', '2026-01-31', 'day')) = 31,
    'timeline diária preenche os 31 dias';
  assert (select sum(revenue) from public.timeline(v_org, '2025-12-01', '2026-01-31', 'month')) = 190000,
    'timeline mensal soma tudo';
  assert (select created_by from public.trips limit 1) = auth.uid(), 'created_by preenchido automaticamente';
end $$;

-- Intruso B não vê nada e não escreve na organização de A
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$
declare
  v_org uuid := (select val::uuid from ctx where key = 'org');
  s jsonb;
begin
  assert (select count(*) from public.trips) = 0, 'B não vê viagens de A';
  assert (select count(*) from public.organizations) = 0, 'B não vê a organização de A';
  s := public.dashboard_summary(v_org, '2026-01-01', '2026-01-31', '2025-12-01', '2025-12-31');
  assert (s->'current'->>'revenue')::bigint = 0, 'B não soma receita de A';
  begin
    insert into public.trips (id, org_id, trip_date, freight_cents) values (gen_random_uuid(), v_org, '2026-01-01', 1);
    assert false, 'B não pode inserir viagem na organização de A';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.create_invite(v_org);
    assert false, 'B não pode gerar convite da organização de A';
  exception when insufficient_privilege then null;
  end;
end $$;

-- A convida; C entra com o código
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
insert into ctx select 'code', code from public.create_invite((select val::uuid from ctx where key = 'org'));

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$
declare
  v_org uuid := (select val::uuid from ctx where key = 'org');
  v_code text := (select val from ctx where key = 'code');
begin
  assert public.accept_invite(lower(v_code)) = v_org, 'aceite devolve a organização';
  assert (select count(*) from public.trips) = 3, 'C vê as 3 viagens';
  assert (select count(*) from public.profiles) = 2, 'C vê o próprio perfil e o de A';
  -- convite não pode ser reutilizado por outra pessoa
  assert (select status from public.organization_invites where code = v_code) = 'used', 'convite marcado como usado';

  -- C pode tudo: lançar, editar, excluir viagem e editar a configuração
  insert into public.trips (id, org_id, title, trip_date, freight_cents)
  values ('00000000-0000-0000-0000-0000000000f1', v_org, 'Lançada pela analista', '2026-01-25', 30000);
  update public.trips set freight_cents = 35000 where id = '00000000-0000-0000-0000-0000000000f1';
  assert (select freight_cents from public.trips where id = '00000000-0000-0000-0000-0000000000f1') = 35000, 'C edita viagem';
  update public.trips set fuel_cents = 1 where title = 'Viagem 1';
  assert (select fuel_cents from public.trips where title = 'Viagem 1') = 1, 'C edita viagem lançada por A';
  update public.organization_settings set mei_opened_at = '2024-05-01' where org_id = v_org;
  assert (select mei_opened_at from public.organization_settings where org_id = v_org) = '2024-05-01', 'C edita a configuração';
  insert into public.notes (id, org_id, title) values (gen_random_uuid(), v_org, 'Revisar pedágios');

  -- C não remove o dono
  delete from public.organization_members where user_id = '00000000-0000-0000-0000-00000000000a';
  assert (select count(*) from public.organization_members where org_id = v_org) = 2, 'membro não remove o dono';
end $$;

-- B tenta usar o código já usado
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  begin
    perform public.accept_invite((select val from ctx where key = 'code'));
    assert false, 'convite usado não pode ser aceito de novo';
  exception when no_data_found then null;
  end;
end $$;

-- A vê o que C fez e a remove
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$
declare v_org uuid := (select val::uuid from ctx where key = 'org');
begin
  assert (select count(*) from public.trips) = 4, 'A vê a viagem lançada por C';
  assert (select count(*) from public.notes) = 1, 'A vê a anotação de C';
  update public.notes set title = 'Revisar pedágios (feito)';
  assert (select title from public.notes) = 'Revisar pedágios (feito)', 'A edita anotação de C';
  delete from public.organization_members where org_id = v_org and user_id = '00000000-0000-0000-0000-00000000000c';
end $$;

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$ begin
  assert (select count(*) from public.trips) = 0, 'removida, C não vê mais nada';
end $$;

-- anônimo não executa as funções
reset role;
set role anon;
do $$ begin
  begin
    perform public.dashboard_summary(gen_random_uuid(), '2026-01-01', '2026-01-31', '2025-12-01', '2025-12-31');
    assert false, 'anon não executa dashboard_summary';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

select 'OK: todos os testes de banco passaram' as resultado;
