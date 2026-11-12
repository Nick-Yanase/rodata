import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Logo } from '@/components/Logo';
import { AppText, Button, Screen, TextField } from '@/components/ui';
import { friendlyError, supabase } from '@/lib/supabase';
import { useTheme } from '@/theme/theme';

export default function SignUp() {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Digite seu nome.';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = 'Digite um e-mail válido.';
    if (password.length < 8) e.password = 'A senha precisa ter pelo menos 8 caracteres.';
    if (confirm !== password) e.confirm = 'As senhas não são iguais.';
    setErrors(e);
    if (Object.keys(e).length) return;

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { name: name.trim() },
        // o link do e-mail de confirmação volta para onde a pessoa se cadastrou:
        // no site, o próprio endereço (ex.: https://rodata.pages.dev); no app, rodata://
        emailRedirectTo: Linking.createURL('/'),
      },
    });
    setLoading(false);
    if (error) return setErrors({ form: friendlyError(error) });
    // Se o projeto exige confirmação de e-mail, não há sessão ainda.
    if (!data.session) setSent(true);
  }

  if (sent) {
    return (
      <Screen background={colors.surface}>
        <View style={styles.wrap}>
          <Ionicons name="mail-open-outline" size={64} color={colors.primary} style={{ alignSelf: 'center' }} />
          <AppText variant="heading" align="center">
            Confira seu e-mail
          </AppText>
          <AppText align="center">
            Enviamos um link para <AppText weight="700">{email.trim()}</AppText>. Toque nele para ativar sua conta e
            depois volte aqui para entrar.
          </AppText>
          <Button title="Ir para o login" onPress={() => router.replace('/entrar')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen background={colors.surface}>
      <View style={styles.wrap}>
        <View style={styles.header}>
          <Logo size="lg" />
          <AppText variant="heading" align="center">
            Bem-vindo ao Rodata!
          </AppText>
          <AppText color={colors.textMuted} align="center">
            Crie sua conta em menos de um minuto.
          </AppText>
        </View>

        <TextField label="Nome" value={name} onChangeText={setName} autoComplete="name" error={errors.name} placeholder="Seu nome" />
        <TextField
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          inputMode="email"
          error={errors.email}
          placeholder="seuemail@exemplo.com"
        />
        <TextField
          label="Senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          error={errors.password}
          hint="Pelo menos 8 caracteres"
        />
        <TextField
          label="Confirmar senha"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoComplete="new-password"
          error={errors.confirm}
          onSubmitEditing={submit}
        />

        {errors.form ? (
          <AppText color={colors.negative} weight="600">
            {errors.form}
          </AppText>
        ) : null}

        <Button title="Criar conta" onPress={submit} loading={loading} />

        <View style={styles.footer}>
          <AppText color={colors.textMuted}>Já tem uma conta?</AppText>
          <Link href="/entrar" style={{ paddingVertical: 10 }}>
            <AppText color={colors.primaryStrong} weight="700">
              Entrar
            </AppText>
          </Link>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 480, alignSelf: 'center', gap: 16, paddingTop: 24 },
  header: { alignItems: 'center', gap: 12, marginBottom: 8 },
  footer: { alignItems: 'center' },
});
