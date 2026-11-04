import { describe, expect, it } from 'vitest';

import { forecastMonthly, projectYearEnd } from '../forecast';

describe('previsão', () => {
  it('não prevê com menos de 3 meses (RN-04)', () => {
    expect(forecastMonthly([100, 200], 3)).toBeNull();
  });

  it('série constante prevê o mesmo valor com faixa estreita', () => {
    const f = forecastMonthly([1000, 1000, 1000, 1000, 1000], 3)!;
    expect(f.method).toBe('holt');
    for (const p of f.points) {
      expect(p.value).toBe(1000);
      expect(p.low).toBe(1000);
      expect(p.high).toBe(1000);
    }
  });

  it('série crescente prevê crescimento (amortecido) e faixa cresce com o horizonte', () => {
    const f = forecastMonthly([1000, 1100, 1200, 1300, 1400, 1500], 3)!;
    expect(f.points[0].value).toBeGreaterThan(1500);
    expect(f.points[2].value).toBeGreaterThan(f.points[0].value);
    expect(f.points[2].value).toBeLessThan(1500 + 3 * 100 + 1);
    expect(f.points[2].high - f.points[2].low).toBeGreaterThanOrEqual(f.points[0].high - f.points[0].low);
  });

  it('com 24+ meses usa sazonalidade', () => {
    const season = [5, 5, 6, 8, 10, 12, 12, 10, 8, 6, 5, 4].map((v) => v * 1000);
    const series = [...season, ...season];
    const f = forecastMonthly(series, 12)!;
    expect(f.method).toBe('holt_winters');
    // pico em jun/jul deve ser maior que dezembro
    expect(f.points[5].value).toBeGreaterThan(f.points[11].value);
  });

  it('nunca prevê valor negativo', () => {
    const f = forecastMonthly([3000, 2000, 1000, 0], 6)!;
    for (const p of f.points) expect(p.low).toBeGreaterThanOrEqual(0);
  });

  it('projeção de fechamento do ano', () => {
    const forecast = [
      { value: 1000, low: 800, high: 1200 },
      { value: 1000, low: 800, high: 1200 },
    ];
    // já faturou 10.000 no ano, 400 no mês corrente; faltam 2 meses (corrente + 1)
    expect(projectYearEnd(10000, 400, forecast, 2)).toEqual({ value: 11600, low: 11200, high: 12000 });
    // mês corrente já passou da previsão: não soma nada a mais
    expect(projectYearEnd(10000, 1500, forecast, 2).value).toBe(11000);
  });
});
