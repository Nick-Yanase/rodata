import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View } from 'react-native';

import { formatMonthLong } from '@/domain/dates';
import type { ForecastPoint } from '@/domain/forecast';
import { meiMessage, type MeiStatus } from '@/domain/mei';
import { formatBRL } from '@/domain/money';
import { radius } from '@/theme/tokens';

import { AppText, Button, Card } from './ui';
import { makeStyles, useTheme } from '@/theme/theme';
import type { Palette } from '@/theme/tokens';

// 3 estágios do termômetro: verde (< 70%), amarelo (70–90%), vermelho (≥ 90%)
function levelColor(colors: Palette, level: MeiStatus['level']) {
  if (level === 'ok') return colors.positive;
  if (level === 'attention') return colors.warning;
  return colors.negative;
}

type Props = {
  status: MeiStatus;
  projection?: ForecastPoint | null;
  reachMonth?: string | null;
  /** false enquanto ninguém informou o mês de abertura do MEI */
  openedAtKnown: boolean;
};

/** Termômetro do MEI (RF-44): quanto já usou do limite e quanto pode faturar por mês. */
export function MeiCard({ status, projection, reachMonth, openedAtKnown }: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  const color = levelColor(colors, status.level);
  const pct = Math.round(status.ratio * 100);
  return (
    <Card>
      <View style={styles.head}>
        <Ionicons name="speedometer-outline" size={22} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <AppText variant="label">Limite do MEI em {status.year}</AppText>
          <AppText variant="caption" color={colors.textMuted}>
            Conta a receita total (valor cheio dos fretes)
          </AppText>
        </View>
      </View>

      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`Você usou ${pct}% do limite`}
        accessibilityValue={{ min: 0, max: 100, now: Math.min(pct, 100) }}>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.min(100, Math.max(1, pct))}%`, backgroundColor: color }]} />
          <View style={[styles.mark, { left: '70%' }]} />
          <View style={[styles.mark, { left: '90%' }]} />
        </View>
        <View style={styles.between}>
          <AppText variant="title" color={color}>
            {pct}% usado
          </AppText>
          <AppText variant="small" color={colors.textMuted}>
            {formatBRL(status.used)} de {formatBRL(status.limit)}
          </AppText>
        </View>
      </View>

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
    </Card>
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
}));
