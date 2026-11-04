/**
 * Previsão mensal simples e explicável (RF-45, RN-04).
 *
 * - menos de 3 meses de histórico → sem previsão;
 * - de 3 a 23 meses → suavização exponencial de Holt (nível + tendência);
 * - 24 meses ou mais → Holt-Winters aditivo com sazonalidade anual.
 *
 * A faixa (pessimista/otimista) é o intervalo de ~80% calculado a partir do erro
 * das previsões de um passo dentro do próprio histórico.
 */

export type ForecastPoint = { value: number; low: number; high: number };

export type ForecastMethod = 'holt' | 'holt_winters';

export type Forecast = { method: ForecastMethod; points: ForecastPoint[] };

export const MIN_MONTHS_FOR_FORECAST = 3;
const SEASON = 12;
const Z80 = 1.2816;

function rmse(errors: number[]): number {
  if (!errors.length) return 0;
  return Math.sqrt(errors.reduce((a, e) => a + e * e, 0) / errors.length);
}

function holt(series: number[], horizon: number, alpha = 0.5, beta = 0.3) {
  let level = series[0];
  let trend = series[1] - series[0];
  const errors: number[] = [];
  for (let t = 1; t < series.length; t++) {
    const predicted = level + trend;
    errors.push(series[t] - predicted);
    const prevLevel = level;
    level = alpha * series[t] + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }
  // Amortece a tendência para não extrapolar demais com poucos dados.
  const phi = 0.8;
  const values: number[] = [];
  let damp = 0;
  for (let h = 1; h <= horizon; h++) {
    damp += phi ** h;
    values.push(level + damp * trend);
  }
  return { values, errors };
}

function holtWinters(series: number[], horizon: number, alpha = 0.4, beta = 0.1, gamma = 0.3) {
  const m = SEASON;
  const mean1 = series.slice(0, m).reduce((a, b) => a + b, 0) / m;
  const mean2 = series.slice(m, 2 * m).reduce((a, b) => a + b, 0) / m;
  let level = mean1;
  let trend = (mean2 - mean1) / m;
  const season = series.slice(0, m).map((v) => v - mean1);
  const errors: number[] = [];
  for (let t = m; t < series.length; t++) {
    const s = season[t % m];
    const predicted = level + trend + s;
    errors.push(series[t] - predicted);
    const prevLevel = level;
    level = alpha * (series[t] - s) + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
    season[t % m] = gamma * (series[t] - level) + (1 - gamma) * s;
  }
  const n = series.length;
  const values: number[] = [];
  for (let h = 1; h <= horizon; h++) {
    values.push(level + h * trend + season[(n + h - 1) % m]);
  }
  return { values, errors };
}

/**
 * @param series valores mensais de meses **completos**, do mais antigo para o mais recente
 * @param horizon quantos meses prever
 */
export function forecastMonthly(series: number[], horizon: number): Forecast | null {
  if (series.length < MIN_MONTHS_FOR_FORECAST || horizon < 1) return null;
  const method: ForecastMethod = series.length >= 2 * SEASON ? 'holt_winters' : 'holt';
  const { values, errors } =
    method === 'holt_winters' ? holtWinters(series, horizon) : holt(series, horizon);
  const sigma = rmse(errors);
  return {
    method,
    points: values.map((v, i) => {
      const spread = Z80 * sigma * Math.sqrt(i + 1);
      const value = Math.max(0, Math.round(v));
      return {
        value,
        low: Math.max(0, Math.round(v - spread)),
        high: Math.max(value, Math.round(v + spread)),
      };
    }),
  };
}

/**
 * Projeção de fechamento do ano.
 * @param actualThisYear soma já realizada no ano (inclui o mês corrente parcial)
 * @param currentMonthActual realizado no mês corrente até hoje
 * @param forecast previsão começando no mês corrente
 * @param monthsLeft meses restantes contando o corrente
 */
export function projectYearEnd(
  actualThisYear: number,
  currentMonthActual: number,
  forecast: ForecastPoint[],
  monthsLeft: number,
): ForecastPoint {
  const acc = { value: actualThisYear, low: actualThisYear, high: actualThisYear };
  for (let i = 0; i < monthsLeft && i < forecast.length; i++) {
    const p = forecast[i];
    if (i === 0) {
      // mês corrente: o que falta para atingir a previsão (nunca negativo)
      acc.value += Math.max(0, p.value - currentMonthActual);
      acc.low += Math.max(0, p.low - currentMonthActual);
      acc.high += Math.max(0, p.high - currentMonthActual);
    } else {
      acc.value += p.value;
      acc.low += p.low;
      acc.high += p.high;
    }
  }
  return acc;
}
