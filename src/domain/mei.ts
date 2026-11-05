import { getMonth, getYear } from 'date-fns';

import { fromISODate, type ISODate } from './dates';
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
