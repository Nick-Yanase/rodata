/**
 * Tokens do design (Figma trip_dash). Cores ajustadas para contraste WCAG AA (RNF-03):
 * o laranja da marca (#EE5728) tem contraste 3,5:1 com branco, então botões e textos
 * laranja usam `primaryStrong` (4,9:1).
 *
 * As duas paletas têm as mesmas chaves; as telas leem a ativa com useTheme()
 * (src/theme/theme.tsx). Nunca importe cores diretamente nos componentes.
 */
export const lightColors = {
  primary: '#EE5728',
  primaryStrong: '#C9411A',
  primarySoft: '#FDE9E1',
  /** texto/ícone sobre fundo primaryStrong */
  onPrimary: '#FFFFFF',
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
  chartRange: '#A5D8E3',
  track: '#E4E4E7',
  overlay: 'rgba(0,0,0,0.4)',
  toast: '#27272A',
};

export type Palette = { [K in keyof typeof lightColors]: string };

/** Modo escuro: fundos quase pretos, textos claros, cores de destaque mais vivas (contraste AA). */
export const darkColors: Palette = {
  primary: '#F26B3F',
  primaryStrong: '#E4602F',
  primarySoft: '#3A231A',
  onPrimary: '#FFFFFF',
  text: '#F4F4F5',
  textMuted: '#B4B4BC',
  textSubtle: '#8E8E98',
  border: '#3F3F46',
  borderStrong: '#71717A',
  surface: '#232326',
  background: '#18181B',
  positive: '#4ADE80',
  positiveSoft: '#123321',
  negative: '#F87171',
  negativeSoft: '#3B1717',
  warning: '#FACC15',
  warningSoft: '#3A3010',
  chartRevenue: '#22D3EE',
  chartCost: '#FB7185',
  chartNet: '#4ADE80',
  chartRange: '#155E75',
  track: '#3F3F46',
  overlay: 'rgba(0,0,0,0.6)',
  toast: '#3F3F46',
};

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
