import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { radius, space, TOUCH } from '@/theme/tokens';
import { useTheme } from '@/theme/theme';
import type { Palette } from '@/theme/tokens';

import { AppText } from './AppText';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: ComponentProps<typeof Ionicons>['name'];
  loading?: boolean;
  disabled?: boolean;
  size?: 'md' | 'lg';
  style?: ViewStyle;
  accessibilityHint?: string;
};

function palette(colors: Palette, variant: Variant): { bg: string; fg: string; border: string } {
  switch (variant) {
    case 'primary':
      return { bg: colors.primaryStrong, fg: colors.onPrimary, border: colors.primaryStrong };
    case 'secondary':
      return { bg: colors.surface, fg: colors.primaryStrong, border: colors.primaryStrong };
    case 'ghost':
      return { bg: 'transparent', fg: colors.primaryStrong, border: 'transparent' };
    case 'danger':
      return { bg: colors.surface, fg: colors.negative, border: colors.negative };
  }
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  size = 'lg',
  style,
  accessibilityHint,
}: ButtonProps) {
  const { colors } = useTheme();
  const p = palette(colors, variant);
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' ? styles.lg : styles.md,
        { backgroundColor: p.bg, borderColor: p.border },
        pressed && styles.pressed,
        inactive && styles.disabled,
        style,
      ]}>
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator color={p.fg} />
        ) : icon ? (
          <Ionicons name={icon} size={size === 'lg' ? 24 : 20} color={p.fg} />
        ) : null}
        <AppText variant="label" color={p.fg} style={size === 'lg' ? styles.lgText : undefined}>
          {title}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  lg: { minHeight: 56 },
  md: { minHeight: TOUCH },
  lgText: { fontSize: 19, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
});
