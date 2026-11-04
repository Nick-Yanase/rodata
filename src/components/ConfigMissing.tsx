import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme/tokens';

import { Logo } from './Logo';
import { AppText, Screen } from './ui';

/** Exibida quando o app foi iniciado sem as variáveis do Supabase. */
export function ConfigMissing() {
  return (
    <Screen background={colors.surface}>
      <View style={styles.wrap}>
        <Logo size="lg" />
        <AppText variant="title">Configuração pendente</AppText>
        <AppText>
          Crie o arquivo <AppText weight="700">.env.local</AppText> a partir do{' '}
          <AppText weight="700">.env.example</AppText> com a URL e a chave pública do seu projeto Supabase e reinicie o
          app. Veja o passo a passo no README.
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ wrap: { gap: 16, maxWidth: 520, alignSelf: 'center', paddingTop: 48 } });
