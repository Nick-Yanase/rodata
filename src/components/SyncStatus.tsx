import { Ionicons } from '@expo/vector-icons';
import { onlineManager, useMutationState } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { View } from 'react-native';

import { radius, space } from '@/theme/tokens';

import { AppText } from './ui';
import { makeStyles, useTheme } from '@/theme/theme';

function useOnline() {
  return useSyncExternalStore(
    (cb) => onlineManager.subscribe(cb),
    () => onlineManager.isOnline(),
    () => true,
  );
}

/** Mostra quando há lançamentos guardados no celular esperando internet (RF-17). */
export function SyncStatus() {
  const { colors } = useTheme();
  const styles = useStyles();
  const online = useOnline();
  const pending = useMutationState({
    filters: { status: 'pending' },
    select: (m) => m.state.isPaused,
  });
  const waiting = pending.filter(Boolean).length;
  if (online && waiting === 0) return null;
  return (
    <View style={styles.bar} accessibilityLiveRegion="polite">
      <Ionicons name={online ? 'cloud-upload-outline' : 'cloud-offline-outline'} size={20} color={colors.warning} />
      <AppText variant="small" color={colors.text} style={{ flex: 1 }}>
        {online
          ? `Enviando ${waiting} ${waiting === 1 ? 'lançamento' : 'lançamentos'}…`
          : waiting > 0
            ? `Sem internet. ${waiting} ${waiting === 1 ? 'lançamento salvo' : 'lançamentos salvos'} no celular — enviamos sozinhos quando o sinal voltar.`
            : 'Sem internet. Você pode continuar lançando: salvamos no celular.'}
      </AppText>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    padding: space.md,
  },
}));
