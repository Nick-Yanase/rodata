/**
 * Trava do gesto de deslizar entre abas. Componentes que também usam o arrasto
 * horizontal (gráfico com tooltip, carrossel) ligam a trava enquanto o dedo está
 * neles, para o arrasto não trocar de aba sem querer.
 */
let locked = false;

export const swipeLock = {
  on: () => {
    locked = true;
  },
  off: () => {
    locked = false;
  },
  isOn: () => locked,
};
