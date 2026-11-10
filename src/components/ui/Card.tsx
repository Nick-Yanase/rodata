import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';

import { radius, space } from '@/theme/tokens';
import { makeStyles } from '@/theme/theme';

export function Card({ children, style, accent }: { children: ReactNode; style?: ViewStyle; accent?: boolean }) {
  const styles = useStyles();
  return <View style={[styles.card, accent && styles.accent, style]}>{children}</View>;
}

const useStyles = makeStyles((colors) => ({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.md,
  },
  accent: { borderColor: colors.primary, borderWidth: 1.5 },
}));
