import { Image } from 'expo-image';
import { View } from 'react-native';


import { AppText } from './ui';
import { makeStyles } from '@/theme/theme';

type Props = { name?: string | null; url?: string | null; size?: number };

/** Foto da pessoa ou, sem foto, a inicial do nome num círculo. */
export function Avatar({ name, url, size = 44 }: Props) {
  const styles = useStyles();
  const initial = (name?.trim()?.[0] ?? '?').toUpperCase();
  const round = { width: size, height: size, borderRadius: size / 2 };
  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={[round, styles.photo]}
        contentFit="cover"
        transition={150}
        accessibilityLabel={name ? `Foto de ${name}` : 'Foto'}
      />
    );
  }
  return (
    <View style={[round, styles.fallback]} accessible accessibilityLabel={name ?? undefined}>
      <AppText color="#FFFFFF" weight="700" style={{ fontSize: Math.round(size * 0.42), lineHeight: Math.round(size * 0.5) }}>
        {initial}
      </AppText>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  photo: { backgroundColor: colors.track },
  fallback: { backgroundColor: colors.primaryStrong, alignItems: 'center', justifyContent: 'center' },
}));
