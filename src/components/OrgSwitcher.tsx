import { StyleSheet, View } from 'react-native';

import { useSession } from '@/features/auth/session';
import { colors } from '@/theme/tokens';

import { AppText, Chip } from './ui';

/** Para quem participa de mais de uma organização: escolher qual está vendo. */
export function OrgSwitcher() {
  const { organizations, activeOrg, setActiveOrgId } = useSession();
  if (organizations.length < 2) return null;
  return (
    <View style={styles.wrap}>
      <AppText variant="small" color={colors.textMuted}>
        Organização:
      </AppText>
      <View style={styles.row}>
        {organizations.map((o) => (
          <Chip key={o.id} label={o.name} selected={o.id === activeOrg?.id} onPress={() => setActiveOrgId(o.id)} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
