import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import type { Database } from './database.types';

// O Expo só embute variáveis lidas assim, por extenso (process.env.EXPO_PUBLIC_...).
const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
// O Supabase chama a chave pública de "anon" (formato antigo, eyJ...) ou "publishable" (sb_publishable_...).
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

export const isSupabaseConfigured = Boolean(url && anonKey);

/** Para a tela de configuração pendente dizer o que falta. */
export const supabaseConfigStatus = { hasUrl: Boolean(url), hasKey: Boolean(anonKey) };

export const supabase = createClient<Database>(
  url || 'http://localhost:54321',
  anonKey || 'missing-anon-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // No web, o link de "recuperar senha" volta com o token na URL.
      detectSessionInUrl: Platform.OS === 'web',
    },
  },
);

// No celular, só renova o token com o app aberto (recomendação do Supabase para React Native).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

/** Mensagem de erro em português para mostrar ao usuário (RNF-08). */
export function friendlyError(error: unknown): string {
  const message =
    typeof error === 'object' && error && 'message' in error ? String(error.message) : String(error);
  const map: [RegExp, string][] = [
    [/invalid login credentials/i, 'E-mail ou senha incorretos.'],
    [/email not confirmed/i, 'Confirme seu e-mail pelo link que enviamos antes de entrar.'],
    [/user already registered/i, 'Já existe uma conta com esse e-mail. Tente entrar.'],
    [/password should be at least/i, 'A senha precisa ter pelo menos 8 caracteres.'],
    [/muitas tentativas/i, 'Muitas tentativas de código. Espere uma hora e tente de novo.'],
    [/rate limit|too many/i, 'Muitas tentativas. Espere um minuto e tente de novo.'],
    [/password.*(weak|pwned|leaked)|senha fraca/i, 'Essa senha é fácil de adivinhar. Escolha outra.'],
    [/network|fetch failed|failed to fetch/i, 'Sem conexão com a internet. Tente de novo.'],
    [/código inválido|expirado|já usado/i, 'Código inválido, expirado ou já usado. Peça um novo código.'],
  ];
  for (const [re, text] of map) if (re.test(message)) return text;
  return 'Algo deu errado. Tente de novo em instantes.';
}
