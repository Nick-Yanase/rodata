import { Text, type TextProps } from 'react-native';

import { useTheme } from '@/theme/theme';
import { font } from '@/theme/tokens';

type Variant = 'body' | 'small' | 'label' | 'title' | 'heading' | 'money' | 'caption';

const styles: Record<Variant, { fontSize: number; fontWeight?: '400' | '500' | '600' | '700'; lineHeight?: number }> = {
  body: { fontSize: font.body, lineHeight: 24 },
  small: { fontSize: font.small, lineHeight: 21 },
  caption: { fontSize: 14, lineHeight: 19 },
  label: { fontSize: font.label, fontWeight: '600', lineHeight: 22 },
  title: { fontSize: font.title, fontWeight: '700', lineHeight: 28 },
  heading: { fontSize: font.heading, fontWeight: '700', lineHeight: 34 },
  money: { fontSize: font.money, fontWeight: '700', lineHeight: 32 },
};

export type AppTextProps = TextProps & {
  variant?: Variant;
  color?: string;
  weight?: '400' | '500' | '600' | '700';
  align?: 'left' | 'center' | 'right';
};

export function AppText({ variant = 'body', color, weight, align, style, ...rest }: AppTextProps) {
  const { colors } = useTheme();
  return (
    <Text
      // respeita o tamanho de fonte do sistema, mas sem explodir o layout
      maxFontSizeMultiplier={1.6}
      style={[styles[variant], { color: color ?? colors.text }, weight && { fontWeight: weight }, align && { textAlign: align }, style]}
      {...rest}
    />
  );
}
