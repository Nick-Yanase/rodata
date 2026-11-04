import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { AnalystLinkRow, BusinessSettingsRow } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export function useBusinessSettings(driverId: string | null) {
  return useQuery({
    queryKey: ['settings', driverId],
    enabled: Boolean(driverId),
    queryFn: async (): Promise<BusinessSettingsRow | null> => {
      const { data, error } = await supabase
        .from('business_settings')
        .select('*')
        .eq('driver_id', driverId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveBusinessSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: Omit<BusinessSettingsRow, 'updated_at'>) => {
      const { error } = await supabase.from('business_settings').upsert(s);
      if (error) throw error;
    },
    onSuccess: (_d, s) => qc.invalidateQueries({ queryKey: ['settings', s.driver_id] }),
  });
}

export function useUpdateName() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('profiles').update({ name }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  });
}

export type DriverLink = AnalystLinkRow & { analyst: { name: string } | null };

/** Convites e analistas do fretista. */
export function useDriverLinks(driverId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['links', driverId],
    enabled: Boolean(driverId) && enabled,
    queryFn: async (): Promise<DriverLink[]> => {
      const { data, error } = await supabase
        .from('analyst_links')
        .select('*, analyst:profiles!analyst_links_analyst_id_fkey(name)')
        .eq('driver_id', driverId!)
        .neq('status', 'revoked')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DriverLink[];
    },
  });
}

export function useCreateInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('create_invite');
      if (error) throw error;
      return data as AnalystLinkRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['links'] }),
  });
}

export function useRevokeLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase.from('analyst_links').update({ status: 'revoked' }).eq('id', linkId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['links'] });
      qc.invalidateQueries({ queryKey: ['linked-drivers'] });
    },
  });
}

export function useAcceptInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.rpc('accept_invite', { p_code: code });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['linked-drivers'] }),
  });
}
