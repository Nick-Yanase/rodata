import { StyleSheet, View } from 'react-native';

import { useSession } from '@/features/auth/session';
import { colors } from '@/theme/tokens';

import { AppText, Chip } from './ui';

/** Para o analista: escolher qual fretista está vendo (RF-07). */
export function DriverSwitcher() {
  const { isAnalyst, linkedDrivers, activeDriverId, setActiveDriverId } = useSession();
  if (!isAnalyst || linkedDrivers.length < 2) return null;
  return (
    <View style={styles.wrap}>
      <AppText variant="small" color={colors.textMuted}>
        Vendo os dados de:
      </AppText>
      <View style={styles.row}>
        {linkedDrivers.map((d) => (
          <Chip key={d.id} label={d.name} selected={d.id === activeDriverId} onPress={() => setActiveDriverId(d.id)} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
