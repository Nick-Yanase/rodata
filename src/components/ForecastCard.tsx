import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { formatMonthShort } from '@/domain/dates';
import { MIN_MONTHS_FOR_FORECAST, type Forecast } from '@/domain/forecast';
import { formatBRL } from '@/domain/money';
import { radius } from '@/theme/tokens';

import { AppText, Card } from './ui';
import { makeStyles, useTheme } from '@/theme/theme';

type Props = {
  months: string[];
  revenue: Forecast | null;
  net: Forecast | null;
  historyMonths: number;
};

/** Previsão dos próximos meses como faixa, nunca como número exato (RF-45). */
export function ForecastCard({ months, revenue, net, historyMonths }: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <Card>
      <View style={styles.head}>
        <Ionicons name="telescope-outline" size={22} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <AppText variant="label">Previsão dos próximos meses</AppText>
          <AppText variant="caption" color={colors.textMuted}>
            Estimativa com base no seu histórico. Pode variar.
          </AppText>
        </View>
      </View>
      {!revenue || !net ? (
        <AppText color={colors.textMuted}>
          Precisamos de pelo menos {MIN_MONTHS_FOR_FORECAST} meses completos de viagens para prever.
          {historyMonths > 0 ? ` Você já tem ${historyMonths}.` : ''}
        </AppText>
      ) : (
        months.map((m, i) => {
          const r = revenue.points[i];
          const n = net.points[i];
          const max = Math.max(...revenue.points.map((p) => p.high), 1);
          return (
            <View key={m} style={styles.month}>
              <AppText variant="label" style={styles.monthLabel}>
                {formatMonthShort(m)}
              </AppText>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={styles.track}>
                  <View
                    style={[styles.range, { left: `${(r.low / max) * 100}%`, width: `${Math.max(1, ((r.high - r.low) / max) * 100)}%` }]}
                  />
                  <View style={[styles.point, { left: `${(r.value / max) * 100}%` }]} />
                </View>
                <AppText variant="small">
                  Receita total ~<AppText variant="small" weight="700">{formatBRL(r.value)}</AppText>
                  {'  '}·{'  '}Faturada ~<AppText variant="small" weight="700">{formatBRL(n.value)}</AppText>
                </AppText>
                <AppText variant="caption" color={colors.textMuted}>
                  Receita entre {formatBRL(r.low)} e {formatBRL(r.high)}
                </AppText>
              </View>
            </View>
          );
        })
      )}
    </Card>
  );
}

const useStyles = makeStyles((colors) => ({
  head: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  month: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  monthLabel: { width: 64, textTransform: 'capitalize' },
  track: { height: 14, backgroundColor: colors.track, borderRadius: radius.pill, marginTop: 4 },
  range: { position: 'absolute', top: 0, bottom: 0, backgroundColor: '#A5D8E3', borderRadius: radius.pill },
  point: { position: 'absolute', top: -3, width: 6, height: 20, marginLeft: -3, borderRadius: 3, backgroundColor: colors.chartRevenue },
}));
