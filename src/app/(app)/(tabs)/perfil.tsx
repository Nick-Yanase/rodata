import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { AcceptInvite } from '@/components/AcceptInvite';
import { Avatar } from '@/components/Avatar';
import { OrgCarousel } from '@/components/OrgCarousel';
import { AppText, Button, Card, CityField, confirm, MonthYearField, Screen, TextField, useToast } from '@/components/ui';
import { limitForYear, MEI_ANNUAL_LIMIT } from '@/domain/mei';
import { formatBRL } from '@/domain/money';
import { useSession, type MyOrganization } from '@/features/auth/session';
import {
  useCreateInvite,
  useMembers,
  useOrgSettings,
  usePendingInvite,
  useRemoveMember,
  useRenameOrganization,
  useRevokeInvite,
  useSaveOrgSettings,
  useUpdateProfile,
} from '@/features/settings/api';
import { pickSquareImage, useRemoveAvatar, useUploadAvatar } from '@/features/settings/avatar';
import type { OrganizationSettingsRow } from '@/lib/database.types';
import { friendlyError } from '@/lib/supabase';
import { colors, radius } from '@/theme/tokens';

export default function Profile() {
  const { session, signOut, activeOrg } = useSession();
  return (
    <Screen>
      <AppText variant="heading">Perfil</AppText>
      <PersonalCard />
      <OtherOrganizationsCard />
      {activeOrg ? (
        <>
          <OrganizationCard key={`org-${activeOrg.id}`} org={activeOrg} />
          <MembersCard org={activeOrg} />
          <BusinessCard orgId={activeOrg.id} />
        </>
      ) : null}
      <Card>
        <AppText variant="small" color={colors.textMuted}>
          Conectado como {session?.user.email}
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

// ---------------------------------------------------------------------------

function PersonalCard() {
  const { profile } = useSession();
  // remonta quando o perfil salvo muda, para os campos começarem com os valores atuais
  return (
    <PersonalForm
      key={`${profile?.name ?? ''}|${profile?.home_city ?? ''}`}
      savedName={profile?.name ?? ''}
      savedCity={profile?.home_city ?? ''}
    />
  );
}

function PersonalForm({ savedName, savedCity }: { savedName: string; savedCity: string }) {
  const { userId } = useSession();
  const [name, setName] = useState(savedName);
  const [city, setCity] = useState(savedCity);
  const update = useUpdateProfile();
  const toast = useToast();
  const changed = (name.trim() && name.trim() !== savedName) || city.trim() !== savedCity;
  return (
    <Card>
      <AppText variant="title">Seus dados</AppText>
      <PhotoPicker />
      <TextField label="Seu nome" value={name} onChangeText={setName} autoComplete="name" />
      <CityField
        label="Sua cidade base"
        value={city}
        onChange={setCity}
        optional
        hint="De onde você costuma sair. Já vem preenchida em toda viagem nova."
      />
      {changed ? (
        <Button
          title="Salvar"
          size="md"
          loading={update.isPending}
          onPress={() =>
            update.mutate(
              { id: userId!, name: name.trim() || savedName, home_city: city.trim() },
              {
                onSuccess: () => toast({ message: 'Dados salvos!' }),
                onError: (e) => toast({ tone: 'error', message: friendlyError(e) }),
              },
            )
          }
        />
      ) : null}
    </Card>
  );
}

/** Foto de perfil: escolher da galeria (recorte quadrado) ou remover. */
function PhotoPicker() {
  const { userId, profile } = useSession();
  const upload = useUploadAvatar();
  const remove = useRemoveAvatar();
  const toast = useToast();
  const url = profile?.avatar_url ?? null;

  async function choose() {
    const uri = await pickSquareImage();
    if (!uri || !userId) return;
    upload.mutate(
      { userId, uri, previousUrl: url },
      {
        onSuccess: () => toast({ message: 'Foto atualizada!' }),
        onError: (e) => toast({ tone: 'error', message: friendlyError(e) }),
      },
    );
  }

  return (
    <View style={styles.photoRow}>
      <Pressable accessibilityRole="button" accessibilityLabel="Trocar foto" onPress={choose}>
        <Avatar name={profile?.name} url={url} size={84} />
      </Pressable>
      <View style={{ flex: 1, gap: 8 }}>
        <Button
          title={url ? 'Trocar foto' : 'Adicionar foto'}
          variant="secondary"
          size="md"
          icon="image-outline"
          loading={upload.isPending}
          onPress={choose}
        />
        {url ? (
          <Button
            title="Remover foto"
            variant="ghost"
            size="md"
            loading={remove.isPending}
            onPress={() => userId && remove.mutate({ userId, previousUrl: url })}
          />
        ) : null}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------

function OrganizationCard({ org }: { org: MyOrganization }) {
  const [name, setName] = useState(org.name);
  const rename = useRenameOrganization();
  const toast = useToast();
  const changed = name.trim() && name.trim() !== org.name;
  return (
    <Card>
      <View style={styles.head}>
        <Ionicons name="business-outline" size={24} color={colors.primary} />
        <AppText variant="title">Organização</AppText>
      </View>
      <TextField label="Nome da organização" value={name} onChangeText={setName} autoCapitalize="words" autoGrow />
      {changed ? (
        <Button
          title="Salvar nome"
          size="md"
          loading={rename.isPending}
          onPress={() =>
            rename.mutate(
              { id: org.id, name: name.trim() },
              {
                onSuccess: () => toast({ message: 'Nome da organização atualizado!' }),
                onError: (e) => toast({ tone: 'error', message: friendlyError(e) }),
              },
            )
          }
        />
      ) : null}
    </Card>
  );
}

/** Membros e convite por código enviado pelo WhatsApp. */
function MembersCard({ org }: { org: MyOrganization }) {
  const { userId, setActiveOrgId, organizations } = useSession();
  const members = useMembers(org.id);
  const invite = usePendingInvite(org.id);
  const create = useCreateInvite();
  const revokeInvite = useRevokeInvite();
  const remove = useRemoveMember();
  const toast = useToast();
  const isOwner = org.role === 'owner';

  const pending = invite.data;
  const message = pending
    ? `Oi! Entre na organização "${org.name}" no app Rodata usando o código ${pending.code}. Vale por 7 dias.`
    : '';

  async function leave() {
    const ok = await confirm(
      'Sair da organização?',
      `Você deixará de ver as viagens de "${org.name}". Para voltar, vai precisar de um novo convite.`,
      'Sair',
    );
    if (!ok || !userId) return;
    remove.mutate(
      { orgId: org.id, userId },
      {
        onSuccess: () => {
          const next = organizations.find((o) => o.id !== org.id);
          if (next) setActiveOrgId(next.id);
          else router.replace('/comecar');
          toast({ message: 'Você saiu da organização.' });
        },
        onError: (e) => toast({ tone: 'error', message: friendlyError(e) }),
      },
    );
  }

  return (
    <Card>
      <View style={styles.head}>
        <Ionicons name="people-outline" size={24} color={colors.primary} />
        <AppText variant="title">Pessoas</AppText>
      </View>
      <AppText variant="small" color={colors.textMuted}>
        Todos aqui podem lançar viagens, editar e ver os números.
      </AppText>

      {(members.data ?? []).map((m) => (
        <View key={m.userId} style={styles.memberRow}>
          <Avatar name={m.name} url={m.avatarUrl} size={40} />
          <View style={{ flex: 1 }}>
            <AppText variant="label">
              {m.name}
              {m.userId === userId ? ' (você)' : ''}
            </AppText>
            {m.role === 'owner' ? (
              <AppText variant="small" color={colors.textMuted}>
                Criou a organização
              </AppText>
            ) : null}
          </View>
          {isOwner && m.userId !== userId && m.role !== 'owner' ? (
            <Button
              title="Remover"
              variant="danger"
              size="md"
              onPress={async () => {
                if (await confirm('Remover pessoa?', `${m.name} não verá mais os dados de "${org.name}".`, 'Remover'))
                  remove.mutate(
                    { orgId: org.id, userId: m.userId },
                    {
                      onSuccess: () => toast({ message: `${m.name} foi removido(a).` }),
                      onError: (e) => toast({ tone: 'error', message: friendlyError(e) }),
                    },
                  );
              }}
            />
          ) : null}
        </View>
      ))}

      {pending ? (
        <View style={styles.codeBox}>
          <AppText variant="small" color={colors.textMuted}>
            Código de convite (vale {formatDistanceToNowStrict(new Date(pending.expires_at), { locale: ptBR })})
          </AppText>
          <AppText style={styles.code} selectable accessibilityLabel={`Código ${pending.code.split('').join(' ')}`}>
            {pending.code}
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
              await Clipboard.setStringAsync(pending.code);
              toast({ message: 'Código copiado!' });
            }}
          />
          <Button
            title="Cancelar convite"
            variant="ghost"
            size="md"
            onPress={() => revokeInvite.mutate(pending)}
          />
        </View>
      ) : (
        <Button
          title="Convidar pessoa"
          variant="secondary"
          icon="person-add-outline"
          loading={create.isPending}
          accessibilityHint="Gera um código para enviar pelo WhatsApp"
          onPress={() =>
            create.mutate(org.id, { onError: (e) => toast({ tone: 'error', message: friendlyError(e) }) })
          }
        />
      )}

      {!isOwner ? (
        <Button title="Sair desta organização" variant="ghost" size="md" icon="exit-outline" onPress={leave} />
      ) : null}
    </Card>
  );
}

// ---------------------------------------------------------------------------

/** Mês de abertura do MEI: define o teto proporcional no primeiro ano (RF-08). */
function BusinessCard({ orgId }: { orgId: string }) {
  const settings = useOrgSettings(orgId);
  if (settings.isLoading) return null;
  return <BusinessForm key={`${orgId}-${settings.data?.updated_at ?? 'novo'}`} orgId={orgId} saved={settings.data ?? null} />;
}

function BusinessForm({ orgId, saved }: { orgId: string; saved: OrganizationSettingsRow | null }) {
  const save = useSaveOrgSettings();
  const toast = useToast();
  const [openedAt, setOpenedAt] = useState<string>(saved?.mei_opened_at ?? '');
  const year = new Date().getFullYear();
  const preview = openedAt ? limitForYear(year, openedAt) : null;

  return (
    <Card>
      <View style={styles.head}>
        <Ionicons name="speedometer-outline" size={24} color={colors.primary} />
        <AppText variant="title">MEI Caminhoneiro</AppText>
      </View>
      <AppText color={colors.textMuted}>
        Limite de faturamento: <AppText weight="700">{formatBRL(MEI_ANNUAL_LIMIT)} por ano</AppText>.
      </AppText>
      <MonthYearField
        label="Quando você abriu o MEI?"
        value={openedAt}
        onChange={setOpenedAt}
        hint="Mês e ano. No ano em que o MEI é aberto, o limite é menor (proporcional aos meses)."
      />
      {preview?.isProportional ? (
        <AppText variant="small" weight="600" color={colors.warning}>
          Em {year}, seu limite é {formatBRL(preview.limit)} ({preview.activeMonths}{' '}
          {preview.activeMonths === 1 ? 'mês' : 'meses'} de atividade).
        </AppText>
      ) : null}
      <Button
        title="Salvar"
        size="md"
        loading={save.isPending}
        onPress={() =>
          save.mutate(
            { org_id: orgId, mei_opened_at: openedAt || null },
            {
              onSuccess: () => toast({ message: 'Salvo!' }),
              onError: (e) => toast({ tone: 'error', message: friendlyError(e) }),
            },
          )
        }
      />
    </Card>
  );
}

// ---------------------------------------------------------------------------

function OtherOrganizationsCard() {
  const { organizations } = useSession();
  const [joining, setJoining] = useState(false);
  return (
    <Card>
      <AppText variant="title">Suas organizações</AppText>
      <AppText variant="small" color={colors.textMuted}>
        {organizations.length > 1
          ? 'Deslize para trocar de organização.'
          : 'Cuida de mais de um negócio? Você pode participar de várias organizações.'}
      </AppText>
      <OrgCarousel showAddCard />
      {joining ? (
        <AcceptInvite onJoined={() => setJoining(false)} />
      ) : (
        <Button title="Entrar com código de convite" variant="secondary" size="md" icon="enter-outline" onPress={() => setJoining(true)} />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  codeBox: { gap: 12, padding: 16, borderRadius: radius.md, backgroundColor: colors.background },
  code: { fontSize: 36, fontWeight: '800', letterSpacing: 6, textAlign: 'center', color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
