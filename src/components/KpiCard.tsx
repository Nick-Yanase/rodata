import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { formatBRL, type Cents } from '@/domain/money';

import { AppText, Card } from './ui';
import { VariationBadge } from './VariationBadge';
import { useTheme } from '@/theme/theme';

type Props = {
  title: string;
  subtitle?: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  value: Cents;
  variation: number | null;
  higherIsBetter?: boolean;
  showVariation?: boolean;
};

export function KpiCard({ title, subtitle, icon, value, variation, higherIsBetter, showVariation = true }: Props) {
  const { colors } = useTheme();
  return (
    <Card accent style={styles.card}>
      <View style={styles.head}>
        <Ionicons name={icon} size={22} color={colors.primary} />
        <View style={styles.titles}>
          <AppText variant="label">{title}</AppText>
          {subtitle ? (
            <AppText variant="caption" color={colors.textMuted}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
      </View>
      <AppText variant="money" color={value < 0 ? colors.negative : colors.text} style={styles.money}>
        {formatBRL(value)}
      </AppText>
      {showVariation ? <VariationBadge value={variation} higherIsBetter={higherIsBetter} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 160, gap: 8 },
  head: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  titles: { flex: 1 },
  // cabe "R$ 999.999,99" em meia tela de celular sem cortar
  money: { fontSize: 22, lineHeight: 28 },
});
