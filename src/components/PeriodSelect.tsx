import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Modal, Pressable, View, useWindowDimensions } from 'react-native';

import { formatDateBR, formatMonthLong, PERIOD_PRESETS, type ISODate, type Period, type PeriodPreset } from '@/domain/dates';
import { makeStyles, useTheme } from '@/theme/theme';
import { radius, space, TOUCH } from '@/theme/tokens';

import { MonthGrid } from './MonthPicker';
import { AppText } from './ui';

export type PeriodChoice = { preset: PeriodPreset } | { month: ISODate };

type Props = {
  value: PeriodChoice;
  /** datas do período escolhido, para mostrar no campo */
  range: Period;
  onChange: (v: PeriodChoice) => void;
};

const MENU_WIDTH = 280;

function capitalizeFirst(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function periodLabel(v: PeriodChoice) {
  return 'month' in v ? capitalizeFirst(formatMonthLong(v.month)) : PERIOD_PRESETS.find((p) => p.id === v.preset)!.label;
}

/**
 * Campo de período compacto (como um select): mostra o período atual e, ao tocar,
 * abre a lista de atalhos e "Escolher um mês…" (grade com os 12 meses).
 */
export function PeriodSelect({ value, range, onChange }: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  const anchor = useRef<{ measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => void } | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; w: number } | null>(null);
  const [grid, setGrid] = useState(false);
  const { width } = useWindowDimensions();

  function open() {
    anchor.current?.measureInWindow((x, y, w, h) => {
      const menuW = Math.min(Math.max(w, MENU_WIDTH), width - 2 * space.lg);
      setMenu({ x: Math.min(x, width - menuW - space.lg), y: y + h + 4, w: menuW });
    });
  }

  const selectedMonth = 'month' in value ? value.month : null;

  return (
    <>
      <Pressable
        ref={anchor as never}
        accessibilityRole="button"
        accessibilityLabel={`Período analisado: ${periodLabel(value)}, de ${formatDateBR(range.start)} a ${formatDateBR(range.end)}. Toque para trocar.`}
        onPress={open}
        style={({ pressed }) => [styles.field, pressed && styles.pressed]}>
        <Ionicons name="calendar-outline" size={22} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <AppText variant="label">{periodLabel(value)}</AppText>
          <AppText variant="caption" color={colors.textMuted}>
            {formatDateBR(range.start)} a {formatDateBR(range.end)}
          </AppText>
        </View>
        <Ionicons name="chevron-down" size={22} color={colors.textMuted} />
      </Pressable>

      <Modal visible={menu !== null} transparent animationType="fade" onRequestClose={() => setMenu(null)}>
        <Pressable style={{ flex: 1 }} onPress={() => setMenu(null)} accessibilityLabel="Fechar">
          {menu ? (
            <View style={[styles.menu, { left: Math.max(space.lg, menu.x), top: menu.y, width: menu.w }]} accessibilityRole="menu">
              {PERIOD_PRESETS.map((p) => {
                const selected = 'preset' in value && value.preset === p.id;
                return (
                  <Pressable
                    key={p.id}
                    accessibilityRole="menuitem"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      setMenu(null);
                      onChange({ preset: p.id });
                    }}
                    style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
                    <AppText style={{ flex: 1 }} weight={selected ? '700' : '400'}>
                      {p.label}
                    </AppText>
                    {selected ? <Ionicons name="checkmark" size={20} color={colors.primaryStrong} /> : null}
                  </Pressable>
                );
              })}
              <View style={styles.divider} />
              <Pressable
                accessibilityRole="menuitem"
                accessibilityState={{ selected: Boolean(selectedMonth) }}
                onPress={() => {
                  setMenu(null);
                  setGrid(true);
                }}
                style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
                <Ionicons name="calendar-number-outline" size={20} color={colors.primary} />
                <AppText style={{ flex: 1 }} weight={selectedMonth ? '700' : '400'}>
                  {selectedMonth ? capitalizeFirst(formatMonthLong(selectedMonth)) : 'Escolher um mês…'}
                </AppText>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </Pressable>
            </View>
          ) : null}
        </Pressable>
      </Modal>

      <MonthGrid
        visible={grid}
        initial={selectedMonth ?? range.start}
        selected={selectedMonth}
        onClose={() => setGrid(false)}
        onPick={(month) => {
          setGrid(false);
          onChange({ month });
        }}
      />
    </>
  );
}

const useStyles = makeStyles((colors) => ({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 60,
    paddingHorizontal: space.md,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  pressed: { backgroundColor: colors.primarySoft },
  menu: {
    position: 'absolute',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: space.xs,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: TOUCH, paddingHorizontal: space.md },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: space.xs },
}));
