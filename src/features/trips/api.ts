import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';

import type { TripInsert, TripRow } from '@/lib/database.types';
import { queryClient } from '@/lib/query';
import { supabase } from '@/lib/supabase';

export const PAGE_SIZE = 30;

export type TripSort = 'date_desc' | 'date_asc' | 'freight_desc';

export const tripKeys = {
  all: ['trips'] as const,
  list: (driverId: string, search: string, sort: TripSort) => ['trips', 'list', driverId, search, sort] as const,
  detail: (id: string) => ['trips', 'detail', id] as const,
  last: (driverId: string) => ['trips', 'last', driverId] as const,
};

/** Escapa curingas para usar a busca do usuário dentro de um ILIKE. */
function likePattern(search: string) {
  return `%${search.replace(/[%_\\,()]/g, ' ').trim()}%`;
}

export function useTrips(driverId: string | null, search: string, sort: TripSort) {
  return useInfiniteQuery({
    queryKey: tripKeys.list(driverId ?? '', search, sort),
    enabled: Boolean(driverId),
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      let q = supabase.from('trips').select('*').eq('driver_id', driverId!);
      if (search.trim()) {
        const p = likePattern(search);
        q = q.or(`title.ilike.${p},destination.ilike.${p},origin.ilike.${p}`);
      }
      q =
        sort === 'freight_desc'
          ? q.order('freight_cents', { ascending: false })
          : q.order('trip_date', { ascending: sort === 'date_asc' }).order('created_at', { ascending: sort === 'date_asc' });
      const { data, error } = await q.range(pageParam, pageParam + PAGE_SIZE - 1);
      if (error) throw error;
      return data;
    },
    getNextPageParam: (last, pages) =>
      last.length < PAGE_SIZE ? undefined : pages.reduce((n, p) => n + p.length, 0),
  });
}

export function useTrip(id: string | undefined) {
  return useQuery({
    queryKey: tripKeys.detail(id ?? ''),
    enabled: Boolean(id),
    initialData: () => (id ? findTripInCache(queryClient, id) : undefined),
    queryFn: async () => {
      const { data, error } = await supabase.from('trips').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

function findTripInCache(qc: QueryClient, id: string): TripRow | undefined {
  for (const [, data] of qc.getQueriesData<InfiniteData<TripRow[]>>({ queryKey: ['trips', 'list'] })) {
    const hit = data?.pages.flat().find((t) => t.id === id);
    if (hit) return hit;
  }
  return undefined;
}

/** Converte o formulário em linha completa (para a atualização otimista). */
export function toRow(input: TripInsert & { driver_id: string }, existing?: TripRow): TripRow {
  const now = new Date().toISOString();
  return {
    ...existing,
    ...input,
    cost_cents:
      input.fuel_cents + input.toll_cents + input.food_cents + input.maintenance_cents + input.other_cents,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };
}

function upsertInLists(qc: QueryClient, row: TripRow) {
  qc.setQueriesData<InfiniteData<TripRow[]>>({ queryKey: ['trips', 'list', row.driver_id] }, (data) => {
    if (!data) return data;
    let found = false;
    const pages = data.pages.map((page) =>
      page.map((t) => {
        if (t.id !== row.id) return t;
        found = true;
        return row;
      }),
    );
    if (!found && pages.length) pages[0] = [row, ...pages[0]];
    return { ...data, pages };
  });
  qc.setQueryData(tripKeys.detail(row.id), row);
}

function removeFromLists(qc: QueryClient, id: string) {
  qc.setQueriesData<InfiniteData<TripRow[]>>({ queryKey: ['trips', 'list'] }, (data) =>
    data ? { ...data, pages: data.pages.map((p) => p.filter((t) => t.id !== id)) } : data,
  );
  qc.removeQueries({ queryKey: tripKeys.detail(id) });
}

function invalidateAnalytics(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ['dashboard'] });
  qc.invalidateQueries({ queryKey: ['trips'] });
}

/*
 * Mutações registradas com chave fixa: se o app for fechado sem internet, elas ficam
 * salvas no aparelho e são reenviadas quando o sinal voltar (RF-17).
 */
queryClient.setMutationDefaults(['trip', 'save'], {
  mutationFn: async (row: TripRow) => {
    const { cost_cents: _c, created_at: _ca, updated_at: _ua, ...insert } = row;
    const { error } = await supabase.from('trips').upsert(insert);
    if (error) throw error;
  },
  onMutate: async (row: TripRow) => {
    await queryClient.cancelQueries({ queryKey: ['trips'] });
    upsertInLists(queryClient, row);
  },
  onSettled: () => invalidateAnalytics(queryClient),
});

queryClient.setMutationDefaults(['trip', 'delete'], {
  mutationFn: async (id: string) => {
    const { error } = await supabase.from('trips').delete().eq('id', id);
    if (error) throw error;
  },
  onMutate: async (id: string) => {
    await queryClient.cancelQueries({ queryKey: ['trips'] });
    removeFromLists(queryClient, id);
  },
  onSettled: () => invalidateAnalytics(queryClient),
});

export function useSaveTrip() {
  return useMutation<void, Error, TripRow>({ mutationKey: ['trip', 'save'] });
}

export function useDeleteTrip() {
  return useMutation<void, Error, string>({ mutationKey: ['trip', 'delete'] });
}
