import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  endOfYear,
  format,
  parseISO,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
  subYears,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

/** Data "de calendário" no formato ISO (AAAA-MM-DD), sem fuso. */
export type ISODate = string;

export function toISODate(d: Date): ISODate {
  return format(d, 'yyyy-MM-dd');
}

export function fromISODate(s: ISODate): Date {
  return parseISO(s);
}

/** "2026-01-31" → "31/01/2026" */
export function formatDateBR(s: ISODate): string {
  return format(fromISODate(s), 'dd/MM/yyyy');
}

/** "2026-01-01" → "jan/26" */
export function formatMonthShort(s: ISODate): string {
  return format(fromISODate(s), 'MMM/yy', { locale: ptBR });
}

/** "2026-01-01" → "janeiro de 2026" */
export function formatMonthLong(s: ISODate): string {
  return format(fromISODate(s), "MMMM 'de' yyyy", { locale: ptBR });
}

/** Converte "31/01/2026" → "2026-01-31"; devolve null se a data não existir. */
export function parseDateBR(text: string): ISODate | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text.trim());
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const iso = `${yyyy}-${mm}-${dd}`;
  const d = fromISODate(iso);
  if (Number.isNaN(d.getTime()) || toISODate(d) !== iso) return null;
  return iso;
}

/** Máscara de digitação "31012026" → "31/01/2026". */
export function maskDateBR(text: string): string {
  const d = text.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

export type Period = { start: ISODate; end: ISODate };

export type PeriodPreset = 'this_month' | 'last_month' | 'last_3_months' | 'this_year';

export const PERIOD_PRESETS: { id: PeriodPreset; label: string }[] = [
  { id: 'this_month', label: 'Este mês' },
  { id: 'last_month', label: 'Mês passado' },
  { id: 'last_3_months', label: 'Últimos 3 meses' },
  { id: 'this_year', label: 'Este ano' },
];

/**
 * Período analisado e período comparado para cada atalho.
 * Meses comparam com o mês anterior; "este ano" compara com o mesmo trecho do ano passado.
 */
export function resolvePreset(preset: PeriodPreset, today = new Date()): {
  current: Period;
  previous: Period;
} {
  switch (preset) {
    case 'this_month': {
      const start = startOfMonth(today);
      const prevStart = subMonths(start, 1);
      return {
        current: { start: toISODate(start), end: toISODate(endOfMonth(today)) },
        previous: { start: toISODate(prevStart), end: toISODate(endOfMonth(prevStart)) },
      };
    }
    case 'last_month': {
      const start = subMonths(startOfMonth(today), 1);
      const prevStart = subMonths(start, 1);
      return {
        current: { start: toISODate(start), end: toISODate(endOfMonth(start)) },
        previous: { start: toISODate(prevStart), end: toISODate(endOfMonth(prevStart)) },
      };
    }
    case 'last_3_months': {
      const start = subMonths(startOfMonth(today), 2);
      const prevStart = subMonths(start, 3);
      return {
        current: { start: toISODate(start), end: toISODate(endOfMonth(today)) },
        previous: { start: toISODate(prevStart), end: toISODate(subDays(start, 1)) },
      };
    }
    case 'this_year': {
      const start = startOfYear(today);
      const lastYear = subYears(today, 1);
      return {
        current: { start: toISODate(start), end: toISODate(endOfYear(today)) },
        previous: { start: toISODate(startOfYear(lastYear)), end: toISODate(endOfYear(lastYear)) },
      };
    }
  }
}

/** Um mês escolhido pelo usuário: compara com o mês anterior. */
export function resolveMonth(month: ISODate): { current: Period; previous: Period } {
  const start = startOfMonth(fromISODate(month));
  const prevStart = subMonths(start, 1);
  return {
    current: { start: toISODate(start), end: toISODate(endOfMonth(start)) },
    previous: { start: toISODate(prevStart), end: toISODate(endOfMonth(prevStart)) },
  };
}

export type Grain = 'day' | 'week' | 'month';

/** Granularidade padrão do gráfico conforme o tamanho do período. */
export function defaultGrain(p: Period): Grain {
  const days = differenceInCalendarDays(fromISODate(p.end), fromISODate(p.start)) + 1;
  if (days <= 31) return 'day';
  if (days <= 120) return 'week';
  return 'month';
}

export function isGrainAllowed(p: Period, grain: Grain): boolean {
  const days = differenceInCalendarDays(fromISODate(p.end), fromISODate(p.start)) + 1;
  return grain !== 'day' || days <= 400;
}

export { addDays, addMonths, startOfMonth, endOfMonth, subMonths };

/** Máscara de digitação de mês/ano: "082026" → "08/2026". */
export function maskMonthYear(text: string): string {
  const d = text.replace(/\D/g, '').slice(0, 6);
  return d.length <= 2 ? d : `${d.slice(0, 2)}/${d.slice(2)}`;
}

/** "08/2026" → "2026-08-01" (primeiro dia do mês); null se inválido. */
export function parseMonthYear(text: string): ISODate | null {
  const m = /^(\d{2})\/(\d{4})$/.exec(text.trim());
  if (!m) return null;
  const month = Number(m[1]);
  const year = Number(m[2]);
  if (month < 1 || month > 12 || year < 1990 || year > 2100) return null;
  return `${m[2]}-${m[1]}-01`;
}

/** "2026-08-01" → "08/2026" */
export function formatMonthYear(s: ISODate): string {
  return format(fromISODate(s), 'MM/yyyy');
}
