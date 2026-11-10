-- Endurecimento de segurança: autoria, convites, dono, limites.
\set ON_ERROR_STOP on
set client_min_messages = warning;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000d1', 'd1@x.com', '{"name":"Dono"}'),
  ('00000000-0000-0000-0000-0000000000e1', 'e1@x.com', '{"name":"Membro"}'),
  ('00000000-0000-0000-0000-0000000000f1', 'f1@x.com', '{"name":"Curioso"}');

create temp table sctx (key text primary key, val text);
grant all on sctx to authenticated;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d1';
insert into sctx values ('org', public.create_organization('Segura'));
insert into sctx select 'code', code from public.create_invite((select val::uuid from sctx where key = 'org'));

set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
do $$
declare v_org uuid := (select val::uuid from sctx where key = 'org');
begin
  assert public.accept_invite((select val from sctx where key = 'code')) = v_org, 'membro entra';

  -- autoria forçada: tenta lançar em nome do dono
  insert into public.trips (id, org_id, created_by, trip_date, freight_cents)
  values ('00000000-0000-0000-0000-00000000aaa1', v_org, '00000000-0000-0000-0000-0000000000d1', '2026-01-01', 100);
  assert (select created_by from public.trips where id = '00000000-0000-0000-0000-00000000aaa1')
         = '00000000-0000-0000-0000-0000000000e1', 'created_by é sempre quem lançou';
  update public.trips set created_by = '00000000-0000-0000-0000-0000000000d1' where id = '00000000-0000-0000-0000-00000000aaa1';
  assert (select created_by from public.trips where id = '00000000-0000-0000-0000-00000000aaa1')
         = '00000000-0000-0000-0000-0000000000e1', 'autoria não muda';

  insert into public.notes (id, org_id, author_id, title)
  values ('00000000-0000-0000-0000-00000000bbb1', v_org, '00000000-0000-0000-0000-0000000000d1', 'x');
  assert (select author_id from public.notes where id = '00000000-0000-0000-0000-00000000bbb1')
         = '00000000-0000-0000-0000-0000000000e1', 'author_id é sempre quem escreveu';

  -- limites
  begin
    insert into public.trips (id, org_id, trip_date, freight_cents) values (gen_random_uuid(), v_org, '2026-01-01', 100000000001);
    assert false, 'frete absurdo é recusado';
  exception when check_violation then null;
  end;
  begin
    update public.profiles set avatar_url = 'https://rastreador.exemplo/pixel.gif' where id = auth.uid();
    assert false, 'foto externa é recusada';
  exception when check_violation then null;
  end;
end $$;

-- convite: não pode ser "sequestrado" ao cancelar
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d1';
insert into sctx select 'code2', code from public.create_invite((select val::uuid from sctx where key = 'org'));
do $$ begin
  begin
    update public.organization_invites set status = 'revoked', code = 'AAAAAA' where code = (select val from sctx where key = 'code2');
    assert false, 'código do convite não muda';
  exception when insufficient_privilege then null;
  end;
  -- dono não consegue sair sozinho
  delete from public.organization_members where user_id = auth.uid();
  assert (select count(*) from public.organization_members where user_id = auth.uid()) = 1, 'dono não sai da organização';
end $$;

-- força bruta: 10 erros por hora
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
do $$
declare blocked boolean := false;
begin
  for i in 1..10 loop
    assert public.accept_invite('ZZZZZ' || i) is null, 'código inválido devolve null';
  end loop;
  begin
    perform public.accept_invite((select val from sctx where key = 'code2'));
  exception when program_limit_exceeded then blocked := true;
  end;
  assert blocked, 'após 10 erros, até código válido é bloqueado por 1 hora';
  assert (select count(*) from public.organization_members where user_id = auth.uid()) = 0, 'curioso não entrou';
end $$;
reset role;

select 'OK: segurança' as resultado;
