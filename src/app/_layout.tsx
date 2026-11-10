import '@/features/trips/api'; // registra as mutações offline antes de restaurar o cache
import '@/features/notes/api';

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, type ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ConfigMissing } from '@/components/ConfigMissing';
import { ToastProvider } from '@/components/ui';
import { SessionProvider, useSession } from '@/features/auth/session';
import { persister, PERSIST_MAX_AGE, queryClient } from '@/lib/query';
import { isSupabaseConfigured } from '@/lib/supabase';
import { ThemeProvider, useTheme } from '@/theme/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

/** Tema da navegação (cabeçalhos, fundo entre transições) e barra de status seguem o tema do app. */
function NavigationTheme({ children }: { children: ReactNode }) {
  const { scheme, colors } = useTheme();
  const theme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.background,
        card: colors.surface,
        border: colors.border,
        primary: colors.primaryStrong,
        text: colors.text,
      },
    };
  }, [scheme, colors]);
  return (
    <NavigationThemeProvider value={theme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {children}
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <NavigationTheme>
            <PersistQueryClientProvider
              client={queryClient}
              persistOptions={{ persister, maxAge: PERSIST_MAX_AGE, buster: 'v1' }}
              // reenvia o que ficou guardado sem internet na última vez que o app foi usado
              onSuccess={() => queryClient.resumePausedMutations()}>
              <SessionProvider>
                <ToastProvider>
                  <RootNavigator />
                </ToastProvider>
              </SessionProvider>
            </PersistQueryClientProvider>
          </NavigationTheme>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
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
