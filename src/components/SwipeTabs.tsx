import type { ReactElement } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';

import { swipeLock } from '@/lib/swipeLock';

/** Ordem das abas na barra inferior. */
export const TAB_ORDER = ['index', 'viagens', 'anotacoes', 'perfil'] as const;

// Na web, só com toque (no computador, arrastar o mouse serve para selecionar texto).
const enabled = Platform.OS !== 'web' || (typeof window !== 'undefined' && 'ontouchstart' in window);

/** Distância (pt) ou velocidade (pt/s) mínimas para valer como "deslizar". */
const MIN_DISTANCE = 80;
const MIN_VELOCITY = 600;

type Props = {
  routeName: string;
  onNavigate: (routeName: string) => void;
  children: ReactElement;
};

/**
 * Envolve cada aba: deslizar para a esquerda vai para a próxima aba, para a direita
 * volta para a anterior. Movimentos mais verticais que horizontais são ignorados
 * (a tela continua rolando normalmente).
 */
export function SwipeTabs({ routeName, onNavigate, children }: Props) {
  const index = TAB_ORDER.indexOf(routeName as (typeof TAB_ORDER)[number]);
  const pan = usePanGesture({
    enabled: enabled && index >= 0,
    runOnJS: true,
    activeOffsetX: [-30, 30],
    failOffsetY: [-15, 15],
    onDeactivate: (e) => {
      if (e.canceled || swipeLock.isOn()) return;
      const far = Math.abs(e.translationX) > MIN_DISTANCE || Math.abs(e.velocityX) > MIN_VELOCITY;
      if (!far) return;
      const next = e.translationX < 0 ? index + 1 : index - 1;
      if (next >= 0 && next < TAB_ORDER.length) onNavigate(TAB_ORDER[next]);
    },
  });
  return (
    <GestureDetector gesture={pan}>
      <View style={styles.fill}>{children}</View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
