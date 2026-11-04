import { useQuery } from '@tanstack/react-query';
import { endOfMonth, getYear, startOfMonth, startOfYear, subMonths } from 'date-fns';

import { toISODate, type Grain, type Period } from '@/domain/dates';
import { parseTotals, type PeriodTotals } from '@/domain/metrics';
import { supabase } from '@/lib/supabase';

export type Summary = { current: PeriodTotals; previous: PeriodTotals };

/** Topo do dashboard: uma chamada só (RNF-21). */
export function useSummary(driverId: string | null, current: Period, previous: Period) {
  return useQuery({
    queryKey: ['dashboard', 'summary', driverId, current, previous],
    enabled: Boolean(driverId),
    placeholderData: (prev) => prev,
    queryFn: async (): Promise<Summary> => {
      const { data, error } = await supabase.rpc('dashboard_summary', {
        p_driver: driverId!,
        p_start: current.start,
        p_end: current.end,
        p_cmp_start: previous.start,
        p_cmp_end: previous.end,
      });
      if (error) throw error;
      return { current: parseTotals(data?.current), previous: parseTotals(data?.previous) };
    },
  });
}

export type TimelinePoint = { bucket: string; revenue: number; cost: number };

async function fetchTimeline(driverId: string, p: Period, grain: Grain): Promise<TimelinePoint[]> {
  const { data, error } = await supabase.rpc('timeline', {
    p_driver: driverId,
    p_start: p.start,
    p_end: p.end,
    p_grain: grain,
  });
  if (error) throw error;
  return (data ?? []).map((r) => ({ bucket: r.bucket, revenue: Number(r.revenue), cost: Number(r.cost) }));
}

export function useTimeline(driverId: string | null, p: Period, grain: Grain) {
  return useQuery({
    queryKey: ['dashboard', 'timeline', driverId, p, grain],
    enabled: Boolean(driverId),
    placeholderData: (prev) => prev,
    queryFn: () => fetchTimeline(driverId!, p, grain),
  });
}

/**
 * Histórico mensal dos últimos 36 meses até o mês corrente — base da previsão e do
 * termômetro do MEI.
 */
export function useMonthlyHistory(driverId: string | null, today = new Date()) {
  const end = toISODate(endOfMonth(today));
  const start = toISODate(startOfMonth(subMonths(today, 35)));
  return useQuery({
    queryKey: ['dashboard', 'monthly', driverId, end],
    enabled: Boolean(driverId),
    queryFn: async () => {
      const months = await fetchTimeline(driverId!, { start, end }, 'month');
      // descarta os meses antes do primeiro lançamento (não são "zero", são "sem dados")
      const first = months.findIndex((m) => m.revenue > 0 || m.cost > 0);
      const history = first < 0 ? [] : months.slice(first);
      const yearStart = toISODate(startOfYear(today));
      const thisYear = history.filter((m) => m.bucket >= yearStart);
      return {
        /** meses completos (sem o mês corrente) */
        completed: history.slice(0, -1),
        current: history.at(-1) ?? { bucket: toISODate(startOfMonth(today)), revenue: 0, cost: 0 },
        year: getYear(today),
        revenueThisYear: thisYear.reduce((a, m) => a + m.revenue, 0),
        costThisYear: thisYear.reduce((a, m) => a + m.cost, 0),
      };
    },
  });
}
