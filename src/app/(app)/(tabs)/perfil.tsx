import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { AcceptInvite } from '@/components/AcceptInvite';
import { AppText, Button, Card, confirm, DateField, MoneyField, Screen, TextField, useToast } from '@/components/ui';
import { DEFAULT_ANNUAL_LIMIT, REGIMES, type Regime } from '@/domain/mei';
import { formatBRL } from '@/domain/money';
import { useSession } from '@/features/auth/session';
import {
  useBusinessSettings,
  useCreateInvite,
  useDriverLinks,
  useRevokeLink,
  useSaveBusinessSettings,
  useUpdateName,
} from '@/features/settings/api';
import type { BusinessSettingsRow } from '@/lib/database.types';
import { friendlyError } from '@/lib/supabase';
import { colors, radius } from '@/theme/tokens';

export default function Profile() {
  const { profile, session, isAnalyst, signOut } = useSession();
  return (
    <Screen>
      <AppText variant="heading">Perfil</AppText>
      <PersonalCard />
      {isAnalyst ? <AnalystLinks /> : <BusinessCard />}
      {!isAnalyst ? <InviteCard /> : null}
      <Card>
        <AppText variant="small" color={colors.textMuted}>
          Conectado como {session?.user.email}
          {profile ? ` · ${profile.role === 'analyst' ? 'Analista' : 'Fretista'}` : ''}
        </AppText>
        <Button
          title="Sair da conta"
          variant="secondary"
          icon="log-out-outline"
          onPress={async () => {
            if (await confirm('Sair da conta?', 'Você vai precisar do e-mail e da senha para entrar de novo.', 'Sair')) signOut();
          }}
        />
      </Card>
    </Screen>
  );
}

function PersonalCard() {
  const { profile } = useSession();
  // remonta quando o nome salvo muda, para o campo começar com o valor atual
  return <PersonalForm key={profile?.name ?? ''} savedName={profile?.name ?? ''} />;
}

function PersonalForm({ savedName }: { savedName: string }) {
  const { userId, profile } = useSession();
  const [name, setName] = useState(savedName);
  const update = useUpdateName();
  const toast = useToast();
  const changed = name.trim() && name.trim() !== profile?.name;
  return (
    <Card>
      <AppText variant="title">Seus dados</AppText>
      <TextField label="Nome" value={name} onChangeText={setName} autoComplete="name" />
      {changed ? (
        <Button
          title="Salvar nome"
          size="md"
          loading={update.isPending}
          onPress={() =>
            update.mutate(
              { id: userId!, name: name.trim() },
              {
                onSuccess: () => toast({ message: 'Nome atualizado!' }),
                onError: (e) => toast({ tone: 'error', message: friendlyError(e) }),
              },
            )
          }
        />
      ) : null}
    </Card>
  );
}

/** Enquadramento do negócio e limite anual (RF-08). */
function BusinessCard() {
  const { userId } = useSession();
  const settings = useBusinessSettings(userId);
  if (settings.isLoading) return null;
  return <BusinessForm key={settings.data?.updated_at ?? 'novo'} saved={settings.data ?? null} />;
}

function BusinessForm({ saved }: { saved: BusinessSettingsRow | null }) {
  const { userId } = useSession();
  const save = useSaveBusinessSettings();
  const toast = useToast();
  const [regime, setRegime] = useState<Regime>(saved?.regime ?? 'mei_tac');
  const [openedAt, setOpenedAt] = useState(saved?.cnpj_opened_at ?? '');
  const [customLimit, setCustomLimit] = useState(saved?.annual_limit_cents ?? 0);

  return (
    <Card>
      <AppText variant="title">Meu negócio</AppText>
      <AppText variant="small" color={colors.textMuted}>
        Usamos isso para calcular quanto falta para o limite do ano.
      </AppText>
      <View style={{ gap: 10 }} accessibilityRole="radiogroup">
        {REGIMES.map((r) => {
          const selected = r.id === regime;
          return (
            <Pressable
              key={r.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => setRegime(r.id)}
              style={[styles.option, selected && styles.optionSelected]}>
              <Ionicons
                name={selected ? 'radio-button-on' : 'radio-button-off'}
                size={24}
                color={selected ? colors.primaryStrong : colors.borderStrong}
              />
              <View style={{ flex: 1 }}>
                <AppText variant="label">{r.label}</AppText>
                <AppText variant="small" color={colors.textMuted}>
                  {r.hint}
                </AppText>
              </View>
            </Pressable>
          );
        })}
      </View>
      <DateField label="Data de abertura do CNPJ" value={openedAt} onChange={setOpenedAt} quickChips={false} />
      <MoneyField
        label="Limite anual personalizado"
        value={customLimit}
        onChange={setCustomLimit}
        optional
        hint={`Deixe vazio para usar o padrão: ${formatBRL(DEFAULT_ANNUAL_LIMIT[regime])}`}
      />
      <Button
        title="Salvar"
        size="md"
        loading={save.isPending}
        onPress={() =>
          save.mutate(
            {
              driver_id: userId!,
              regime,
              cnpj_opened_at: openedAt || null,
              annual_limit_cents: customLimit > 0 ? customLimit : null,
            },
            {
              onSuccess: () => toast({ message: 'Dados do negócio salvos!' }),
              onError: (e) => toast({ tone: 'error', message: friendlyError(e) }),
            },
          )
        }
      />
    </Card>
  );
}

/** Fretista convida o analista por código enviado no WhatsApp (RF-06). */
function InviteCard() {
  const { userId } = useSession();
  const links = useDriverLinks(userId, true);
  const create = useCreateInvite();
  const revoke = useRevokeLink();
  const toast = useToast();

  const active = (links.data ?? []).filter((l) => l.status === 'active');
  const pending = (links.data ?? []).find((l) => l.status === 'pending' && new Date(l.expires_at) > new Date());

  const message = pending
    ? `Oi! Use o código ${pending.invite_code} no app Rodata (Perfil → código de convite) para acompanhar minhas viagens. Vale por 7 dias.`
    : '';

  return (
    <Card>
      <AppText variant="title">Analista</AppText>
      <AppText variant="small" color={colors.textMuted}>
        Quem você convidar poderá ver suas viagens e números, mas não pode alterar nada.
      </AppText>

      {active.map((l) => (
        <View key={l.id} style={styles.linkRow}>
          <Ionicons name="person-circle-outline" size={32} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <AppText variant="label">{l.analyst?.name || 'Analista'}</AppText>
            <AppText variant="small" color={colors.textMuted}>
              Acompanha seus números
            </AppText>
          </View>
          <Button
            title="Remover"
            variant="danger"
            size="md"
            onPress={async () => {
              if (await confirm('Remover acesso?', `${l.analyst?.name || 'O analista'} não verá mais seus dados.`, 'Remover'))
                revoke.mutate(l.id, { onSuccess: () => toast({ message: 'Acesso removido.' }) });
            }}
          />
        </View>
      ))}

      {pending ? (
        <View style={styles.codeBox}>
          <AppText variant="small" color={colors.textMuted}>
            Código de convite (vale {formatDistanceToNowStrict(new Date(pending.expires_at), { locale: ptBR })})
          </AppText>
          <AppText style={styles.code} selectable accessibilityLabel={`Código ${pending.invite_code.split('').join(' ')}`}>
            {pending.invite_code}
          </AppText>
          <Button
            title="Enviar pelo WhatsApp"
            icon="logo-whatsapp"
            onPress={() => Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`)}
          />
          <Button
            title="Copiar código"
            variant="secondary"
            size="md"
            icon="copy-outline"
            onPress={async () => {
              await Clipboard.setStringAsync(pending.invite_code);
              toast({ message: 'Código copiado!' });
            }}
          />
        </View>
      ) : (
        <Button
          title={active.length ? 'Convidar outro analista' : 'Convidar analista'}
          variant="secondary"
          icon="person-add-outline"
          loading={create.isPending}
          onPress={() => create.mutate(undefined, { onError: (e) => toast({ tone: 'error', message: friendlyError(e) }) })}
        />
      )}
    </Card>
  );
}

function AnalystLinks() {
  const { linkedDrivers, activeDriverId, setActiveDriverId } = useSession();
  const revoke = useRevokeLink();
  const toast = useToast();
  return (
    <Card>
      <AppText variant="title">Fretistas que acompanho</AppText>
      {linkedDrivers.length === 0 ? (
        <AppText color={colors.textMuted}>Nenhum ainda. Digite abaixo o código que o fretista enviou.</AppText>
      ) : (
        linkedDrivers.map((d) => (
          <View key={d.id} style={styles.linkRow}>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: d.id === activeDriverId }}
              onPress={() => setActiveDriverId(d.id)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minHeight: 48 }}>
              <Ionicons
                name={d.id === activeDriverId ? 'radio-button-on' : 'radio-button-off'}
                size={24}
                color={d.id === activeDriverId ? colors.primaryStrong : colors.borderStrong}
              />
              <AppText variant="label">{d.name}</AppText>
            </Pressable>
            <Button
              title="Parar"
              variant="danger"
              size="md"
              onPress={async () => {
                if (await confirm('Parar de acompanhar?', `Você deixará de ver os dados de ${d.name}.`, 'Parar'))
                  revoke.mutate(d.linkId, { onSuccess: () => toast({ message: 'Pronto.' }) });
              }}
            />
          </View>
        ))
      )}
      <AcceptInvite />
    </Card>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: 56,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  codeBox: { gap: 12, padding: 16, borderRadius: radius.md, backgroundColor: colors.background, alignItems: 'stretch' },
  code: { fontSize: 36, fontWeight: '800', letterSpacing: 6, textAlign: 'center', color: colors.text },
});
