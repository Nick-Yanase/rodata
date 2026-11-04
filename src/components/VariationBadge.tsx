import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { formatVariation } from '@/domain/metrics';
import { colors } from '@/theme/tokens';

import { AppText } from './ui';

/**
 * Variação com seta + sinal + cor (nunca só cor — RNF-03).
 * `higherIsBetter=false` para custos: subir custo é ruim (vermelho).
 */
export function VariationBadge({ value, higherIsBetter = true }: { value: number | null; higherIsBetter?: boolean }) {
  if (value === null || value === 0) {
    return (
      <AppText variant="small" color={colors.textMuted}>
        {value === null ? 'sem comparação' : 'igual ao período anterior'}
      </AppText>
    );
  }
  const up = value > 0;
  const good = up === higherIsBetter;
  const color = good ? colors.positive : colors.negative;
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${up ? 'Aumentou' : 'Diminuiu'} ${formatVariation(Math.abs(value))} em relação ao período comparado`}>
      <Ionicons name={up ? 'trending-up' : 'trending-down'} size={18} color={color} />
      <AppText variant="small" weight="600" color={color}>
        {formatVariation(value)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 4 } });
