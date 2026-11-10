import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/lib/supabase';
import { newId } from '@/lib/uuid';

const BUCKET = 'avatars';
/** foto de perfil não precisa de mais que isso; fica com ~30–60 KB */
const SIZE = 384;

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** caminho dentro do bucket a partir da URL pública ("<uid>/<uuid>.jpg"), ou null */
function pathFromUrl(url: string | null | undefined) {
  const marker = `/object/public/${BUCKET}/`;
  const i = url?.indexOf(marker) ?? -1;
  return url && i >= 0 ? url.slice(i + marker.length) : null;
}

/** Abre a galeria com recorte quadrado. Devolve a URI escolhida ou null se cancelou. */
export async function pickSquareImage(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  return result.canceled ? null : (result.assets[0]?.uri ?? null);
}

export function useUploadAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, uri, previousUrl }: { userId: string; uri: string; previousUrl?: string | null }) => {
      // reduz e converte para JPEG antes de enviar (economiza dados no 4G)
      const image = await ImageManipulator.manipulate(uri).resize({ width: SIZE }).renderAsync();
      const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
      if (!saved.base64) throw new Error('Não foi possível ler a imagem.');

      // nome aleatório a cada envio: a URL não é adivinhável e o cache nunca mostra a foto antiga
      const path = `${userId}/${newId()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, base64ToBytes(saved.base64), { contentType: 'image/jpeg', upsert: false });
      if (upErr) throw upErr;

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const { error } = await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', userId);
      if (error) throw error;

      // apaga a foto anterior (falha aqui não impede a troca)
      const old = pathFromUrl(previousUrl);
      if (old) await supabase.storage.from(BUCKET).remove([old]);
      return data.publicUrl;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      qc.invalidateQueries({ queryKey: ['members'] });
    },
  });
}

export function useRemoveAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, previousUrl }: { userId: string; previousUrl?: string | null }) => {
      const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId);
      if (error) throw error;
      const old = pathFromUrl(previousUrl);
      if (old) await supabase.storage.from(BUCKET).remove([old]);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      qc.invalidateQueries({ queryKey: ['members'] });
    },
  });
}
