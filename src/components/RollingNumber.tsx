import { useIsFocused } from 'expo-router';
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
 * esquerda para a direita, sempre que a tela entra em foco e quando o valor muda.
 * (As abas ficam montadas em segundo plano: sem o foco, a animação só rodaria
 * na primeira vez, muitas vezes ainda atrás da tela de abertura.)
 * Símbolos (R$, ponto, vírgula, sinal) ficam parados.
 */
export function RollingNumber({ value, color, fontSize = 26, lineHeight = 32, weight = '700' }: Props) {
  const reduced = useReducedMotion();
  const focused = useIsFocused();
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
          <Digit
            key={key}
            digit={Number(c)}
            order={i}
            lineHeight={lineHeight}
            color={color}
            textStyle={textStyle}
            focused={focused}
          />
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
  focused,
}: {
  focused: boolean;
  digit: number;
  order: number;
  lineHeight: number;
  color?: string;
  textStyle: TextStyle;
}) {
  const offset = useSharedValue(0);

  // ao ganhar foco: recomeça do 0 e rola até o dígito; se o valor muda com a tela
  // aberta, rola do dígito atual até o novo
  useEffect(() => {
    if (!focused) return;
    offset.set(0);
    offset.set(
      withDelay(120 + order * 45, withTiming(-digit * lineHeight, { duration: 800, easing: Easing.out(Easing.cubic) })),
    );
  }, [focused, lineHeight, offset, order]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!focused) return;
    offset.set(withTiming(-digit * lineHeight, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [digit]); // eslint-disable-line react-hooks/exhaustive-deps

  const animated = useAnimatedStyle(() => ({ transform: [{ translateY: offset.get() }] }));

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
