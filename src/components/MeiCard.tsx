import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { formatMonthLong, formatMonthShort } from '@/domain/dates';
import type { ForecastPoint } from '@/domain/forecast';
import { meiMessage, meiMonthMessage, type MeiMonthStatus, type MeiStatus } from '@/domain/mei';
import { formatBRL } from '@/domain/money';
import { radius } from '@/theme/tokens';

import { AppText, Button, Card, Segmented } from './ui';
import { makeStyles, useTheme } from '@/theme/theme';
import type { Palette } from '@/theme/tokens';

// 3 estágios do termômetro: verde (< 70%), amarelo (70–90%), vermelho (≥ 90%)
function levelColor(colors: Palette, level: MeiStatus['level'] | MeiMonthStatus['level']) {
  if (level === 'ok') return colors.positive;
  if (level === 'attention') return colors.warning;
  return colors.negative;
}

type MeiView = 'year' | 'month';

const VIEWS: { id: MeiView; label: string }[] = [
  { id: 'year', label: 'Ano' },
  { id: 'month', label: 'Mês' },
];

type YearProps = {
  status: MeiStatus;
  projection?: ForecastPoint | null;
  reachMonth?: string | null;
  /** false enquanto ninguém informou o mês de abertura do MEI */
  openedAtKnown: boolean;
};

type Props = YearProps & { month: MeiMonthStatus };

/** Termômetro do MEI (RF-44): quanto já usou do limite, na visão do ano ou do mês. */
export function MeiCard({ month, ...year }: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  const [view, setView] = useState<MeiView>('year');
  return (
    <Card>
      <View style={styles.head}>
        <Ionicons name="speedometer-outline" size={22} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <AppText variant="label">
            Limite do MEI em {view === 'year' ? year.status.year : formatMonthLong(month.month)}
          </AppText>
          <AppText variant="caption" color={colors.textMuted}>
            Conta a receita total (valor cheio dos fretes)
          </AppText>
        </View>
      </View>
      <Segmented accessibilityLabel="Ver limite por" options={VIEWS} value={view} onChange={setView} />
      {view === 'year' ? <YearView {...year} /> : <MonthView status={month} />}
    </Card>
  );
}

function YearView({ status, projection, reachMonth, openedAtKnown }: YearProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const color = levelColor(colors, status.level);
  return (
    <>
      <Gauge ratio={status.ratio} used={status.used} limit={status.limit} color={color} label="do limite do ano" />

      <AppText weight="600" color={color}>
        {meiMessage(status)}
      </AppText>

      <View style={styles.facts}>
        <Fact label="Ainda pode faturar no ano" value={formatBRL(status.remaining)} />
        <Fact
          label={`Média por mês até dezembro (${status.monthsLeft} ${status.monthsLeft === 1 ? 'mês' : 'meses'})`}
          value={formatBRL(status.maxMonthlyAverage)}
        />
        {projection ? (
          <Fact
            label="No ritmo atual, o ano deve fechar em"
            value={`${formatBRL(projection.value)}`}
            detail={`entre ${formatBRL(projection.low)} e ${formatBRL(projection.high)} — ${Math.round((projection.value / status.limit) * 100)}% do limite`}
          />
        ) : null}
        {reachMonth ? (
          <AppText weight="600" color={colors.negative}>
            ⚠ Nesse ritmo, o limite seria ultrapassado em {formatMonthLong(reachMonth)}.
          </AppText>
        ) : null}
      </View>

      {status.isProportional ? (
        <AppText variant="small" color={colors.textMuted}>
          Limite menor porque o MEI foi aberto neste ano ({status.activeMonths}{' '}
          {status.activeMonths === 1 ? 'mês' : 'meses'} de atividade).
        </AppText>
      ) : null}
      {!openedAtKnown ? (
        <View style={styles.ask}>
          <AppText variant="small">
            Abriu o MEI este ano? Informe o mês de abertura: no primeiro ano o limite é menor.
          </AppText>
          <Button
            variant="secondary"
            size="md"
            icon="calendar-outline"
            title="Informar mês de abertura"
            onPress={() => router.push('/perfil')}
          />
        </View>
      ) : null}
    </>
  );
}

function MonthView({ status }: { status: MeiMonthStatus }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const color = levelColor(colors, status.level);
  const times = status.overMonths.length;
  return (
    <>
      <Gauge ratio={status.ratio} used={status.used} limit={status.limit} color={color} label="do limite do mês" />

      {/* repetir meses acima do limite é alerta mesmo com o mês atual tranquilo */}
      <AppText weight="600" color={times >= 2 ? colors.negative : color}>
        {meiMonthMessage(status)}
      </AppText>

      <View style={styles.facts}>
        <Fact label="Ainda pode faturar neste mês" value={formatBRL(status.remaining)} />
        <Fact
          label={`Meses acima do limite em ${status.year}`}
          value={times === 0 ? 'Nenhum' : `${times} ${times === 1 ? 'mês' : 'meses'}`}
        />
        {status.overMonths.map((m) => (
          <View key={m.bucket} style={styles.overRow}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.negative} />
            <AppText variant="small" style={{ flex: 1, textTransform: 'capitalize' }}>
              {formatMonthShort(m.bucket)}
            </AppText>
            <AppText variant="small" weight="700" color={colors.negative}>
              {formatBRL(m.revenue)}
            </AppText>
          </View>
        ))}
      </View>

      <AppText variant="small" color={colors.textMuted}>
        Limite do ano dividido por 12. O governo cobra o total do ano: passar em um mês só não tira você do MEI.
      </AppText>
    </>
  );
}

function Gauge(props: { ratio: number; used: number; limit: number; color: string; label: string }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const pct = Math.round(props.ratio * 100);
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Você usou ${pct}% ${props.label}`}
      accessibilityValue={{ min: 0, max: 100, now: Math.min(pct, 100) }}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(100, Math.max(1, pct))}%`, backgroundColor: props.color }]} />
        <View style={[styles.mark, { left: '70%' }]} />
        <View style={[styles.mark, { left: '90%' }]} />
      </View>
      <View style={styles.between}>
        <AppText variant="title" color={props.color}>
          {pct}% usado
        </AppText>
        <AppText variant="small" color={colors.textMuted}>
          {formatBRL(props.used)} de {formatBRL(props.limit)}
        </AppText>
      </View>
    </View>
  );
}

function Fact({ label, value, detail }: { label: string; value: string; detail?: string }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.fact}>
      <AppText variant="small" color={colors.textMuted}>
        {label}
      </AppText>
      <AppText variant="title">{value}</AppText>
      {detail ? (
        <AppText variant="small" color={colors.textMuted}>
          {detail}
        </AppText>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  head: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  track: {
    height: 22,
    backgroundColor: colors.track,
    borderRadius: radius.pill,
    overflow: 'hidden',
    marginBottom: 8,
  },
  fill: { height: 22, borderRadius: radius.pill },
  mark: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: colors.surface },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 },
  facts: { gap: 12 },
  ask: { gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: colors.background },
  fact: { gap: 2 },
  overRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
}));
