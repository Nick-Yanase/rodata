import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatDateBR } from '@/domain/dates';
import type { NoteRow } from '@/lib/database.types';
import { colors, radius, space } from '@/theme/tokens';

import { AppText } from './ui';

export function NoteCard({ note, authorLabel, onPress }: { note: NoteRow; authorLabel?: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
      <AppText variant="label">
        {note.title}
      </AppText>
      <View style={styles.meta}>
        <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
        <AppText variant="small" color={colors.textMuted}>
          {formatDateBR(note.note_date)}
          {authorLabel ? ` · por ${authorLabel}` : ''}
        </AppText>
      </View>
      {note.body ? (
        <AppText color={colors.textMuted} numberOfLines={3}>
          {note.body}
        </AppText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.sm,
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
