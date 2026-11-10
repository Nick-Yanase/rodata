import { Redirect, Stack } from 'expo-router';

import { useSession } from '@/features/auth/session';
import { useTheme } from '@/theme/theme';


export default function AppLayout() {
  const { colors } = useTheme();
  const { session } = useSession();
  if (!session) return <Redirect href="/entrar" />;
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.primaryStrong,
        headerTitleStyle: { fontSize: 20, fontWeight: '700', color: colors.text },
        headerStyle: { backgroundColor: colors.surface },
        headerBackButtonDisplayMode: 'minimal',
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="comecar" options={{ headerShown: false }} />
      <Stack.Screen name="viagem/[id]" options={{ title: 'Viagem' }} />
      <Stack.Screen name="anotacao/[id]" options={{ title: 'Anotação' }} />
    </Stack>
  );
}
