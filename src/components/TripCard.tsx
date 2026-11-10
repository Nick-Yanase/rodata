import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { formatDateBR } from '@/domain/dates';
import { tripNet } from '@/domain/metrics';
import { formatBRL } from '@/domain/money';
import type { TripRow } from '@/lib/database.types';
import { radius, space } from '@/theme/tokens';

import { AppText } from './ui';
import { makeStyles, useTheme } from '@/theme/theme';

export function tripTitle(t: Pick<TripRow, 'title' | 'destination'>) {
  return t.title || (t.destination ? `Viagem para ${t.destination}` : 'Viagem');
}

/** Card da lista: frete, custo e receita faturada em destaque (RF-15). */
export function TripCard({ trip, author, onPress }: { trip: TripRow; author?: string; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const net = tripNet(trip);
  const place = [trip.origin, trip.destination].filter(Boolean).join(' → ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Abre a viagem para ver ou editar"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
      <View style={styles.top}>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="label">
            {tripTitle(trip)}
          </AppText>
          {place ? (
            <View style={styles.meta}>
              <Ionicons name="location-outline" size={16} color={colors.textMuted} />
              <AppText variant="small" color={colors.textMuted} style={{ flex: 1 }}>
                {place}
              </AppText>
            </View>
          ) : null}
          <View style={styles.meta}>
            <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
            <AppText variant="small" color={colors.textMuted}>
              {formatDateBR(trip.trip_date)}
              {author ? ` · lançada por ${author}` : ''}
            </AppText>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={22} color={colors.textSubtle} />
      </View>
      <View style={styles.values}>
        <Value label="Frete" value={formatBRL(trip.freight_cents)} />
        <Value label="Custos" value={formatBRL(trip.cost_cents)} />
        <Value
          label="Faturada"
          value={formatBRL(net)}
          tone={net < 0 ? 'negative' : 'positive'}
        />
      </View>
    </Pressable>
  );
}

function Value({ label, value, tone }: { label: string; value: string; tone?: 'positive' | 'negative' }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const bg = tone === 'positive' ? colors.positiveSoft : tone === 'negative' ? colors.negativeSoft : colors.background;
  const fg = tone === 'positive' ? colors.positive : tone === 'negative' ? colors.negative : colors.text;
  return (
    <View style={[styles.value, { backgroundColor: bg }]}>
      <AppText variant="caption" color={tone ? fg : colors.textMuted}>
        {label}
      </AppText>
      <AppText variant="small" weight="700" color={fg}>
        {value}
      </AppText>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.md,
  },
  top: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  values: { flexDirection: 'row', gap: space.sm },
  value: { flex: 1, borderRadius: radius.sm, paddingVertical: 6, paddingHorizontal: 8 },
}));
