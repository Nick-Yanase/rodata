import { getMonth, getYear } from 'date-fns';

import { fromISODate, type ISODate } from './dates';
import type { Cents } from './money';

export type Regime = 'mei' | 'mei_tac' | 'me' | 'other';

export const REGIMES: { id: Regime; label: string; hint: string }[] = [
  {
    id: 'mei_tac',
    label: 'MEI Caminhoneiro',
    hint: 'Transportador Autônomo de Cargas — limite de R$ 251.600 por ano',
  },
  { id: 'mei', label: 'MEI comum', hint: 'Limite de R$ 81.000 por ano' },
  { id: 'me', label: 'Microempresa (ME)', hint: 'Limite de R$ 360.000 por ano' },
  { id: 'other', label: 'Outro', hint: 'Informe o limite que quer acompanhar' },
];

/**
 * Limites anuais padrão (RN-01). Configuráveis pelo usuário porque a lei muda.
 * MEI caminhoneiro: LC 188/2021. MEI comum: LC 123/2006.
 */
export const DEFAULT_ANNUAL_LIMIT: Record<Regime, Cents> = {
  mei_tac: 251_600_00,
  mei: 81_000_00,
  me: 360_000_00,
  other: 81_000_00,
};

/** Faixas do termômetro. */
export type MeiLevel = 'ok' | 'attention' | 'warning' | 'reached' | 'over_tolerance' | 'over_20';

export type MeiStatus = {
  year: number;
  /** Limite do ano (proporcional se o CNPJ foi aberto neste ano). */
  limit: Cents;
  isProportional: boolean;
  /** Faturamento bruto acumulado no ano = receita total (não a faturada!). */
  used: Cents;
  ratio: number;
  remaining: Cents;
  /** Meses que ainda faltam no ano, contando o atual. */
  monthsLeft: number;
  /** Quanto pode faturar por mês, em média, até dezembro sem passar do limite. */
  maxMonthlyAverage: Cents;
  level: MeiLevel;
};

export function annualLimit(regime: Regime, customLimit?: Cents | null): Cents {
  return customLimit && customLimit > 0 ? customLimit : DEFAULT_ANNUAL_LIMIT[regime];
}

/**
 * No ano de abertura o limite é proporcional: limite ÷ 12 × meses de atividade,
 * contando o mês de abertura como mês inteiro.
 */
export function limitForYear(
  baseLimit: Cents,
  year: number,
  cnpjOpenedAt?: ISODate | null,
): { limit: Cents; isProportional: boolean } {
  if (!cnpjOpenedAt) return { limit: baseLimit, isProportional: false };
  const opened = fromISODate(cnpjOpenedAt);
  if (getYear(opened) !== year) return { limit: baseLimit, isProportional: false };
  const months = 12 - getMonth(opened);
  return { limit: Math.round((baseLimit / 12) * months), isProportional: months < 12 };
}

export function meiLevel(ratio: number): MeiLevel {
  if (ratio > 1.2) return 'over_20';
  if (ratio > 1) return 'over_tolerance';
  if (ratio === 1) return 'reached';
  if (ratio >= 0.9) return 'warning';
  if (ratio >= 0.7) return 'attention';
  return 'ok';
}

export function computeMeiStatus(input: {
  regime: Regime;
  customLimit?: Cents | null;
  cnpjOpenedAt?: ISODate | null;
  usedThisYear: Cents;
  today?: Date;
}): MeiStatus {
  const today = input.today ?? new Date();
  const year = getYear(today);
  const { limit, isProportional } = limitForYear(
    annualLimit(input.regime, input.customLimit),
    year,
    input.cnpjOpenedAt,
  );
  const used = Math.max(0, input.usedThisYear);
  const remaining = Math.max(0, limit - used);
  const monthsLeft = 12 - getMonth(today);
  const ratio = limit > 0 ? used / limit : 0;
  return {
    year,
    limit,
    isProportional,
    used,
    ratio,
    remaining,
    monthsLeft,
    maxMonthlyAverage: Math.floor(remaining / monthsLeft),
    level: meiLevel(ratio),
  };
}

/** Mensagem curta e sem jargão para cada faixa (RNF-06). */
export function meiMessage(s: MeiStatus): string {
  switch (s.level) {
    case 'ok':
      return 'Tudo certo: você está bem abaixo do limite.';
    case 'attention':
      return 'Atenção: você já usou mais de 70% do limite do ano.';
    case 'warning':
      return 'Cuidado: falta pouco para atingir o limite do ano.';
    case 'reached':
      return 'Você atingiu o limite do ano.';
    case 'over_tolerance':
      return 'Passou do limite (até 20%): você sai do MEI a partir do ano que vem. Fale com seu contador.';
    case 'over_20':
      return 'Passou mais de 20% do limite: o desenquadramento volta a janeiro e pode gerar impostos atrasados. Fale com seu contador agora.';
  }
}

/** Mês (1–12) em que o acumulado projetado passa do limite, ou null. */
export function monthLimitReached(
  limit: Cents,
  monthlyRevenue: { month: ISODate; revenue: Cents }[],
): ISODate | null {
  let acc = 0;
  for (const m of monthlyRevenue) {
    acc += m.revenue;
    if (acc > limit) return m.month;
  }
  return null;
}
