import { useEffect } from 'react';
import { StyleSheet, View, type TextStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from './ui';

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

type Props = {
  /** texto já formatado, ex.: "R$ 26.106,49" */
  value: string;
  color?: string;
  fontSize?: number;
  lineHeight?: number;
  weight?: TextStyle['fontWeight'];
};

/**
 * Número que "rola" como um odômetro: cada dígito sobe até o valor certo, da
 * esquerda para a direita, ao aparecer na tela e sempre que o valor muda.
 * Símbolos (R$, ponto, vírgula, sinal) ficam parados.
 */
export function RollingNumber({ value, color, fontSize = 26, lineHeight = 32, weight = '700' }: Props) {
  const reduced = useReducedMotion();
  const chars = value.split('');
  const textStyle: TextStyle = { fontSize, lineHeight, fontWeight: weight, fontVariant: ['tabular-nums'] };

  if (reduced) {
    return (
      <AppText color={color} style={textStyle}>
        {value}
      </AppText>
    );
  }

  return (
    <View style={styles.row} accessible accessibilityRole="text" accessibilityLabel={value}>
      {chars.map((c, i) => {
        // chave contada da direita: centavos continuam na mesma coluna se o número crescer
        const key = `${chars.length - i}-${/\d/.test(c) ? 'd' : c}`;
        return /\d/.test(c) ? (
          <Digit key={key} digit={Number(c)} order={i} lineHeight={lineHeight} color={color} textStyle={textStyle} />
        ) : (
          <AppText key={key} color={color} style={textStyle}>
            {c}
          </AppText>
        );
      })}
    </View>
  );
}

function Digit({
  digit,
  order,
  lineHeight,
  color,
  textStyle,
}: {
  digit: number;
  order: number;
  lineHeight: number;
  color?: string;
  textStyle: TextStyle;
}) {
  const offset = useSharedValue(0);

  useEffect(() => {
    offset.value = withDelay(
      order * 45,
      withTiming(-digit * lineHeight, { duration: 700, easing: Easing.out(Easing.cubic) }),
    );
  }, [digit, order, lineHeight, offset]);

  const animated = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value }] }));

  return (
    <View style={{ height: lineHeight, overflow: 'hidden' }} accessible={false}>
      <Animated.View style={animated}>
        {DIGITS.map((d) => (
          <AppText key={d} color={color} style={textStyle}>
            {d}
          </AppText>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'flex-start', flexWrap: 'nowrap' } });
