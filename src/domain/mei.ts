import { getMonth, getYear, startOfMonth, startOfYear } from 'date-fns';

import { fromISODate, toISODate, type ISODate } from './dates';
import type { Cents } from './money';

/**
 * Teto anual do MEI Caminhoneiro — Transportador Autônomo de Cargas (LC 188/2021).
 * O Rodata é feito para esse público, então o teto é único. Se a lei mudar, basta
 * atualizar este valor numa nova versão do app.
 */
export const MEI_ANNUAL_LIMIT: Cents = 251_600_00;

/** Faixas do termômetro. */
export type MeiLevel = 'ok' | 'attention' | 'warning' | 'reached' | 'over_tolerance' | 'over_20';

export type MeiStatus = {
  year: number;
  /** Teto do ano (proporcional se o MEI foi aberto neste ano). */
  limit: Cents;
  isProportional: boolean;
  /** Meses de atividade considerados no ano (12, ou menos no ano de abertura). */
  activeMonths: number;
  /** Faturamento bruto acumulado no ano = receita total (não a faturada!). */
  used: Cents;
  ratio: number;
  remaining: Cents;
  /** Meses que ainda faltam no ano, contando o atual. */
  monthsLeft: number;
  /** Quanto pode faturar por mês, em média, até dezembro sem passar do teto. */
  maxMonthlyAverage: Cents;
  level: MeiLevel;
};

/**
 * No ano de abertura o teto é proporcional: teto ÷ 12 × meses de atividade,
 * contando o mês de abertura como mês inteiro. Nos anos seguintes, teto cheio.
 */
export function limitForYear(
  year: number,
  meiOpenedAt?: ISODate | null,
  annualLimit: Cents = MEI_ANNUAL_LIMIT,
): { limit: Cents; isProportional: boolean; activeMonths: number } {
  if (!meiOpenedAt) return { limit: annualLimit, isProportional: false, activeMonths: 12 };
  const opened = fromISODate(meiOpenedAt);
  if (getYear(opened) !== year) return { limit: annualLimit, isProportional: false, activeMonths: 12 };
  const months = 12 - getMonth(opened);
  return { limit: Math.round((annualLimit / 12) * months), isProportional: months < 12, activeMonths: months };
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
  meiOpenedAt?: ISODate | null;
  usedThisYear: Cents;
  today?: Date;
}): MeiStatus {
  const today = input.today ?? new Date();
  const year = getYear(today);
  const { limit, isProportional, activeMonths } = limitForYear(year, input.meiOpenedAt);
  const used = Math.max(0, input.usedThisYear);
  const remaining = Math.max(0, limit - used);
  const monthsLeft = 12 - getMonth(today);
  const ratio = limit > 0 ? used / limit : 0;
  return {
    year,
    limit,
    isProportional,
    activeMonths,
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

/** Mês em que o acumulado projetado passa do teto, ou null. */
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

/**
 * Limite mensal = teto anual ÷ 12 (R$ 20.966,67). Sai sempre do teto anual: mudou o teto,
 * mudou o mensal. A lei cobra o limite por ano; o valor mensal é a referência para não
 * estourar o ano (e a base do teto proporcional no ano de abertura — LC 123, art. 18-F).
 */
export function monthlyLimit(annualLimit: Cents = MEI_ANNUAL_LIMIT): Cents {
  return Math.round(annualLimit / 12);
}

export type MeiMonthLevel = 'ok' | 'attention' | 'warning' | 'reached' | 'over';

export type MeiMonthStatus = {
  year: number;
  /** 1º dia do mês atual. */
  month: ISODate;
  limit: Cents;
  used: Cents;
  ratio: number;
  remaining: Cents;
  level: MeiMonthLevel;
  /** Meses deste ano (incluindo o atual) acima do limite mensal, do mais antigo ao mais novo. */
  overMonths: { bucket: ISODate; revenue: Cents }[];
};

export function computeMeiMonthStatus(input: {
  /** receita total por mês; meses de outros anos ou anteriores ao MEI são ignorados */
  months: { bucket: ISODate; revenue: Cents }[];
  meiOpenedAt?: ISODate | null;
  today?: Date;
  annualLimit?: Cents;
}): MeiMonthStatus {
  const today = input.today ?? new Date();
  const month = toISODate(startOfMonth(today));
  const yearStart = toISODate(startOfYear(today));
  const opened = input.meiOpenedAt ?? '';
  const limit = monthlyLimit(input.annualLimit);
  const used = Math.max(0, input.months.find((m) => m.bucket === month)?.revenue ?? 0);
  const ratio = limit > 0 ? used / limit : 0;
  const level = meiLevel(ratio);
  return {
    year: getYear(today),
    month,
    limit,
    used,
    ratio,
    remaining: Math.max(0, limit - used),
    level: level === 'over_tolerance' || level === 'over_20' ? 'over' : level,
    overMonths: input.months
      .filter((m) => m.bucket >= yearStart && m.bucket >= opened && m.bucket <= month && m.revenue > limit)
      .map(({ bucket, revenue }) => ({ bucket, revenue })),
  };
}

/** Mensagem do mês. Passar num mês só não tira do MEI; repetir é o que estoura o ano. */
export function meiMonthMessage(s: MeiMonthStatus): string {
  const times = s.overMonths.length;
  if (times >= 2) {
    return `Você passou do limite mensal em ${times} meses deste ano. Se continuar assim, pode estourar o limite do ano e sair do MEI.`;
  }
  switch (s.level) {
    case 'ok':
      return 'Tudo certo: você está bem abaixo do limite deste mês.';
    case 'attention':
      return 'Atenção: você já usou mais de 70% do limite deste mês.';
    case 'warning':
      return 'Cuidado: falta pouco para atingir o limite deste mês.';
    case 'reached':
      return 'Você atingiu o limite deste mês.';
    case 'over':
      return 'Você passou do limite deste mês. Tente compensar nos próximos para não estourar o ano.';
  }
}
