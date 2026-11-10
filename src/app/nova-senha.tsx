import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Screen, TextField, useToast } from '@/components/ui';
import { friendlyError, supabase } from '@/lib/supabase';
import { useTheme } from '@/theme/theme';

/** Aberta pelo link de "recuperar senha" enviado por e-mail. */
export default function NewPassword() {
  const { colors } = useTheme();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function submit() {
    if (password.length < 8) return setError('A senha precisa ter pelo menos 8 caracteres.');
    setLoading(true);
    const { error: e } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (e) return setError(friendlyError(e));
    toast({ message: 'Senha alterada!' });
    router.replace('/');
  }

  return (
    <Screen background={colors.surface}>
      <View style={styles.wrap}>
        <AppText variant="heading">Criar senha nova</AppText>
        <TextField
          label="Nova senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          hint="Pelo menos 8 caracteres"
          error={error}
          onSubmitEditing={submit}
        />
        <Button title="Salvar senha" onPress={submit} loading={loading} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 480, alignSelf: 'center', gap: 18, paddingTop: 32 },
});
