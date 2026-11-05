import { describe, expect, it } from 'vitest';

import { computeMeiStatus, limitForYear, MEI_ANNUAL_LIMIT, meiLevel, monthLimitReached } from '../mei';

describe('MEI Caminhoneiro', () => {
  it('teto anual de R$ 251.600', () => {
    const s = computeMeiStatus({ usedThisYear: 125_800_00, today: new Date(2026, 5, 15) });
    expect(MEI_ANNUAL_LIMIT).toBe(251_600_00);
    expect(s.limit).toBe(251_600_00);
    expect(s.ratio).toBeCloseTo(0.5);
    expect(s.remaining).toBe(125_800_00);
    expect(s.monthsLeft).toBe(7); // jun..dez
    expect(s.maxMonthlyAverage).toBe(Math.floor(125_800_00 / 7));
    expect(s.level).toBe('ok');
  });

  it('teto proporcional no ano de abertura (mês de abertura conta inteiro)', () => {
    // aberto em agosto: ago..dez = 5 meses → 251.600 ÷ 12 × 5
    expect(limitForYear(2026, '2026-08-01')).toEqual({ limit: 104_833_33, isProportional: true, activeMonths: 5 });
    // aberto em janeiro: ano inteiro
    expect(limitForYear(2026, '2026-01-01')).toEqual({ limit: 251_600_00, isProportional: false, activeMonths: 12 });
    // aberto em ano anterior ou sem data: teto cheio
    expect(limitForYear(2026, '2025-08-01').limit).toBe(251_600_00);
    expect(limitForYear(2026, null).limit).toBe(251_600_00);
  });

  it('o mesmo faturamento pesa muito mais no ano de abertura', () => {
    const today = new Date(2026, 10, 4);
    const opened = computeMeiStatus({ meiOpenedAt: '2026-08-01', usedThisYear: 100_000_00, today });
    const veteran = computeMeiStatus({ meiOpenedAt: '2020-03-01', usedThisYear: 100_000_00, today });
    expect(opened.level).toBe('warning');
    expect(veteran.level).toBe('ok');
  });

  it('faixas de alerta, incluindo a tolerância de 20%', () => {
    expect(meiLevel(0.5)).toBe('ok');
    expect(meiLevel(0.7)).toBe('attention');
    expect(meiLevel(0.95)).toBe('warning');
    expect(meiLevel(1)).toBe('reached');
    expect(meiLevel(1.1)).toBe('over_tolerance');
    expect(meiLevel(1.21)).toBe('over_20');
  });

  it('acima do teto não tem saldo negativo', () => {
    const s = computeMeiStatus({ usedThisYear: 280_000_00, today: new Date(2026, 11, 1) });
    expect(s.remaining).toBe(0);
    expect(s.maxMonthlyAverage).toBe(0);
    expect(s.level).toBe('over_tolerance');
  });

  it('mês em que o teto é atingido', () => {
    const months = [
      { month: '2026-01-01', revenue: 100_000_00 },
      { month: '2026-02-01', revenue: 100_000_00 },
      { month: '2026-03-01', revenue: 100_000_00 },
    ];
    expect(monthLimitReached(MEI_ANNUAL_LIMIT, months)).toBe('2026-03-01');
    expect(monthLimitReached(MEI_ANNUAL_LIMIT, months.slice(0, 2))).toBeNull();
  });
});
