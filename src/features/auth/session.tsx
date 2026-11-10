import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { MemberRole, ProfileRow } from '@/lib/database.types';
import { PERSIST_KEY, queryClient } from '@/lib/query';
import { supabase } from '@/lib/supabase';

export type MyOrganization = { id: string; name: string; role: MemberRole };

type SessionContextValue = {
  /** true enquanto lê a sessão salva no aparelho */
  loading: boolean;
  session: Session | null;
  userId: string | null;
  profile: ProfileRow | null;
  /** Organizações de que o usuário faz parte. */
  organizations: MyOrganization[];
  /** true quando a lista de organizações já foi carregada (mesmo que vazia). */
  organizationsLoaded: boolean;
  /** Organização cujos dados estão na tela. */
  activeOrg: MyOrganization | null;
  setActiveOrgId: (id: string) => void;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

const ACTIVE_ORG_KEY = 'rodata-active-org';

export const orgKeys = {
  mine: (userId: string | null) => ['organizations', 'mine', userId] as const,
};

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [chosenOrg, setChosenOrg] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    AsyncStorage.getItem(ACTIVE_ORG_KEY)
      .then(setChosenOrg)
      .catch(() => {});
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;

  const profileQuery = useQuery({
    queryKey: ['profile', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId!).single();
      if (error) throw error;
      return data;
    },
  });

  const orgsQuery = useQuery({
    queryKey: orgKeys.mine(userId),
    enabled: Boolean(userId),
    queryFn: async (): Promise<MyOrganization[]> => {
      const { data, error } = await supabase
        .from('organization_members')
        .select('role, organization:organizations(id, name)')
        .eq('user_id', userId!)
        .order('joined_at', { ascending: true });
      if (error) throw error;
      return (data ?? []).flatMap((m) => {
        const row = m as unknown as { role: MemberRole; organization: { id: string; name: string } | null };
        return row.organization ? [{ ...row.organization, role: row.role }] : [];
      });
    },
  });

  const organizations = useMemo(() => orgsQuery.data ?? [], [orgsQuery.data]);

  const activeOrg = useMemo(
    () => organizations.find((o) => o.id === chosenOrg) ?? organizations[0] ?? null,
    [organizations, chosenOrg],
  );

  const value: SessionContextValue = {
    loading,
    session,
    userId,
    profile: profileQuery.data ?? null,
    organizations,
    // com cache offline, os dados podem existir mesmo sem a consulta ter terminado
    organizationsLoaded: orgsQuery.data !== undefined,
    activeOrg,
    setActiveOrgId: (id) => {
      setChosenOrg(id);
      AsyncStorage.setItem(ACTIVE_ORG_KEY, id).catch(() => {});
    },
    signOut: async () => {
      await supabase.auth.signOut();
      // apaga do aparelho os dados guardados para uso offline (celular compartilhado)
      queryClient.clear();
      await AsyncStorage.multiRemove([ACTIVE_ORG_KEY, PERSIST_KEY]).catch(() => {});
    },
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession fora do SessionProvider');
  return ctx;
}

/** Atalho para telas que trabalham com a organização ativa. */
export function useActiveOrg() {
  const { activeOrg } = useSession();
  return { orgId: activeOrg?.id ?? null, orgName: activeOrg?.name ?? null, role: activeOrg?.role ?? null };
}
