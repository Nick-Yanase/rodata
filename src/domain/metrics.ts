import type { Cents } from './money';

export type CostCategory = 'fuel' | 'toll' | 'food' | 'maintenance' | 'other';

export const COST_CATEGORIES: { id: CostCategory; label: string }[] = [
  { id: 'fuel', label: 'Combustível' },
  { id: 'toll', label: 'Pedágio' },
  { id: 'food', label: 'Comida' },
  { id: 'maintenance', label: 'Manutenção' },
  { id: 'other', label: 'Outros' },
];

/** Totais de um período, como devolvidos pela função `period_totals` do banco. */
export type PeriodTotals = {
  trips: number;
  /** Receita total = soma dos fretes. */
  revenue: Cents;
  /** Custo = soma de todas as categorias. */
  cost: Cents;
  /** Receita faturada = receita total − custo. */
  net: Cents;
  km: number;
} & Record<CostCategory, Cents>;

export const EMPTY_TOTALS: PeriodTotals = {
  trips: 0,
  revenue: 0,
  cost: 0,
  net: 0,
  km: 0,
  fuel: 0,
  toll: 0,
  food: 0,
  maintenance: 0,
  other: 0,
};

/** O banco devolve somas como texto/numeric em JSON: normaliza para number. */
export function parseTotals(raw: unknown): PeriodTotals {
  const src = (raw ?? {}) as Record<string, unknown>;
  const out = { ...EMPTY_TOTALS };
  for (const key of Object.keys(out) as (keyof PeriodTotals)[]) {
    const n = Number(src[key] ?? 0);
    out[key] = Number.isFinite(n) ? n : 0;
  }
  return out;
}

/** Receita faturada de uma viagem (frete − custos). */
export function tripNet(t: { freight_cents: Cents; cost_cents: Cents }): Cents {
  return t.freight_cents - t.cost_cents;
}

/**
 * Variação percentual (RN-03). Retorna null quando não há base de comparação,
 * para a tela mostrar "—" em vez de infinito.
 */
export function variation(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / Math.abs(previous);
}

/** Margem = receita faturada ÷ receita total. */
export function margin(t: Pick<PeriodTotals, 'net' | 'revenue'>): number | null {
  return t.revenue > 0 ? t.net / t.revenue : null;
}

const pct = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 });

/** 0.149 → "+14,9%"; null → "—" */
export function formatVariation(v: number | null): string {
  if (v === null) return '—';
  const s = pct.format(Math.abs(v)).replace(/ /g, '');
  if (v > 0) return `+${s}`;
  if (v < 0) return `−${s}`;
  return s;
}

export function formatPercent(v: number | null): string {
  return v === null ? '—' : pct.format(v).replace(/ /g, '');
}
