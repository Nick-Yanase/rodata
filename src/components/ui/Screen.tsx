import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, MAX_WIDTH, space } from '@/theme/tokens';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  footer?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  background?: string;
  /** elemento flutuante sobre o conteúdo (ex.: botão +) */
  overlay?: ReactNode;
  /** espaço extra no fim da rolagem */
  bottomSpace?: number;
};

/** Container padrão: área segura, rolagem, teclado e largura máxima na web. */
export function Screen({
  children,
  scroll = true,
  edges = ['top'],
  footer,
  refreshing,
  onRefresh,
  background = colors.background,
  overlay,
  bottomSpace = 0,
}: Props) {
  const content = <View style={styles.inner}>{children}</View>;
  return (
    <SafeAreaView edges={edges} style={[styles.safe, { backgroundColor: background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.scroll, bottomSpace ? { paddingBottom: bottomSpace } : null]}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              onRefresh ? (
                <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} />
              ) : undefined
            }>
            {content}
          </ScrollView>
        ) : (
          content
        )}
        {footer ? (
          <View style={styles.footer}>
            <View style={styles.footerInner}>{footer}</View>
          </View>
        ) : null}
        {overlay}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: space.xxl },
  inner: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
    padding: space.lg,
    gap: space.lg,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    padding: space.lg,
  },
  footerInner: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
});
