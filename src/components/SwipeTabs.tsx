import type { ReactElement } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { swipeLock } from '@/lib/swipeLock';

/** Ordem das abas na barra inferior. */
export const TAB_ORDER = ['index', 'viagens', 'anotacoes', 'perfil'] as const;

// Na web, só com toque (no computador, arrastar o mouse serve para selecionar texto).
const enabled = Platform.OS !== 'web' || (typeof window !== 'undefined' && 'ontouchstart' in window);

/** Distância (pt) ou velocidade (pt/s) mínimas para valer como "deslizar". */
const MIN_DISTANCE = 80;
const MIN_VELOCITY = 600;
/** quanto a tela acompanha o dedo (1 = colada no dedo) */
const FOLLOW = 0.5;
/** na primeira/última aba, a tela "resiste" mais (não há para onde ir) */
const EDGE_FOLLOW = 0.12;
/** volta com mola quando o arrasto não completa a troca */
const SPRING = { damping: 18, stiffness: 220, mass: 0.6 };

type Props = {
  routeName: string;
  onNavigate: (routeName: string) => void;
  children: ReactElement;
};

/**
 * Envolve cada aba: a tela acompanha o dedo enquanto arrasta para os lados e, ao
 * soltar, vai para a aba vizinha (a transição "shift" das abas completa o movimento)
 * ou volta para o lugar com efeito de mola. Movimentos mais verticais que
 * horizontais são ignorados (a tela continua rolando).
 */
export function SwipeTabs({ routeName, onNavigate, children }: Props) {
  const index = TAB_ORDER.indexOf(routeName as (typeof TAB_ORDER)[number]);
  const reduced = useReducedMotion();
  const tx = useSharedValue(0);

  const hasNeighbor = (dx: number) => {
    const next = dx < 0 ? index + 1 : index - 1;
    return next >= 0 && next < TAB_ORDER.length;
  };

  const pan = usePanGesture({
    enabled: enabled && index >= 0,
    runOnJS: true,
    activeOffsetX: [-30, 30],
    failOffsetY: [-15, 15],
    onUpdate: (e) => {
      if (reduced || swipeLock.isOn()) return;
      tx.set(e.translationX * (hasNeighbor(e.translationX) ? FOLLOW : EDGE_FOLLOW));
    },
    onDeactivate: (e) => {
      const far = Math.abs(e.translationX) > MIN_DISTANCE || Math.abs(e.velocityX) > MIN_VELOCITY;
      if (!e.canceled && !swipeLock.isOn() && far && hasNeighbor(e.translationX)) {
        onNavigate(TAB_ORDER[e.translationX < 0 ? index + 1 : index - 1]);
        // a tela que sai volta ao lugar escondida; a que entra faz o "shift"
        tx.set(0);
        return;
      }
      tx.set(withSpring(0, SPRING));
    },
    onFinalize: (e) => {
      if (e.canceled) tx.set(withSpring(0, SPRING));
    },
  });

  const follow = useAnimatedStyle(() => ({ transform: [{ translateX: tx.get() }] }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.fill, follow]}>{children}</Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
