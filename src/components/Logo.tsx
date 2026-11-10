import { Image } from 'expo-image';
import { View } from 'react-native';


import { AppText } from './ui';
import { makeStyles, useTheme } from '@/theme/theme';

export function Logo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const lg = size === 'lg';
  return (
    <View style={styles.row} accessible accessibilityRole="header" accessibilityLabel="Rodata">
      <AppText style={[styles.text, lg && styles.lgText]}>
        Ro<AppText style={[styles.text, lg && styles.lgText, { color: colors.primary }]}>data</AppText>
      </AppText>
      <Image
        source={require('@/assets/images/logo-truck.png')}
        style={lg ? styles.lgIcon : styles.icon}
        contentFit="contain"
        accessible={false}
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  text: { fontSize: 30, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  lgText: { fontSize: 38 },
  icon: { width: 48, height: 32 },
  lgIcon: { width: 66, height: 44 },
}));
