import { describe, expect, it } from 'vitest';

import { defaultGrain, maskDateBR, parseDateBR, resolvePreset } from '../dates';

const today = new Date(2026, 10, 4); // 04/11/2026

describe('datas', () => {
  it('converte e valida dd/mm/aaaa', () => {
    expect(parseDateBR('31/01/2026')).toBe('2026-01-31');
    expect(parseDateBR('31/02/2026')).toBeNull();
    expect(parseDateBR('1/1/2026')).toBeNull();
    expect(maskDateBR('31012026')).toBe('31/01/2026');
    expect(maskDateBR('310')).toBe('31/0');
  });

  it('atalhos de período e período comparado', () => {
    expect(resolvePreset('this_month', today)).toEqual({
      current: { start: '2026-11-01', end: '2026-11-30' },
      previous: { start: '2026-10-01', end: '2026-10-31' },
    });
    expect(resolvePreset('last_month', today).current).toEqual({ start: '2026-10-01', end: '2026-10-31' });
    expect(resolvePreset('last_3_months', today)).toEqual({
      current: { start: '2026-09-01', end: '2026-11-30' },
      previous: { start: '2026-06-01', end: '2026-08-31' },
    });
    expect(resolvePreset('this_year', today).previous).toEqual({ start: '2025-01-01', end: '2025-12-31' });
  });

  it('granularidade padrão', () => {
    expect(defaultGrain({ start: '2026-11-01', end: '2026-11-30' })).toBe('day');
    expect(defaultGrain({ start: '2026-09-01', end: '2026-11-30' })).toBe('week');
    expect(defaultGrain({ start: '2026-01-01', end: '2026-12-31' })).toBe('month');
  });
});

describe('mês/ano', () => {
  it('máscara, validação e formatação', async () => {
    const { formatMonthYear, maskMonthYear, parseMonthYear } = await import('../dates');
    expect(maskMonthYear('082026')).toBe('08/2026');
    expect(maskMonthYear('08')).toBe('08');
    expect(parseMonthYear('08/2026')).toBe('2026-08-01');
    expect(parseMonthYear('13/2026')).toBeNull();
    expect(parseMonthYear('8/2026')).toBeNull();
    expect(formatMonthYear('2026-08-01')).toBe('08/2026');
  });
});
