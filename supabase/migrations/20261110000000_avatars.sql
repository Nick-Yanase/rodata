-- Fotos de perfil.
-- Bucket público para leitura (a foto aparece para quem é da mesma organização sem
-- precisar de URL assinada), mas o caminho tem um nome aleatório por envio:
--   avatars/<user_id>/<uuid>.jpg   → não dá para adivinhar a URL de ninguém.
-- Escrita só na própria pasta, até 1 MB, só imagens.

alter table public.profiles
  add column avatar_url text check (avatar_url is null or length(avatar_url) <= 500);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy avatars_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatars_update_own on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatars_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
