/**
 * Tokens do design (Figma trip_dash). Cores ajustadas para contraste WCAG AA (RNF-03):
 * o laranja da marca (#EE5728) tem contraste 3,5:1 com branco, então botões e textos
 * laranja usam `primaryStrong` (4,9:1).
 */
export const colors = {
  primary: '#EE5728',
  primaryStrong: '#C9411A',
  primarySoft: '#FDE9E1',
  text: '#27272A',
  textMuted: '#5F5F68',
  textSubtle: '#71717B',
  border: '#D4D4D8',
  borderStrong: '#9F9FA9',
  surface: '#FFFFFF',
  background: '#F7F7F8',
  positive: '#15803D',
  positiveSoft: '#DCFCE7',
  negative: '#C81E1E',
  negativeSoft: '#FEE2E2',
  warning: '#A16207',
  warningSoft: '#FEF3C7',
  chartRevenue: '#0E7490',
  chartCost: '#E11D48',
  chartNet: '#15803D',
  track: '#E4E4E7',
  overlay: 'rgba(0,0,0,0.4)',
} as const;

/** Tamanhos de fonte generosos para o público (RNF-01). */
export const font = {
  small: 15,
  body: 17,
  label: 16,
  input: 19,
  title: 21,
  money: 26,
  heading: 28,
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

/** Área mínima de toque (RNF-02). */
export const TOUCH = 48;

/** Largura máxima do conteúdo na web (dashboard do analista no computador). */
export const MAX_WIDTH = 1040;
