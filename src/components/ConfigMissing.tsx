import { View } from 'react-native';

import { supabaseConfigStatus } from '@/lib/supabase';
import { radius } from '@/theme/tokens';

import { Logo } from './Logo';
import { AppText, Screen } from './ui';
import { makeStyles, useTheme } from '@/theme/theme';

/** Exibida quando o app foi iniciado sem as variáveis do Supabase. */
export function ConfigMissing() {
  const { colors } = useTheme();
  const styles = useStyles();
  const { hasUrl, hasKey } = supabaseConfigStatus;
  return (
    <Screen background={colors.surface}>
      <View style={styles.wrap}>
        <Logo size="lg" />
        <AppText variant="title">Configuração pendente</AppText>
        <AppText>O app não encontrou os dados de conexão com o Supabase:</AppText>
        <View style={styles.list}>
          <Item ok={hasUrl} name="EXPO_PUBLIC_SUPABASE_URL" />
          <Item ok={hasKey} name="EXPO_PUBLIC_SUPABASE_ANON_KEY (ou EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY)" />
        </View>
        <AppText>Crie o arquivo .env.local na raiz do projeto (junto do package.json):</AppText>
        <AppText style={styles.code} selectable>
          {'EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321\nEXPO_PUBLIC_SUPABASE_ANON_KEY=<chave Publishable>'}
        </AppText>
        <AppText>
          Depois pare o Expo (Ctrl+C) e rode de novo com <AppText weight="700">npx expo start --clear</AppText>. Na
          saída deve aparecer “env: load .env.local”.
        </AppText>
      </View>
    </Screen>
  );
}

function Item({ ok, name }: { ok: boolean; name: string }) {
  const { colors } = useTheme();
  return (
    <AppText color={ok ? colors.positive : colors.negative} weight="600">
      {ok ? '✓ encontrada: ' : '✗ faltando: '}
      {name}
    </AppText>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: { gap: 16, maxWidth: 620, alignSelf: 'center', paddingTop: 48 },
  list: { gap: 6 },
  code: {
    fontFamily: 'monospace',
    fontSize: 15,
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: radius.sm,
  },
}));
