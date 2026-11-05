import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { MemberRole, OrganizationInviteRow, OrganizationSettingsRow } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Configuração do negócio (MEI)
// ---------------------------------------------------------------------------

export function useOrgSettings(orgId: string | null) {
  return useQuery({
    queryKey: ['settings', orgId],
    enabled: Boolean(orgId),
    queryFn: async (): Promise<OrganizationSettingsRow | null> => {
      const { data, error } = await supabase
        .from('organization_settings')
        .select('*')
        .eq('org_id', orgId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveOrgSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: Omit<OrganizationSettingsRow, 'updated_at'>) => {
      const { error } = await supabase.from('organization_settings').upsert(s);
      if (error) throw error;
    },
    onSuccess: (_d, s) => qc.invalidateQueries({ queryKey: ['settings', s.org_id] }),
  });
}

// ---------------------------------------------------------------------------
// Perfil
// ---------------------------------------------------------------------------

export function useUpdateName() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('profiles').update({ name }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      qc.invalidateQueries({ queryKey: ['members'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Organização
// ---------------------------------------------------------------------------

function invalidateOrgs(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['organizations'] });
  qc.invalidateQueries({ queryKey: ['members'] });
}

export function useCreateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.rpc('create_organization', { p_name: name });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => invalidateOrgs(qc),
  });
}

export function useRenameOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('organizations').update({ name }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateOrgs(qc),
  });
}

export type Member = { userId: string; name: string; role: MemberRole };

/** Membros da organização — também usados para mostrar quem lançou cada viagem. */
export function useMembers(orgId: string | null) {
  return useQuery({
    queryKey: ['members', orgId],
    enabled: Boolean(orgId),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Member[]> => {
      const { data, error } = await supabase
        .from('organization_members')
        .select('user_id, role, profile:profiles(name)')
        .eq('org_id', orgId!)
        .order('joined_at', { ascending: true });
      if (error) throw error;
      return (data ?? []).map((m) => {
        const row = m as unknown as { user_id: string; role: MemberRole; profile: { name: string } | null };
        return { userId: row.user_id, role: row.role, name: row.profile?.name || 'Sem nome' };
      });
    },
  });
}

/** Nome curto de quem lançou/escreveu, ou undefined quando foi o próprio usuário. */
export function useAuthorLabel(orgId: string | null, me: string | null) {
  const members = useMembers(orgId);
  return (authorId: string | null | undefined) => {
    if (!authorId || authorId === me) return undefined;
    const name = members.data?.find((m) => m.userId === authorId)?.name;
    return name ? name.split(' ')[0] : 'outro membro';
  };
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orgId, userId }: { orgId: string; userId: string }) => {
      const { error, count } = await supabase
        .from('organization_members')
        .delete({ count: 'exact' })
        .eq('org_id', orgId)
        .eq('user_id', userId);
      if (error) throw error;
      if (!count) throw new Error('Sem permissão para remover este membro.');
    },
    onSuccess: () => invalidateOrgs(qc),
  });
}

// ---------------------------------------------------------------------------
// Convites
// ---------------------------------------------------------------------------

export function usePendingInvite(orgId: string | null) {
  return useQuery({
    queryKey: ['invites', orgId],
    enabled: Boolean(orgId),
    queryFn: async (): Promise<OrganizationInviteRow | null> => {
      const { data, error } = await supabase
        .from('organization_invites')
        .select('*')
        .eq('org_id', orgId!)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orgId: string) => {
      const { data, error } = await supabase.rpc('create_invite', { p_org: orgId });
      if (error) throw error;
      return data as OrganizationInviteRow;
    },
    onSuccess: (_d, orgId) => qc.invalidateQueries({ queryKey: ['invites', orgId] }),
  });
}

export function useRevokeInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invite: OrganizationInviteRow) => {
      const { error } = await supabase.from('organization_invites').update({ status: 'revoked' }).eq('id', invite.id);
      if (error) throw error;
    },
    onSuccess: (_d, invite) => qc.invalidateQueries({ queryKey: ['invites', invite.org_id] }),
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
    onSuccess: () => invalidateOrgs(qc),
  });
}
