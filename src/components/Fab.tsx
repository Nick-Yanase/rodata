import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { colors, space } from '@/theme/tokens';

type Props = {
  label: string;
  onPress: () => void;
  icon?: ComponentProps<typeof Ionicons>['name'];
};

/** Botão flutuante de ação principal (como o "Escrever" do Gmail). */
export function Fab({ label, onPress, icon = 'add' }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.fab, pressed && styles.pressed]}>
      <Ionicons name={icon} size={34} color="#FFFFFF" />
    </Pressable>
  );
}

/** Espaço no fim da lista para o botão flutuante não cobrir o último item. */
export const FAB_CLEARANCE = 96;

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    left: space.lg,
    bottom: space.lg,
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primaryStrong,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },
});
