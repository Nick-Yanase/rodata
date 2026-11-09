import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { SwipeTabs } from '@/components/SwipeTabs';
import { useSession } from '@/features/auth/session';

import { colors } from '@/theme/tokens';

type IconName = ComponentProps<typeof Ionicons>['name'];

function icon(active: IconName, inactive: IconName) {
  return function TabIcon({ focused, color }: { focused: boolean; color: ColorValue }) {
    return <Ionicons name={focused ? active : inactive} size={26} color={color as string} />;
  };
}

/** Barra inferior com ícone + texto (RNF-04). */
export default function TabsLayout() {
  const { organizationsLoaded, organizations } = useSession();
  // ainda não faz parte de nenhuma organização: criar uma ou entrar com código
  if (organizationsLoaded && organizations.length === 0) return <Redirect href="/comecar" />;
  return (
    <Tabs
      // deslizar o dedo para os lados troca de aba
      screenLayout={({ route, navigation, children }) => (
        <SwipeTabs routeName={route.name} onNavigate={(name) => navigation.navigate(name)}>
          {children}
        </SwipeTabs>
      )}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryStrong,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 14, fontWeight: '600' },
        tabBarStyle: { minHeight: 64, paddingTop: 6, backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarItemStyle: { minHeight: 52 },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Início', tabBarIcon: icon('home', 'home-outline') }} />
      <Tabs.Screen name="viagens" options={{ title: 'Viagens', tabBarIcon: icon('bus', 'bus-outline') }} />
      <Tabs.Screen
        name="anotacoes"
        options={{ title: 'Anotações', tabBarIcon: icon('document-text', 'document-text-outline') }}
      />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarIcon: icon('person-circle', 'person-circle-outline') }} />
    </Tabs>
  );
}
