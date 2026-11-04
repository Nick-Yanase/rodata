import { onlineManager } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { tripTitle } from '@/components/TripCard';
import { AppText, Button, Card, confirm, DateField, EmptyState, MoneyField, Screen, TextField, useToast } from '@/components/ui';
import { toISODate } from '@/domain/dates';
import { COST_CATEGORIES, type CostCategory } from '@/domain/metrics';
import { formatBRL, sumCents } from '@/domain/money';
import { useActiveDriver } from '@/features/auth/session';
import { toRow, useDeleteTrip, useSaveTrip, useTrip } from '@/features/trips/api';
import type { TripRow } from '@/lib/database.types';
import { goBack } from '@/lib/navigation';
import { newId } from '@/lib/uuid';
import { colors } from '@/theme/tokens';

type Form = {
  title: string;
  origin: string;
  destination: string;
  trip_date: string;
  freight_cents: number;
  km: string;
} & Record<`${CostCategory}_cents`, number>;

const empty = (): Form => ({
  title: '',
  origin: '',
  destination: '',
  trip_date: toISODate(new Date()),
  freight_cents: 0,
  km: '',
  fuel_cents: 0,
  toll_cents: 0,
  food_cents: 0,
  maintenance_cents: 0,
  other_cents: 0,
});

function fromRow(t: TripRow, keepDate = true): Form {
  return {
    title: t.title,
    origin: t.origin,
    destination: t.destination,
    trip_date: keepDate ? t.trip_date : toISODate(new Date()),
    freight_cents: t.freight_cents,
    km: t.km ? String(t.km) : '',
    fuel_cents: t.fuel_cents,
    toll_cents: t.toll_cents,
    food_cents: t.food_cents,
    maintenance_cents: t.maintenance_cents,
    other_cents: t.other_cents,
  };
}

/** Criar (id = "nova"), ver/editar e repetir viagem (RF-10, RF-13, RF-16). */
export default function TripScreen() {
  const { id, copiar } = useLocalSearchParams<{ id: string; copiar?: string }>();
  const isNew = id === 'nova';
  const existing = useTrip(isNew ? undefined : id);
  const source = useTrip(isNew ? copiar : undefined);

  const loading = isNew ? Boolean(copiar) && source.isLoading : existing.isLoading;
  if ((!isNew && !existing.data) || loading) {
    return (
      <Screen edges={[]}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 48 }} />
        ) : (
          <EmptyState icon="alert-circle-outline" title="Viagem não encontrada" message="Ela pode ter sido excluída." />
        )}
      </Screen>
    );
  }

  const initial = !isNew && existing.data ? fromRow(existing.data) : source.data ? fromRow(source.data, false) : empty();
  return <TripForm key={`${id}-${copiar ?? ''}`} id={id} isNew={isNew} copied={Boolean(copiar)} existing={existing.data ?? undefined} initial={initial} />;
}

function TripForm({
  id,
  isNew,
  copied,
  existing,
  initial,
}: {
  id: string;
  isNew: boolean;
  copied: boolean;
  existing?: TripRow;
  initial: Form;
}) {
  const { driverId, readOnly } = useActiveDriver();
  const save = useSaveTrip();
  const del = useDeleteTrip();
  const toast = useToast();

  const [form, setForm] = useState<Form>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const cost = sumCents(form.fuel_cents, form.toll_cents, form.food_cents, form.maintenance_cents, form.other_cents);
  const net = form.freight_cents - cost;
  const canEdit = !readOnly;

  function onSave() {
    const e: typeof errors = {};
    if (form.freight_cents <= 0) e.freight_cents = 'Digite o valor do frete.';
    if (!form.trip_date) e.trip_date = 'Escolha a data da viagem.';
    const km = form.km ? Number.parseInt(form.km.replace(/\D/g, ''), 10) : null;
    setErrors(e);
    if (Object.keys(e).length || !driverId) return;

    const row = toRow(
      {
        id: isNew ? newId() : id,
        driver_id: driverId,
        title: form.title.trim(),
        origin: form.origin.trim(),
        destination: form.destination.trim(),
        trip_date: form.trip_date,
        freight_cents: form.freight_cents,
        fuel_cents: form.fuel_cents,
        toll_cents: form.toll_cents,
        food_cents: form.food_cents,
        maintenance_cents: form.maintenance_cents,
        other_cents: form.other_cents,
        km,
      },
      existing,
    );
    // Não espera a internet: a viagem aparece na hora e é enviada em segundo plano.
    save.mutate(row, {
      onError: () => toast({ tone: 'error', message: 'Não conseguimos salvar a viagem. Tente de novo.' }),
    });
    toast({
      message: onlineManager.isOnline() ? 'Viagem salva!' : 'Viagem salva no celular. Enviamos quando tiver internet.',
    });
    goBack('/viagens');
  }

  async function onDelete() {
    const row = existing;
    if (!row) return;
    const ok = await confirm('Excluir viagem?', `“${tripTitle(row)}” será apagada.`, 'Excluir');
    if (!ok) return;
    del.mutate(row.id);
    goBack('/viagens');
    toast({
      message: 'Viagem excluída.',
      actionLabel: 'Desfazer',
      onAction: () => save.mutate(row),
    });
  }

  const title = isNew ? (copied ? 'Repetir viagem' : 'Nova viagem') : canEdit ? 'Editar viagem' : 'Viagem';

  return (
    <Screen
      edges={['bottom']}
      footer={canEdit ? <Button title="Salvar viagem" icon="checkmark-circle" onPress={onSave} /> : undefined}>
      <Stack.Screen options={{ title }} />

      <Card>
        <AppText variant="title">Dados principais</AppText>
        <TextField
          label="Para onde foi?"
          value={form.destination}
          onChangeText={(t) => set('destination', t)}
          placeholder="Ex.: Presidente Prudente - SP"
          editable={canEdit}
          optional
          autoCapitalize="words"
        />
        <MoneyField
          label="Valor do frete"
          value={form.freight_cents}
          onChange={(v) => set('freight_cents', v)}
          error={errors.freight_cents}
          hint="Quanto o cliente pagou pela viagem"
          editable={canEdit}
        />
        <DateField label="Data da viagem" value={form.trip_date} onChange={(v) => set('trip_date', v)} error={errors.trip_date} editable={canEdit} />
        <TextField
          label="De onde saiu?"
          value={form.origin}
          onChangeText={(t) => set('origin', t)}
          placeholder="Ex.: Bauru - SP"
          editable={canEdit}
          optional
          autoCapitalize="words"
        />
        <TextField
          label="Nome da viagem"
          value={form.title}
          onChangeText={(t) => set('title', t)}
          placeholder="Ex.: Carga de soja – cliente João"
          editable={canEdit}
          optional
        />
      </Card>

      <Card>
        <AppText variant="title">Gastos da viagem</AppText>
        <AppText variant="small" color={colors.textMuted}>
          Preencha só o que teve. O que ficar vazio conta como zero.
        </AppText>
        {COST_CATEGORIES.map((c) => (
          <MoneyField
            key={c.id}
            label={c.label}
            value={form[`${c.id}_cents`]}
            onChange={(v) => set(`${c.id}_cents`, v)}
            optional
            editable={canEdit}
          />
        ))}
        <TextField
          label="Km rodados"
          value={form.km}
          onChangeText={(t) => set('km', t.replace(/\D/g, '').slice(0, 7))}
          keyboardType="number-pad"
          inputMode="numeric"
          placeholder="Ex.: 540"
          editable={canEdit}
          optional
        />
      </Card>

      {/* Resultado da viagem ao vivo */}
      <Card accent>
        <Row label="Frete" value={formatBRL(form.freight_cents)} />
        <Row label="Gastos" value={`− ${formatBRL(cost)}`} />
        <View style={styles.divider} />
        <Row
          label="Receita faturada"
          value={formatBRL(net)}
          strong
          color={net < 0 ? colors.negative : colors.positive}
        />
        {net < 0 ? (
          <AppText variant="small" color={colors.negative}>
            Os gastos passaram do valor do frete.
          </AppText>
        ) : null}
      </Card>

      {!isNew && canEdit && existing ? (
        <View style={styles.actions}>
          <Button
            title="Repetir esta viagem"
            variant="secondary"
            icon="copy-outline"
            onPress={() => router.replace({ pathname: '/viagem/[id]', params: { id: 'nova', copiar: existing.id } })}
            accessibilityHint="Cria uma nova viagem com os mesmos dados e a data de hoje"
          />
          <Button title="Excluir viagem" variant="danger" icon="trash-outline" onPress={onDelete} />
        </View>
      ) : null}
    </Screen>
  );
}

function Row({ label, value, strong, color }: { label: string; value: string; strong?: boolean; color?: string }) {
  return (
    <View style={styles.row}>
      <AppText variant={strong ? 'label' : 'body'}>{label}</AppText>
      <AppText variant={strong ? 'title' : 'body'} weight={strong ? '700' : '600'} color={color}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  divider: { height: 1, backgroundColor: colors.border },
  actions: { gap: 12 },
});
