import { Ionicons } from '@expo/vector-icons';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, space } from '@/theme/tokens';

import { AppText } from './AppText';

type ToastInput = { message: string; tone?: 'success' | 'error' | 'info'; actionLabel?: string; onAction?: () => void };

const ToastContext = createContext<(t: ToastInput) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

/** Aviso rápido no rodapé ("Viagem salva ✓"), com ação opcional "Desfazer". */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastInput | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const show = useCallback((t: ToastInput) => {
    if (timer.current) clearTimeout(timer.current);
    setToast(t);
    timer.current = setTimeout(() => setToast(null), t.onAction ? 6000 : 3500);
  }, []);

  const value = useMemo(() => show, [show]);
  const tone = toast?.tone ?? 'success';
  const icon = tone === 'error' ? 'alert-circle' : tone === 'info' ? 'information-circle' : 'checkmark-circle';

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <View pointerEvents="box-none" style={[styles.host, { bottom: insets.bottom + 90 }]}>
          <View
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            style={[styles.toast, tone === 'error' && { backgroundColor: colors.negative }]}>
            <Ionicons name={icon} size={24} color="#FFFFFF" />
            <AppText color="#FFFFFF" style={styles.text}>
              {toast.message}
            </AppText>
            {toast.actionLabel && toast.onAction ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  toast.onAction?.();
                  setToast(null);
                }}
                style={styles.action}>
                <AppText variant="label" color="#FFFFFF" style={styles.actionText}>
                  {toast.actionLabel}
                </AppText>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: space.lg },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.text,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    width: '100%',
    maxWidth: 560,
  },
  text: { flex: 1 },
  action: { minHeight: 44, justifyContent: 'center', paddingHorizontal: space.sm },
  actionText: { textDecorationLine: 'underline' },
});
