import { Ionicons } from '@expo/vector-icons';
import { addMonths, format, getMonth, getYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { formatMonthLong, fromISODate, toISODate, type ISODate } from '@/domain/dates';
import { colors, radius, space, TOUCH } from '@/theme/tokens';

import { AppText, Button } from './ui';

type Props = {
  /** mês selecionado (1º dia) ou null quando o período ativo é um atalho */
  value: ISODate | null;
  onChange: (month: ISODate) => void;
};

/**
 * Escolha de mês: setas para o mês anterior/seguinte e, ao tocar no nome,
 * uma grade com os 12 meses do ano.
 */
export function MonthPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const shown = value ?? toISODate(new Date(getYear(new Date()), getMonth(new Date()), 1));
  const step = (n: number) => onChange(toISODate(addMonths(fromISODate(shown), n)));

  return (
    <View style={[styles.row, value ? styles.rowActive : null]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Mês anterior" onPress={() => step(-1)} style={styles.arrow}>
        <Ionicons name="chevron-back" size={26} color={colors.primaryStrong} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Escolher mês. Selecionado: ${formatMonthLong(shown)}`}
        onPress={() => setOpen(true)}
        style={styles.label}>
        <Ionicons name="calendar-outline" size={20} color={value ? colors.primaryStrong : colors.textMuted} />
        <AppText variant="label" color={value ? colors.primaryStrong : colors.text}>
          {value ? capitalizeFirst(formatMonthLong(value)) : 'Escolher mês'}
        </AppText>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Próximo mês" onPress={() => step(1)} style={styles.arrow}>
        <Ionicons name="chevron-forward" size={26} color={colors.primaryStrong} />
      </Pressable>
      <MonthGrid
        visible={open}
        initial={shown}
        selected={value}
        onClose={() => setOpen(false)}
        onPick={(m) => {
          setOpen(false);
          onChange(m);
        }}
      />
    </View>
  );
}

function MonthGrid(props: {
  visible: boolean;
  initial: ISODate;
  selected: ISODate | null;
  onClose: () => void;
  onPick: (m: ISODate) => void;
}) {
  const [year, setYear] = useState(getYear(fromISODate(props.initial)));
  return (
    <Modal visible={props.visible} transparent animationType="fade" onRequestClose={props.onClose}>
      <Pressable style={styles.backdrop} onPress={props.onClose} accessibilityLabel="Fechar">
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.yearRow}>
            <Pressable accessibilityRole="button" accessibilityLabel="Ano anterior" onPress={() => setYear((y) => y - 1)} style={styles.arrow}>
              <Ionicons name="chevron-back" size={26} color={colors.primaryStrong} />
            </Pressable>
            <AppText variant="title">{year}</AppText>
            <Pressable accessibilityRole="button" accessibilityLabel="Próximo ano" onPress={() => setYear((y) => y + 1)} style={styles.arrow}>
              <Ionicons name="chevron-forward" size={26} color={colors.primaryStrong} />
            </Pressable>
          </View>
          <View style={styles.grid}>
            {Array.from({ length: 12 }, (_, m) => {
              const iso = toISODate(new Date(year, m, 1));
              const selected = props.selected === iso;
              return (
                <Pressable
                  key={iso}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => props.onPick(iso)}
                  style={[styles.cell, selected && styles.cellSelected]}>
                  <AppText variant="label" color={selected ? '#FFFFFF' : colors.text} style={styles.capitalize}>
                    {format(new Date(year, m, 1), 'MMM', { locale: ptBR })}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
          <Button title="Fechar" variant="ghost" size="md" onPress={props.onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function capitalizeFirst(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  rowActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  arrow: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, minHeight: TOUCH },
  capitalize: { textTransform: 'capitalize' },
  backdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: space.lg },
  sheet: { width: '100%', maxWidth: 420, backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, gap: space.md },
  yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  cell: {
    width: '31%',
    flexGrow: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  cellSelected: { backgroundColor: colors.primaryStrong, borderColor: colors.primaryStrong },
});
