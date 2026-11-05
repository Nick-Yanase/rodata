-- Dados de demonstração para desenvolvimento local (npx supabase db reset).
-- Organização "Transportes Yanase" com dois membros (senha rodata123):
--   fretista@rodata.dev (dono) e analista@rodata.dev
-- NÃO usar em produção.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated',
   'fretista@rodata.dev', extensions.crypt('rodata123', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Nicolas Yanase"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated',
   'analista@rodata.dev', extensions.crypt('rodata123', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Ana Analista"}', now(), now(), '', '', '', '');

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, id::text, jsonb_build_object('sub', id::text, 'email', email), 'email', now(), now(), now()
from auth.users where email in ('fretista@rodata.dev', 'analista@rodata.dev');

insert into public.organizations (id, name, created_by)
values ('99999999-9999-9999-9999-999999999999', 'Transportes Yanase', '11111111-1111-1111-1111-111111111111');

insert into public.organization_members (org_id, user_id, role) values
  ('99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', 'owner'),
  ('99999999-9999-9999-9999-999999999999', '22222222-2222-2222-2222-222222222222', 'member');

insert into public.organization_settings (org_id, mei_opened_at)
values ('99999999-9999-9999-9999-999999999999', '2023-03-01');

-- ~14 meses de viagens (3 a 6 por mês), com sazonalidade leve no meio do ano.
insert into public.trips (id, org_id, created_by, title, origin, destination, trip_date,
                          freight_cents, fuel_cents, toll_cents, food_cents, maintenance_cents, other_cents, km)
select
  gen_random_uuid(),
  '99999999-9999-9999-9999-999999999999',
  '11111111-1111-1111-1111-111111111111',
  '',
  'Bauru - SP',
  (array['Presidente Prudente - SP','Marília - SP','Ribeirão Preto - SP','Campinas - SP','Londrina - PR','São José do Rio Preto - SP'])[1 + (abs(hashtext(d::text || n::text)) % 6)],
  d,
  f,
  round(f * 0.22)::bigint,
  round(f * 0.07)::bigint,
  (4000 + (abs(hashtext(d::text)) % 4000))::bigint,
  case when n = 1 and extract(day from d) < 10 then 35000 else 0 end,
  0,
  (300 + (abs(hashtext(n::text || d::text)) % 400))
from (
  select
    (date_trunc('month', current_date) - (m || ' months')::interval
      + ((n * 6 + abs(hashtext(m::text)) % 5) || ' days')::interval)::date as d,
    n,
    ((180000 + (abs(hashtext(m::text || n::text)) % 120000))
      * (1 + 0.25 * sin(pi() * (extract(month from current_date - (m || ' months')::interval) - 3) / 6)))::bigint as f
  from generate_series(0, 13) as m,
       generate_series(1, 4 + (abs(hashtext(m::text)) % 2)) as n
) s
where d <= current_date;

insert into public.notes (id, org_id, author_id, title, body, note_date) values
  (gen_random_uuid(), '99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111',
   'Cliente de Marília paga dia 10', 'Combinar adiantamento de 30% para fretes acima de R$ 2.000.', current_date - 3),
  (gen_random_uuid(), '99999999-9999-9999-9999-999999999999', '22222222-2222-2222-2222-222222222222',
   'Revisar pedágios da rota de Londrina', 'Os pedágios subiram em relação ao mês passado. Vale comparar com a rota pela SP-270.', current_date - 1);
