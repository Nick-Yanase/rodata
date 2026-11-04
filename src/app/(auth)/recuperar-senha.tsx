import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Screen, TextField } from '@/components/ui';
import { friendlyError, supabase } from '@/lib/supabase';
import { colors } from '@/theme/tokens';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email.includes('@')) return setError('Digite o e-mail da sua conta.');
    setLoading(true);
    const { error: e } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: Linking.createURL('/nova-senha'),
    });
    setLoading(false);
    if (e) return setError(friendlyError(e));
    setSent(true);
  }

  return (
    <Screen background={colors.surface}>
      <View style={styles.wrap}>
        <AppText variant="heading">Esqueceu a senha?</AppText>
        {sent ? (
          <>
            <AppText>
              Pronto! Se existir uma conta com <AppText weight="700">{email.trim()}</AppText>, você vai receber um link
              para criar uma senha nova. Confira também a caixa de spam.
            </AppText>
            <Button title="Voltar para o login" onPress={() => router.replace('/entrar')} />
          </>
        ) : (
          <>
            <AppText color={colors.textMuted}>Digite seu e-mail e enviaremos um link para criar uma senha nova.</AppText>
            <TextField
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              inputMode="email"
              autoComplete="email"
              error={error}
              onSubmitEditing={submit}
            />
            <Button title="Enviar link" onPress={submit} loading={loading} />
            <Button title="Voltar" variant="ghost" onPress={() => router.back()} />
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 480, alignSelf: 'center', gap: 18, paddingTop: 32 },
});
