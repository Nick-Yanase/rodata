import { describe, expect, it } from 'vitest';

import { formatVariation, margin, parseTotals, tripNet, variation } from '../metrics';

describe('métricas', () => {
  it('receita faturada = frete − custos', () => {
    expect(tripNet({ freight_cents: 60000, cost_cents: 20000 })).toBe(40000);
    expect(tripNet({ freight_cents: 10000, cost_cents: 20000 })).toBe(-10000);
  });

  it('variação % sem divisão por zero (RN-03)', () => {
    expect(variation(114.9, 100)).toBeCloseTo(0.149);
    expect(variation(0, 0)).toBe(0);
    expect(variation(100, 0)).toBeNull();
    expect(variation(-50, -100)).toBeCloseTo(0.5);
    expect(formatVariation(0.149)).toBe('+14,9%');
    expect(formatVariation(-0.019)).toBe('−1,9%');
    expect(formatVariation(null)).toBe('—');
  });

  it('margem', () => {
    expect(margin({ net: 40000, revenue: 60000 })).toBeCloseTo(0.6667, 3);
    expect(margin({ net: 0, revenue: 0 })).toBeNull();
  });

  it('normaliza totais vindos do banco', () => {
    const t = parseTotals({ revenue: '140000', cost: 40000, net: '100000', trips: 2 });
    expect(t.revenue).toBe(140000);
    expect(t.net).toBe(100000);
    expect(t.fuel).toBe(0);
  });
});
