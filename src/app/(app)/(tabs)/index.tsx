import { Ionicons } from '@expo/vector-icons';
import { addMonths, getMonth, startOfMonth } from 'date-fns';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { CostBreakdown } from '@/components/CostBreakdown';
import { ForecastCard } from '@/components/ForecastCard';
import { KpiCard } from '@/components/KpiCard';
import { Logo } from '@/components/Logo';
import { MeiCard } from '@/components/MeiCard';
import { OrgSwitcher } from '@/components/OrgSwitcher';
import { SyncStatus } from '@/components/SyncStatus';
import { TimelineChart } from '@/components/TimelineChart';
import { AppText, Button, Card, Chip, Screen, Segmented } from '@/components/ui';
import {
  defaultGrain,
  formatDateBR,
  isGrainAllowed,
  PERIOD_PRESETS,
  resolvePreset,
  toISODate,
  type Grain,
  type PeriodPreset,
} from '@/domain/dates';
import { forecastMonthly, projectYearEnd } from '@/domain/forecast';
import { computeMeiStatus, monthLimitReached, REGIMES, type Regime } from '@/domain/mei';
import { formatPercent, margin, variation } from '@/domain/metrics';
import { formatBRL } from '@/domain/money';
import { useSession } from '@/features/auth/session';
import { useMonthlyHistory, useSummary, useTimeline } from '@/features/dashboard/api';
import { useOrgSettings } from '@/features/settings/api';
import { colors } from '@/theme/tokens';

const GRAINS: { id: Grain; label: string }[] = [
  { id: 'day', label: 'Dia' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mês' },
];

const SHORT_REGIME: Record<Regime, string> = { mei_tac: 'MEI', mei: 'MEI', me: 'ME', other: 'negócio' };

export default function Dashboard() {
  const { activeOrg, profile } = useSession();
  const orgId = activeOrg?.id ?? null;
  const [preset, setPreset] = useState<PeriodPreset>('this_month');
  const [compare, setCompare] = useState(true);
  const { current, previous } = useMemo(() => resolvePreset(preset), [preset]);
  const [grainChoice, setGrainChoice] = useState<Grain | null>(null);
  const grain = grainChoice && isGrainAllowed(current, grainChoice) ? grainChoice : defaultGrain(current);

  const summary = useSummary(orgId, current, previous);
  // não desenha o futuro como "zero" no gráfico
  const todayISO = toISODate(new Date());
  const timelinePeriod = useMemo(
    () => ({ start: current.start, end: current.end > todayISO && current.start <= todayISO ? todayISO : current.end }),
    [current, todayISO],
  );
  const timeline = useTimeline(orgId, timelinePeriod, grain);
  const monthly = useMonthlyHistory(orgId);
  const settings = useOrgSettings(orgId);

  const firstName = (profile?.name ?? '').split(' ')[0];

  const cur = summary.data?.current;
  const prev = summary.data?.previous;
  const presetLabel = PERIOD_PRESETS.find((p) => p.id === preset)!.label.toLowerCase();

  // ----- MEI + previsão -----
  const regime = settings.data?.regime ?? 'mei_tac';
  const today = new Date();
  const monthsLeft = 12 - getMonth(today);
  const meiStatus = monthly.data
    ? computeMeiStatus({
        regime,
        customLimit: settings.data?.annual_limit_cents,
        cnpjOpenedAt: settings.data?.cnpj_opened_at,
        usedThisYear: monthly.data.revenueThisYear,
        today,
      })
    : null;

  const completed = monthly.data?.completed ?? [];
  const horizon = Math.max(3, monthsLeft);
  const revenueForecast = forecastMonthly(completed.map((m) => m.revenue), horizon);
  const netForecast = forecastMonthly(completed.map((m) => m.revenue - m.cost), horizon);
  const forecastMonths = [0, 1, 2].map((i) => toISODate(addMonths(startOfMonth(today), i)));

  let projection = null;
  let reachMonth: string | null = null;
  if (revenueForecast && monthly.data && meiStatus) {
    projection = projectYearEnd(monthly.data.revenueThisYear, monthly.data.current.revenue, revenueForecast.points, monthsLeft);
    if (meiStatus.ratio <= 1) {
      // acumulado do ano: realizado até o mês passado + mês corrente projetado + meses seguintes
      const before = monthly.data.revenueThisYear - monthly.data.current.revenue;
      const series = [
        { month: toISODate(startOfMonth(today)), revenue: before + Math.max(monthly.data.current.revenue, revenueForecast.points[0].value) },
        ...revenueForecast.points.slice(1, monthsLeft).map((p, i) => ({
          month: toISODate(addMonths(startOfMonth(today), i + 1)),
          revenue: p.value,
        })),
      ];
      reachMonth = monthLimitReached(meiStatus.limit, series);
    }
  }

  const refreshing = summary.isRefetching || timeline.isRefetching;
  const onRefresh = () => {
    summary.refetch();
    timeline.refetch();
    monthly.refetch();
    settings.refetch();
  };

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <Header initial={firstName[0]} />
      <SyncStatus />
      <OrgSwitcher />

      {/* Resumo em linguagem simples (RF-50) */}
      <View style={styles.hello}>
        <AppText variant="title">{firstName ? `Olá, ${firstName}!` : 'Olá!'}</AppText>
        {activeOrg ? (
          <AppText variant="small" color={colors.textMuted}>
            {activeOrg.name}
          </AppText>
        ) : null}
        {cur ? (
          <AppText color={colors.textMuted}>
            {cur.trips === 0
              ? `Nenhuma viagem lançada (${presetLabel}).`
              : `${capitalize(presetLabel)}: ${cur.trips} ${cur.trips === 1 ? 'viagem' : 'viagens'}, sobraram `}
            {cur.trips > 0 ? (
              <AppText weight="700" color={cur.net < 0 ? colors.negative : colors.positive}>
                {formatBRL(cur.net)}
              </AppText>
            ) : null}
            {cur.trips > 0 && prev && compare ? diffSentence(cur.net, prev.net) : cur.trips > 0 ? '.' : ''}
          </AppText>
        ) : null}
      </View>

      <Button title="Nova viagem" icon="add-circle" onPress={() => router.push('/viagem/nova')} />

      {/* Período analisado × comparado (RF-40) */}
      <Card>
        <AppText variant="label">Período analisado</AppText>
        <View style={styles.chips}>
          {PERIOD_PRESETS.map((p) => (
            <Chip key={p.id} label={p.label} selected={p.id === preset} onPress={() => setPreset(p.id)} />
          ))}
        </View>
        <AppText variant="small" color={colors.textMuted}>
          {formatDateBR(current.start)} a {formatDateBR(current.end)}
        </AppText>
        <View style={styles.compareRow}>
          <View style={{ flex: 1 }}>
            <AppText variant="label">Comparar com período anterior</AppText>
            {compare ? (
              <AppText variant="small" color={colors.textMuted}>
                {formatDateBR(previous.start)} a {formatDateBR(previous.end)}
              </AppText>
            ) : null}
          </View>
          <Switch
            value={compare}
            onValueChange={setCompare}
            accessibilityLabel="Comparar com período anterior"
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor="#FFFFFF"
          />
        </View>
      </Card>

      {summary.isError && !cur ? (
        <Card>
          <AppText color={colors.negative}>Não foi possível carregar os números. Puxe a tela para baixo para tentar de novo.</AppText>
        </Card>
      ) : null}

      {cur && prev ? (
        <>
          <View style={styles.kpis}>
            <KpiCard
              title="Receita total"
              subtitle="Soma dos fretes"
              icon="cash-outline"
              value={cur.revenue}
              variation={variation(cur.revenue, prev.revenue)}
              showVariation={compare}
            />
            <KpiCard
              title="Receita faturada"
              subtitle="Frete − custos"
              icon="trending-up-outline"
              value={cur.net}
              variation={variation(cur.net, prev.net)}
              showVariation={compare}
            />
          </View>
          <AppText variant="small" color={colors.textMuted} align="center">
            Margem: {formatPercent(margin(cur))} · {cur.trips} {cur.trips === 1 ? 'viagem' : 'viagens'}
            {cur.trips > 0 ? ` · frete médio ${formatBRL(Math.round(cur.revenue / cur.trips))}` : ''}
          </AppText>
          <CostBreakdown totals={cur} variation={variation(cur.cost, prev.cost)} showVariation={compare} />
        </>
      ) : null}

      <Card>
        <View style={styles.cardHead}>
          <Ionicons name="stats-chart-outline" size={22} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <AppText variant="label">Linha do tempo</AppText>
            <AppText variant="caption" color={colors.textMuted}>
              Fretes e custos no período selecionado
            </AppText>
          </View>
        </View>
        <Segmented
          accessibilityLabel="Agrupar por"
          options={GRAINS.map((g) => ({ ...g, disabled: !isGrainAllowed(current, g.id) }))}
          value={grain}
          onChange={setGrainChoice}
        />
        {timeline.data ? <TimelineChart points={timeline.data} grain={grain} /> : null}
      </Card>

      {meiStatus ? (
        <MeiCard
          status={meiStatus}
          regimeLabel={SHORT_REGIME[regime]}
          projection={projection}
          reachMonth={reachMonth}
          configured={Boolean(settings.data?.cnpj_opened_at) || settings.data?.regime !== 'mei_tac'}
        />
      ) : null}

      {monthly.data ? (
        <ForecastCard
          months={forecastMonths}
          revenue={revenueForecast ? { ...revenueForecast, points: revenueForecast.points.slice(0, 3) } : null}
          net={netForecast ? { ...netForecast, points: netForecast.points.slice(0, 3) } : null}
          historyMonths={completed.length}
        />
      ) : null}

      {settings.isFetched && settings.data?.regime === 'mei_tac' && !settings.data?.cnpj_opened_at ? (
        <AppText variant="small" color={colors.textMuted} align="center">
          Considerando {REGIMES[0].label}. Ajuste em Perfil se não for o seu caso.
        </AppText>
      ) : null}
    </Screen>
  );
}

function Header({ initial }: { initial?: string }) {
  return (
    <View style={styles.header}>
      <Logo />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Abrir perfil"
        onPress={() => router.push('/perfil')}
        style={styles.avatar}>
        <AppText variant="title" color="#FFFFFF">
          {(initial ?? '?').toUpperCase()}
        </AppText>
      </Pressable>
    </View>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function diffSentence(net: number, prevNet: number) {
  const diff = net - prevNet;
  if (diff === 0) return ', igual ao período anterior.';
  return `, ${formatBRL(Math.abs(diff))} ${diff > 0 ? 'a mais' : 'a menos'} que no período anterior.`;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hello: { gap: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  compareRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cardHead: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
});
