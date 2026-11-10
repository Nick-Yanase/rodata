import { Ionicons } from '@expo/vector-icons';
import { addMonths, getMonth, startOfMonth } from 'date-fns';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Switch, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { CostBreakdown } from '@/components/CostBreakdown';
import { ForecastCard } from '@/components/ForecastCard';
import { Fab, FAB_CLEARANCE } from '@/components/Fab';
import { Logo } from '@/components/Logo';
import { MeiCard } from '@/components/MeiCard';
import { MonthPicker } from '@/components/MonthPicker';
import { RevenueCard } from '@/components/RevenueCard';
import { SyncStatus } from '@/components/SyncStatus';
import { MetricSelect } from '@/components/MetricSelect';
import { METRIC_ORDER, TimelineChart, type ChartMetric } from '@/components/TimelineChart';
import { AppText, Card, Chip, Screen, Segmented } from '@/components/ui';
import {
  defaultGrain,
  formatDateBR,
  formatMonthLong,
  isGrainAllowed,
  PERIOD_PRESETS,
  resolveMonth,
  resolvePreset,
  toISODate,
  type ISODate,
  type Grain,
  type PeriodPreset,
} from '@/domain/dates';
import { forecastMonthly, projectYearEnd } from '@/domain/forecast';
import { computeMeiStatus, monthLimitReached } from '@/domain/mei';
import { formatPercent, margin, variation } from '@/domain/metrics';
import { formatBRL } from '@/domain/money';
import { useSession } from '@/features/auth/session';
import { useMonthlyHistory, useSummary, useTimeline } from '@/features/dashboard/api';
import { useOrgSettings } from '@/features/settings/api';
import { makeStyles, useTheme } from '@/theme/theme';

const GRAINS: { id: Grain; label: string }[] = [
  { id: 'day', label: 'Dia' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mês' },
];


export default function Dashboard() {
  const { colors } = useTheme();
  const styles = useStyles();
  const { activeOrg, profile } = useSession();
  const orgId = activeOrg?.id ?? null;
  // período: um atalho (este mês, este ano…) ou um mês escolhido
  const [period, setPeriod] = useState<{ preset: PeriodPreset } | { month: ISODate }>({ preset: 'this_month' });
  const [compare, setCompare] = useState(true);
  const { current, previous } = useMemo(
    () => ('month' in period ? resolveMonth(period.month) : resolvePreset(period.preset)),
    [period],
  );
  const [grainChoice, setGrainChoice] = useState<Grain | null>(null);
  // séries do gráfico: padrão receita total × custos; cada lado escolhe no título
  const [metrics, setMetrics] = useState<[ChartMetric, ChartMetric]>(['revenue', 'cost']);
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
  const presetLabel =
    'month' in period
      ? `em ${formatMonthLong(period.month)}`
      : PERIOD_PRESETS.find((p) => p.id === period.preset)!.label.toLowerCase();

  // ----- MEI + previsão -----
  const today = new Date();
  const monthsLeft = 12 - getMonth(today);
  const meiStatus = monthly.data
    ? computeMeiStatus({
        meiOpenedAt: settings.data?.mei_opened_at,
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
    <Screen
      refreshing={refreshing}
      onRefresh={onRefresh}
      bottomSpace={FAB_CLEARANCE}
      overlay={<Fab label="Nova viagem" onPress={() => router.push('/viagem/nova')} />}>
      <Header name={profile?.name} avatarUrl={profile?.avatar_url} />
      <SyncStatus />
      

      {/* Resumo em linguagem simples (RF-50) */}
      <View style={styles.hello}>
        <View style={styles.helloRow}>
          <AppText variant="title">{firstName ? `Olá, ${firstName}!` : 'Olá!'}</AppText>
          {activeOrg ? (
            <>
              <Ionicons name="ellipse" size={6} color={colors.textMuted} />
              <AppText variant="small" color={colors.textMuted}>
                {activeOrg.name}
              </AppText>
            </>
          ) : null}
        </View>
        {cur ? (
          <AppText color={colors.textMuted}>
            {cur.trips === 0
              ? `Nenhuma viagem lançada ${'month' in period ? presetLabel : `(${presetLabel})`}.`
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

      {/* Período analisado × comparado (RF-40) */}
      <Card>
        <AppText variant="label">Período analisado</AppText>
        <View style={styles.chips}>
          {PERIOD_PRESETS.map((p) => (
            <Chip
              key={p.id}
              label={p.label}
              selected={'preset' in period && p.id === period.preset}
              onPress={() => setPeriod({ preset: p.id })}
            />
          ))}
        </View>
        <MonthPicker value={'month' in period ? period.month : null} onChange={(month) => setPeriod({ month })} />
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
          <RevenueCard
            showVariation={compare}
            rows={[
              {
                title: 'Receita total',
                subtitle: 'Soma dos fretes',
                icon: 'cash-outline',
                value: cur.revenue,
                variation: variation(cur.revenue, prev.revenue),
              },
              {
                title: 'Receita faturada',
                subtitle: 'Frete − custos',
                icon: 'trending-up-outline',
                value: cur.net,
                variation: variation(cur.net, prev.net),
              },
            ]}
          />
          <AppText variant="small" color={colors.textMuted} align="center">
            Margem: {formatPercent(margin(cur))} · {cur.trips} {cur.trips === 1 ? 'viagem' : 'viagens'}
            {cur.trips > 0 ? ` · frete médio ${formatBRL(Math.round(cur.revenue / cur.trips))}` : ''}
          </AppText>
          <CostBreakdown totals={cur} variation={variation(cur.cost, prev.cost)} showVariation={compare} />
        </>
      ) : null}

      <Card>
        <View style={styles.cardHead}>
          <Ionicons name="stats-chart-outline" size={22} color={colors.primary} style={{ marginTop: 10 }} />
          <View style={{ flex: 1 }}>
            {/* "Sua receita total ▾ vs Seus custos ▾": cada métrica é um seletor */}
            <View style={styles.metricsRow}>
              <MetricSelect
                value={metrics[0]}
                options={METRIC_ORDER.filter((m) => m !== metrics[1])}
                onChange={(m) => setMetrics([m, metrics[1]])}
              />
              <AppText variant="label" color={colors.textMuted} weight="400">
                vs
              </AppText>
              <MetricSelect
                value={metrics[1]}
                options={METRIC_ORDER.filter((m) => m !== metrics[0])}
                onChange={(m) => setMetrics([metrics[0], m])}
              />
            </View>
            <AppText variant="caption" color={colors.textMuted}>
              Evolução no período selecionado
            </AppText>
          </View>
        </View>
        <Segmented
          accessibilityLabel="Agrupar por"
          options={GRAINS.map((g) => ({ ...g, disabled: !isGrainAllowed(current, g.id) }))}
          value={grain}
          onChange={setGrainChoice}
        />
        {timeline.data ? <TimelineChart points={timeline.data} grain={grain} metrics={metrics} /> : null}
      </Card>

      {meiStatus ? (
        <MeiCard
          status={meiStatus}
          projection={projection}
          reachMonth={reachMonth}
          openedAtKnown={Boolean(settings.data?.mei_opened_at)}
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

    </Screen>
  );
}

function Header({ name, avatarUrl }: { name?: string; avatarUrl?: string | null }) {
  const styles = useStyles();
  return (
    <View style={styles.header}>
      <Logo />
      <Pressable accessibilityRole="button" accessibilityLabel="Abrir perfil" onPress={() => router.push('/perfil')}>
        <Avatar name={name} url={avatarUrl} size={52} />
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

const useStyles = makeStyles((colors) => ({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 12,
  },
  hello: { gap: 4 },
  // nome + • + organização; quebra linha se o nome da organização for longo
  helloRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  compareRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardHead: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 6 },
}));
