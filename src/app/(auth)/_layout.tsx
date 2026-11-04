import { Redirect, Stack } from 'expo-router';

import { useSession } from '@/features/auth/session';

export default function AuthLayout() {
  const { session } = useSession();
  if (session) return <Redirect href="/" />;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="entrar" />
      <Stack.Screen name="cadastro" />
      <Stack.Screen name="recuperar-senha" />
    </Stack>
  );
}
