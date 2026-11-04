-- Testes das políticas de acesso e das funções de análise.
-- Rodar com: npm run test:db
\set ON_ERROR_STOP on
set client_min_messages = warning;

-- Usuários: fretista A, fretista B, analista C
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@x.com', '{"name":"Fretista A","role":"driver"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@x.com', '{"name":"Fretista B","role":"driver"}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@x.com', '{"name":"Analista C","role":"analyst"}');

do $$ begin
  assert (select count(*) from public.profiles) = 3, 'trigger deve criar 3 perfis';
  assert (select role from public.profiles where name = 'Analista C') = 'analyst', 'papel do analista';
end $$;

set role authenticated;

-- Fretista A lança viagens
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
insert into public.trips (id, title, destination, trip_date, freight_cents, fuel_cents, toll_cents, food_cents, maintenance_cents)
values
  (gen_random_uuid(), 'Viagem 1', 'Presidente Prudente - SP', '2026-01-05', 60000, 10000, 5000, 3000, 2000),
  (gen_random_uuid(), 'Viagem 2', 'Bauru - SP',              '2026-01-20', 80000, 20000, 0, 0, 0),
  (gen_random_uuid(), 'Viagem 3', 'Marília - SP',            '2025-12-10', 50000, 10000, 0, 0, 0);

do $$
declare s jsonb;
begin
  s := public.dashboard_summary('00000000-0000-0000-0000-00000000000a', '2026-01-01', '2026-01-31', '2025-12-01', '2025-12-31');
  assert (s->'current'->>'revenue')::bigint = 140000, 'receita total jan = 1.400,00';
  assert (s->'current'->>'cost')::bigint = 40000, 'custo jan = 400,00';
  assert (s->'current'->>'net')::bigint = 100000, 'receita faturada jan = 1.000,00';
  assert (s->'current'->>'trips')::int = 2, '2 viagens em jan';
  assert (s->'previous'->>'revenue')::bigint = 50000, 'receita dez = 500,00';
  assert (select count(*) from public.timeline('00000000-0000-0000-0000-00000000000a', '2026-01-01', '2026-01-31', 'day')) = 31,
    'timeline diária preenche os 31 dias';
  assert (select sum(revenue) from public.timeline('00000000-0000-0000-0000-00000000000a', '2025-12-01', '2026-01-31', 'month')) = 190000,
    'timeline mensal soma tudo';
end $$;

-- Fretista B não vê dados de A e não consegue escrever em nome de A
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$
declare s jsonb;
begin
  assert (select count(*) from public.trips) = 0, 'B não vê viagens de A';
  s := public.dashboard_summary('00000000-0000-0000-0000-00000000000a', '2026-01-01', '2026-01-31', '2025-12-01', '2025-12-31');
  assert (s->'current'->>'revenue')::bigint = 0, 'B não soma receita de A';
  begin
    insert into public.trips (id, driver_id, trip_date, freight_cents)
    values (gen_random_uuid(), '00000000-0000-0000-0000-00000000000a', '2026-01-01', 1);
    assert false, 'B não pode inserir viagem para A';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Analista C sem vínculo não vê nada
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$ begin
  assert (select count(*) from public.trips) = 0, 'C sem vínculo não vê viagens';
end $$;

-- A cria convite; C aceita
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
create temp table invite as select invite_code from public.create_invite();
grant select on invite to authenticated;

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$
declare v_driver uuid;
begin
  v_driver := public.accept_invite(lower((select invite_code from invite)));
  assert v_driver = '00000000-0000-0000-0000-00000000000a', 'aceite retorna o fretista';
  assert (select count(*) from public.trips) = 3, 'C vê as 3 viagens de A';
  assert (select count(*) from public.profiles) = 2, 'C vê o próprio perfil e o de A';
  -- convite não pode ser reutilizado
  begin
    perform public.accept_invite((select invite_code from invite));
    assert false, 'convite usado não pode ser aceito de novo';
  exception when no_data_found then null;
  end;
  -- analista não altera viagens
  update public.trips set freight_cents = 1;
  assert (select min(freight_cents) from public.trips) > 1, 'C não altera viagens de A';
  -- analista pode anotar sobre o fretista
  insert into public.notes (id, driver_id, title) values (gen_random_uuid(), '00000000-0000-0000-0000-00000000000a', 'Revisar pedágios');
end $$;

-- A vê o perfil do analista e a anotação; B não consegue aceitar o próprio convite
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  assert (select count(*) from public.profiles) = 2, 'A vê o próprio perfil e o do analista';
  assert (select count(*) from public.notes) = 1, 'A vê a anotação do analista';
  update public.notes set title = 'x';
  assert (select title from public.notes) = 'Revisar pedágios', 'A não edita anotação do analista';
end $$;

-- A revoga o acesso; C deixa de ver
update public.analyst_links set status = 'revoked' where analyst_id = '00000000-0000-0000-0000-00000000000c';
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$ begin
  assert (select count(*) from public.trips) = 0, 'após revogar, C não vê mais nada';
end $$;

-- anônimo não executa as funções
reset role;
set role anon;
do $$ begin
  begin
    perform public.dashboard_summary('00000000-0000-0000-0000-00000000000a', '2026-01-01', '2026-01-31', '2025-12-01', '2025-12-31');
    assert false, 'anon não executa dashboard_summary';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

select 'OK: todos os testes de banco passaram' as resultado;
