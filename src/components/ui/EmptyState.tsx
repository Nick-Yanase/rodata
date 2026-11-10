import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { space } from '@/theme/tokens';

import { AppText } from './AppText';
import { useTheme } from '@/theme/theme';

type Props = {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  message?: string;
  action?: ReactNode;
};

/** Estado vazio que ensina o próximo passo. */
export function EmptyState({ icon, title, message, action }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <Ionicons name={icon} size={48} color={colors.primary} />
      <AppText variant="title" align="center">
        {title}
      </AppText>
      {message ? (
        <AppText color={colors.textMuted} align="center">
          {message}
        </AppText>
      ) : null}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space.md, paddingVertical: space.xxl, paddingHorizontal: space.lg },
});
