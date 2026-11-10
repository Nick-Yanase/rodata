import { Pressable } from 'react-native';

import { radius, space, TOUCH } from '@/theme/tokens';

import { AppText } from './AppText';
import { makeStyles, useTheme } from '@/theme/theme';

type Props = { label: string; selected?: boolean; onPress: () => void };

export function Chip({ label, selected, onPress }: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && { opacity: 0.8 }]}>
      <AppText variant="label" color={selected ? colors.primaryStrong : colors.textMuted}>
        {label}
      </AppText>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  chip: {
    minHeight: TOUCH - 4,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
}));
