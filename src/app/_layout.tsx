import '@/features/trips/api'; // registra as mutações offline antes de restaurar o cache
import '@/features/notes/api';

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ConfigMissing } from '@/components/ConfigMissing';
import { ToastProvider } from '@/components/ui';
import { SessionProvider, useSession } from '@/features/auth/session';
import { persister, PERSIST_MAX_AGE, queryClient } from '@/lib/query';
import { isSupabaseConfigured } from '@/lib/supabase';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.background, primary: colors.primaryStrong, text: colors.text },
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider value={theme}>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister, maxAge: PERSIST_MAX_AGE, buster: 'v1' }}
          // reenvia o que ficou guardado sem internet na última vez que o app foi usado
          onSuccess={() => queryClient.resumePausedMutations()}>
          <SessionProvider>
            <ToastProvider>
              <StatusBar style="dark" />
              <RootNavigator />
            </ToastProvider>
          </SessionProvider>
        </PersistQueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { loading } = useSession();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync().catch(() => {});
  }, [loading]);

  if (!isSupabaseConfigured) return <ConfigMissing />;
  if (loading) return null;

  // Os layouts (app) e (auth) redirecionam conforme a sessão.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(app)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="nova-senha" />
    </Stack>
  );
}
