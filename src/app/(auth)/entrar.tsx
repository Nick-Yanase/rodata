import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Logo } from '@/components/Logo';
import { AppText, Button, Screen, TextField } from '@/components/ui';
import { friendlyError, supabase } from '@/lib/supabase';
import { useTheme } from '@/theme/theme';

export default function SignIn() {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email.includes('@')) return setError('Digite seu e-mail.');
    if (!password) return setError('Digite sua senha.');
    setError(undefined);
    setLoading(true);
    const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (e) setError(friendlyError(e));
  }

  return (
    <Screen background={colors.surface}>
      <View style={styles.wrap}>
        <View style={styles.header}>
          <Logo size="lg" />
          <AppText variant="heading" align="center">
            Bem-vindo de volta!
          </AppText>
          <AppText color={colors.textMuted} align="center">
            Entre com seu e-mail e senha para ver suas viagens.
          </AppText>
        </View>

        <TextField
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          inputMode="email"
          placeholder="seuemail@exemplo.com"
          textContentType="emailAddress"
        />
        <TextField
          label="Senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoComplete="current-password"
          textContentType="password"
          onSubmitEditing={submit}
          right={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Esconder senha' : 'Mostrar senha'}
              onPress={() => setShowPassword((v) => !v)}
              style={styles.eye}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={24} color={colors.textMuted} />
            </Pressable>
          }
        />
        <Link href="/recuperar-senha" style={styles.link}>
          <AppText color={colors.primaryStrong} weight="600">
            Esqueceu sua senha?
          </AppText>
        </Link>

        {error ? (
          <AppText color={colors.negative} weight="600" accessibilityLiveRegion="polite">
            {error}
          </AppText>
        ) : null}

        <Button title="Entrar" onPress={submit} loading={loading} />

        <View style={styles.footer}>
          <AppText color={colors.textMuted}>Ainda não tem conta?</AppText>
          <Link href="/cadastro" style={styles.link}>
            <AppText color={colors.primaryStrong} weight="700">
              Criar conta agora
            </AppText>
          </Link>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 480, alignSelf: 'center', gap: 18, paddingTop: 32 },
  header: { alignItems: 'center', gap: 12, marginBottom: 8 },
  eye: { padding: 12 },
  link: { paddingVertical: 10 },
  footer: { alignItems: 'center', marginTop: 8 },
});
