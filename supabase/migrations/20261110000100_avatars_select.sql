-- O Storage só apaga (e sobrescreve) objetos que quem pede também consegue
-- selecionar. Sem esta regra, remover a foto deixava o arquivo órfão no bucket.
-- Leitura via API restrita à própria pasta; a exibição continua pela URL pública.
create policy avatars_select_own on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
