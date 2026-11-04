import { describe, expect, it } from 'vitest';

import { computeMeiStatus, limitForYear, meiLevel, monthLimitReached } from '../mei';

describe('MEI', () => {
  it('usa o limite do MEI caminhoneiro por padrão do regime', () => {
    const s = computeMeiStatus({ regime: 'mei_tac', usedThisYear: 125_800_00, today: new Date(2026, 5, 15) });
    expect(s.limit).toBe(251_600_00);
    expect(s.ratio).toBeCloseTo(0.5);
    expect(s.remaining).toBe(125_800_00);
    expect(s.monthsLeft).toBe(7); // jun..dez
    expect(s.maxMonthlyAverage).toBe(Math.floor(125_800_00 / 7));
    expect(s.level).toBe('ok');
  });

  it('limite personalizado tem prioridade', () => {
    expect(computeMeiStatus({ regime: 'mei', customLimit: 130_000_00, usedThisYear: 0 }).limit).toBe(130_000_00);
  });

  it('limite proporcional no ano de abertura', () => {
    // aberto em agosto: ago..dez = 5 meses
    expect(limitForYear(81_000_00, 2026, '2026-08-20')).toEqual({ limit: 33_750_00, isProportional: true });
    expect(limitForYear(81_000_00, 2026, '2025-08-20')).toEqual({ limit: 81_000_00, isProportional: false });
    expect(limitForYear(81_000_00, 2026, '2026-01-10').isProportional).toBe(false);
  });

  it('faixas de alerta, incluindo a tolerância de 20%', () => {
    expect(meiLevel(0.5)).toBe('ok');
    expect(meiLevel(0.7)).toBe('attention');
    expect(meiLevel(0.95)).toBe('warning');
    expect(meiLevel(1)).toBe('reached');
    expect(meiLevel(1.1)).toBe('over_tolerance');
    expect(meiLevel(1.21)).toBe('over_20');
  });

  it('acima do limite não tem saldo negativo', () => {
    const s = computeMeiStatus({ regime: 'mei', usedThisYear: 90_000_00, today: new Date(2026, 11, 1) });
    expect(s.remaining).toBe(0);
    expect(s.maxMonthlyAverage).toBe(0);
    expect(s.level).toBe('over_tolerance');
  });

  it('mês em que o limite é atingido', () => {
    const months = [
      { month: '2026-01-01', revenue: 40_000_00 },
      { month: '2026-02-01', revenue: 40_000_00 },
      { month: '2026-03-01', revenue: 40_000_00 },
    ];
    expect(monthLimitReached(81_000_00, months)).toBe('2026-03-01');
    expect(monthLimitReached(251_600_00, months)).toBeNull();
  });
});
