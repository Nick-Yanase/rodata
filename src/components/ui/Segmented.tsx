import { Pressable, View } from 'react-native';

import { radius, space, TOUCH } from '@/theme/tokens';

import { AppText } from './AppText';
import { makeStyles, useTheme } from '@/theme/theme';

type Props<T extends string> = {
  options: { id: T; label: string; disabled?: boolean }[];
  value: T;
  onChange: (id: T) => void;
  accessibilityLabel?: string;
};

export function Segmented<T extends string>({ options, value, onChange, accessibilityLabel }: Props<T>) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.row} accessibilityRole="tablist" accessibilityLabel={accessibilityLabel}>
      {options.map((o) => {
        const selected = o.id === value;
        return (
          <Pressable
            key={o.id}
            accessibilityRole="tab"
            accessibilityState={{ selected, disabled: o.disabled }}
            disabled={o.disabled}
            onPress={() => onChange(o.id)}
            style={[styles.item, selected && styles.selected, o.disabled && { opacity: 0.4 }]}>
            <AppText variant="label" color={selected ? colors.primaryStrong : colors.textMuted}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  row: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: space.xs,
    gap: space.xs,
  },
  item: {
    flex: 1,
    minHeight: TOUCH - 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
  },
  selected: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
}));
