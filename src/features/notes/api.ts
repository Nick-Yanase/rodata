import { useInfiniteQuery, useMutation, useQuery, type InfiniteData, type QueryClient } from '@tanstack/react-query';

import type { NoteRow } from '@/lib/database.types';
import { queryClient } from '@/lib/query';
import { supabase } from '@/lib/supabase';

const PAGE_SIZE = 30;

export function useNotes(orgId: string | null, search: string) {
  return useInfiniteQuery({
    queryKey: ['notes', 'list', orgId ?? '', search],
    enabled: Boolean(orgId),
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      let q = supabase.from('notes').select('*').eq('org_id', orgId!);
      if (search.trim()) {
        const p = `%${search.replace(/[%_\\,()]/g, ' ').trim()}%`;
        q = q.or(`title.ilike.${p},body.ilike.${p}`);
      }
      const { data, error } = await q
        .order('note_date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);
      if (error) throw error;
      return data;
    },
    getNextPageParam: (last, pages) =>
      last.length < PAGE_SIZE ? undefined : pages.reduce((n, p) => n + p.length, 0),
  });
}

function findNoteInCache(qc: QueryClient, id: string): NoteRow | undefined {
  for (const [, data] of qc.getQueriesData<InfiniteData<NoteRow[]>>({ queryKey: ['notes', 'list'] })) {
    const hit = data?.pages.flat().find((n) => n.id === id);
    if (hit) return hit;
  }
  return undefined;
}

export function useNote(id: string | undefined) {
  return useQuery({
    queryKey: ['notes', 'detail', id ?? ''],
    enabled: Boolean(id),
    initialData: () => (id ? findNoteInCache(queryClient, id) : undefined),
    queryFn: async () => {
      const { data, error } = await supabase.from('notes').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

queryClient.setMutationDefaults(['note', 'save'], {
  mutationFn: async (row: NoteRow) => {
    const { created_at: _c, updated_at: _u, ...insert } = row;
    const { error } = await supabase.from('notes').upsert(insert);
    if (error) throw error;
  },
  onMutate: async (row: NoteRow) => {
    await queryClient.cancelQueries({ queryKey: ['notes'] });
    queryClient.setQueriesData<InfiniteData<NoteRow[]>>({ queryKey: ['notes', 'list', row.org_id] }, (data) => {
      if (!data) return data;
      let found = false;
      const pages = data.pages.map((p) =>
        p.map((n) => {
          if (n.id !== row.id) return n;
          found = true;
          return row;
        }),
      );
      if (!found && pages.length) pages[0] = [row, ...pages[0]];
      return { ...data, pages };
    });
    queryClient.setQueryData(['notes', 'detail', row.id], row);
  },
  onSettled: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
});

queryClient.setMutationDefaults(['note', 'delete'], {
  mutationFn: async (id: string) => {
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) throw error;
  },
  onMutate: async (id: string) => {
    await queryClient.cancelQueries({ queryKey: ['notes'] });
    queryClient.setQueriesData<InfiniteData<NoteRow[]>>({ queryKey: ['notes', 'list'] }, (data) =>
      data ? { ...data, pages: data.pages.map((p) => p.filter((n) => n.id !== id)) } : data,
    );
  },
  onSettled: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
});

export function useSaveNote() {
  return useMutation<void, Error, NoteRow>({ mutationKey: ['note', 'save'] });
}

export function useDeleteNote() {
  return useMutation<void, Error, string>({ mutationKey: ['note', 'delete'] });
}
