import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { COST_CATEGORIES, type PeriodTotals } from '@/domain/metrics';
import { formatBRL } from '@/domain/money';
import { colors, radius } from '@/theme/tokens';

import { AppText, Card } from './ui';
import { VariationBadge } from './VariationBadge';

/** Custo total e barras por categoria (como no design), com valor e % (RF-42). */
export function CostBreakdown({ totals, variation, showVariation = true }: { totals: PeriodTotals; variation: number | null; showVariation?: boolean }) {
  const rows = COST_CATEGORIES.map((c) => ({ ...c, value: totals[c.id] }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);
  return (
    <Card>
      <View style={styles.head}>
        <Ionicons name="wallet-outline" size={22} color={colors.primary} />
        <AppText variant="label">Custos</AppText>
      </View>
      <View style={styles.totalRow}>
        <AppText variant="money">{formatBRL(totals.cost)}</AppText>
        {showVariation ? <VariationBadge value={variation} higherIsBetter={false} /> : null}
      </View>
      {rows.length === 0 ? (
        <AppText color={colors.textMuted}>Nenhum gasto lançado neste período.</AppText>
      ) : (
        rows.map((r) => {
          const share = totals.cost > 0 ? r.value / totals.cost : 0;
          return (
            <View key={r.id} style={styles.row} accessible accessibilityLabel={`${r.label}: ${formatBRL(r.value)}, ${Math.round(share * 100)}% dos custos`}>
              <View style={styles.rowText}>
                <AppText>{r.label}</AppText>
                <AppText weight="700">
                  {formatBRL(r.value)}{' '}
                  <AppText variant="small" color={colors.textMuted}>
                    ({Math.round(share * 100)}%)
                  </AppText>
                </AppText>
              </View>
              <View style={styles.track}>
                <View style={[styles.bar, { width: `${Math.max(2, share * 100)}%` }]} />
              </View>
            </View>
          );
        })
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  totalRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  row: { gap: 6 },
  rowText: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 12, backgroundColor: colors.track, borderRadius: radius.pill, overflow: 'hidden' },
  bar: { height: 12, backgroundColor: colors.primary, borderRadius: radius.pill },
});
