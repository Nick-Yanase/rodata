import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { formatBRL, type Cents } from '@/domain/money';
import { colors } from '@/theme/tokens';

import { KpiCard } from './KpiCard';
import { AppText, Card } from './ui';
import { VariationBadge } from './VariationBadge';

type Row = {
  title: string;
  subtitle: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  value: Cents;
  variation: number | null;
};

/**
 * Receita total e receita faturada. No celular ficam num card só, uma embaixo da
 * outra (os valores não cabem lado a lado); em telas largas, dois cards.
 */
export function RevenueCard({ rows, showVariation }: { rows: Row[]; showVariation: boolean }) {
  const { width } = useWindowDimensions();
  if (width >= 640) {
    return (
      <View style={styles.wide}>
        {rows.map((r) => (
          <KpiCard key={r.title} {...r} showVariation={showVariation} />
        ))}
      </View>
    );
  }
  return (
    <Card accent>
      {rows.map((r, i) => (
        <View key={r.title} style={[styles.row, i > 0 && styles.divider]}>
          <View style={styles.head}>
            <Ionicons name={r.icon} size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <AppText variant="label">{r.title}</AppText>
              <AppText variant="caption" color={colors.textMuted}>
                {r.subtitle}
              </AppText>
            </View>
          </View>
          <AppText variant="money" color={r.value < 0 ? colors.negative : colors.text}>
            {formatBRL(r.value)}
          </AppText>
          {showVariation ? <VariationBadge value={r.variation} /> : null}
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  wide: { flexDirection: 'row', gap: 12 },
  row: { gap: 6 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14 },
  head: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
});
