-- Fotos de perfil: cada um só grava na própria pasta do bucket "avatars".
\set ON_ERROR_STOP on
set client_min_messages = warning;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'a1@x.com', '{"name":"Foto A"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'b1@x.com', '{"name":"Foto B"}');

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';

do $$ begin
  insert into storage.objects (bucket_id, name)
  values ('avatars', '00000000-0000-0000-0000-0000000000a1/abc.jpg');

  begin
    insert into storage.objects (bucket_id, name)
    values ('avatars', '00000000-0000-0000-0000-0000000000b1/hack.jpg');
    assert false, 'A não pode gravar na pasta de B';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into storage.objects (bucket_id, name) values ('avatars', 'solto.jpg');
    assert false, 'arquivo fora de uma pasta de usuário é recusado';
  exception when insufficient_privilege then null;
  end;

  assert (select count(*) from storage.objects where name like '00000000-0000-0000-0000-0000000000a1/%') = 1,
    'A enxerga a própria foto (necessário para o Storage conseguir apagá-la)';

  update public.profiles set avatar_url = 'http://127.0.0.1:54321/storage/v1/object/public/avatars/00000000-0000-0000-0000-0000000000a1/abc.jpg' where id = auth.uid();
  assert (select avatar_url from public.profiles where id = auth.uid()) is not null, 'A salva a URL da foto';
end $$;

set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
do $$ begin
  assert (select count(*) from storage.objects where bucket_id = 'avatars') = 0, 'B não lista as fotos de A pela API';
  delete from storage.objects where name like '00000000-0000-0000-0000-0000000000a1/%';
  reset role;
  assert (select count(*) from storage.objects where name like '00000000-0000-0000-0000-0000000000a1/%') = 1,
    'B não apaga a foto de A';
end $$;
reset role;

select 'OK: fotos de perfil' as resultado;
