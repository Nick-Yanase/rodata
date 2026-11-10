import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Modal, Pressable, View, useWindowDimensions } from 'react-native';

import { makeStyles, useTheme } from '@/theme/theme';
import { radius, space, TOUCH } from '@/theme/tokens';

import { METRICS, type ChartMetric } from './TimelineChart';
import { AppText } from './ui';

type Props = {
  value: ChartMetric;
  options: ChartMetric[];
  onChange: (m: ChartMetric) => void;
};

const MENU_WIDTH = 240;

/**
 * "Sua receita total ▾": a métrica vira um seletor. Tocar abre uma lista logo
 * abaixo, com as outras métricas disponíveis.
 */
export function MetricSelect({ value, options, onChange }: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  const anchor = useRef<{ measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => void } | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const { width } = useWindowDimensions();
  const def = METRICS[value];

  function open() {
    anchor.current?.measureInWindow((x, y, _w, h) => {
      setMenu({ x: Math.min(x, width - MENU_WIDTH - space.lg), y: y + h + 4 });
    });
  }

  return (
    <>
      <Pressable
        ref={anchor as never}
        accessibilityRole="button"
        accessibilityLabel={`${def.article} ${def.label}. Toque para trocar.`}
        onPress={open}
        style={styles.trigger}>
        <AppText variant="label" color={colors.textMuted} weight="400">
          {def.article}{' '}
        </AppText>
        <AppText variant="label" color={colors[def.colorKey]} weight="700" style={styles.underline}>
          {def.label}
        </AppText>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>
      <Modal visible={menu !== null} transparent animationType="fade" onRequestClose={() => setMenu(null)}>
        <Pressable style={styles.backdrop} onPress={() => setMenu(null)} accessibilityLabel="Fechar">
          {menu ? (
            <View style={[styles.menu, { left: Math.max(space.lg, menu.x), top: menu.y }]} accessibilityRole="menu">
              {options.map((m) => {
                const d = METRICS[m];
                const selected = m === value;
                return (
                  <Pressable
                    key={m}
                    accessibilityRole="menuitem"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      setMenu(null);
                      onChange(m);
                    }}
                    style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
                    <View style={[styles.dot, { backgroundColor: colors[d.colorKey] }]} />
                    <AppText style={{ flex: 1 }}>{d.label.charAt(0).toUpperCase() + d.label.slice(1)}</AppText>
                    {selected ? <Ionicons name="checkmark" size={20} color={colors.primaryStrong} /> : null}
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </Pressable>
      </Modal>
    </>
  );
}

const useStyles = makeStyles((colors) => ({
  trigger: { flexDirection: 'row', alignItems: 'center', minHeight: TOUCH - 8, gap: 2 },
  underline: {
    textDecorationLine: 'underline',
    textDecorationStyle: 'dashed',
    textDecorationColor: colors.borderStrong,
  },
  backdrop: { flex: 1 },
  menu: {
    position: 'absolute',
    width: MENU_WIDTH,
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
  pressed: { backgroundColor: colors.primarySoft },
  dot: { width: 12, height: 12, borderRadius: 6 },
}));
