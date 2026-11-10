import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AcceptInvite } from '@/components/AcceptInvite';
import { Logo } from '@/components/Logo';
import { AppText, Button, Card, Screen, TextField, useToast } from '@/components/ui';
import { useSession } from '@/features/auth/session';
import { useCreateOrganization } from '@/features/settings/api';
import { friendlyError } from '@/lib/supabase';
import { useTheme } from '@/theme/theme';

/**
 * Primeiro acesso: criar a organização (o negócio) ou entrar numa que já existe
 * com o código enviado pelo outro membro.
 */
export default function GetStarted() {
  const { colors } = useTheme();
  const { profile, organizations, organizationsLoaded, setActiveOrgId, signOut } = useSession();
  // ?nova=1: veio do Perfil para criar mais uma organização
  const { nova } = useLocalSearchParams<{ nova?: string }>();
  const [mode, setMode] = useState<'create' | 'join' | null>(nova ? 'create' : null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string>();
  const create = useCreateOrganization();
  const toast = useToast();
  const firstName = profile?.name.split(' ')[0] ?? '';

  // já faz parte de uma organização (ex.: abriu esta tela por link)
  if (organizationsLoaded && organizations.length > 0 && mode === null) return <Redirect href="/" />;

  async function onCreate() {
    if (!name.trim()) return setError('Dê um nome para a organização.');
    setError(undefined);
    try {
      const orgId = await create.mutateAsync(name.trim());
      setActiveOrgId(orgId);
      toast({ message: 'Organização criada!' });
      router.replace('/');
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  return (
    <Screen background={colors.surface}>
      <View style={styles.wrap}>
        <View style={styles.header}>
          <Logo size="lg" />
          <AppText variant="heading" align="center">
            {firstName ? `Olá, ${firstName}!` : 'Bem-vindo!'}
          </AppText>
          <AppText color={colors.textMuted} align="center">
            No Rodata, as viagens ficam dentro de uma organização — o seu negócio de frete. Quem faz parte dela
            (fretista, analista, contador…) lança e vê tudo junto.
          </AppText>
        </View>

        <Card accent={mode === 'create'}>
          <View style={styles.optionHead}>
            <Ionicons name="business-outline" size={28} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <AppText variant="title">Criar organização</AppText>
              <AppText variant="small" color={colors.textMuted}>
                Primeira vez por aqui? Comece criando o seu negócio.
              </AppText>
            </View>
          </View>
          {mode === 'create' ? (
            <>
              <TextField
                label="Nome da organização"
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  setError(undefined);
                }}
                placeholder={firstName ? `Ex.: Transportes ${firstName}` : 'Ex.: Transportes Silva'}
                autoCapitalize="words"
                error={error}
                onSubmitEditing={onCreate}
                autoFocus
              />
              <Button title="Criar" icon="checkmark-circle" onPress={onCreate} loading={create.isPending} />
            </>
          ) : (
            <Button title="Criar organização" onPress={() => setMode('create')} />
          )}
        </Card>

        <Card accent={mode === 'join'}>
          <View style={styles.optionHead}>
            <Ionicons name="people-outline" size={28} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <AppText variant="title">Tenho um código de convite</AppText>
              <AppText variant="small" color={colors.textMuted}>
                Alguém já criou a organização e te mandou um código de 6 letras.
              </AppText>
            </View>
          </View>
          {mode === 'join' ? (
            <AcceptInvite onJoined={() => router.replace('/')} />
          ) : (
            <Button title="Usar código" variant="secondary" onPress={() => setMode('join')} />
          )}
        </Card>

        {organizations.length > 0 ? (
          <Button title="Voltar" variant="ghost" icon="arrow-back" onPress={() => router.replace('/')} />
        ) : (
          <Button title="Sair da conta" variant="ghost" icon="log-out-outline" onPress={signOut} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 560, alignSelf: 'center', gap: 18, paddingTop: 24 },
  header: { alignItems: 'center', gap: 12 },
  optionHead: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
});
