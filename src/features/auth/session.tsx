import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { ProfileRow } from '@/lib/database.types';
import { queryClient } from '@/lib/query';
import { supabase } from '@/lib/supabase';

export type LinkedDriver = { linkId: string; id: string; name: string };

type SessionContextValue = {
  /** true enquanto lê a sessão salva no aparelho */
  loading: boolean;
  session: Session | null;
  userId: string | null;
  profile: ProfileRow | null;
  isAnalyst: boolean;
  /** Fretista cujos dados estão na tela (o próprio, ou o escolhido pelo analista). */
  activeDriverId: string | null;
  activeDriverName: string | null;
  setActiveDriverId: (id: string) => void;
  linkedDrivers: LinkedDriver[];
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

const ACTIVE_DRIVER_KEY = 'rodata-active-driver';

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [chosenDriver, setChosenDriver] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    AsyncStorage.getItem(ACTIVE_DRIVER_KEY)
      .then(setChosenDriver)
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

  const profile = profileQuery.data ?? null;
  // Enquanto o perfil não carrega, usa o papel informado no cadastro.
  const role = profile?.role ?? (session?.user.user_metadata?.role as ProfileRow['role'] | undefined) ?? 'driver';
  const isAnalyst = role === 'analyst';

  const linksQuery = useQuery({
    queryKey: ['linked-drivers', userId],
    enabled: Boolean(userId) && isAnalyst,
    queryFn: async (): Promise<LinkedDriver[]> => {
      const { data, error } = await supabase
        .from('analyst_links')
        .select('id, driver_id, driver:profiles!analyst_links_driver_id_fkey(name)')
        .eq('analyst_id', userId!)
        .eq('status', 'active')
        .order('accepted_at', { ascending: true });
      if (error) throw error;
      return (data ?? []).map((l) => {
        const row = l as unknown as { id: string; driver_id: string; driver: { name: string } | null };
        return { linkId: row.id, id: row.driver_id, name: row.driver?.name || 'Fretista' };
      });
    },
  });

  const linkedDrivers = useMemo(() => linksQuery.data ?? [], [linksQuery.data]);

  const activeDriverId = useMemo(() => {
    if (!userId) return null;
    if (!isAnalyst) return userId;
    if (chosenDriver && linkedDrivers.some((d) => d.id === chosenDriver)) return chosenDriver;
    return linkedDrivers[0]?.id ?? null;
  }, [userId, isAnalyst, chosenDriver, linkedDrivers]);

  const activeDriverName = isAnalyst
    ? (linkedDrivers.find((d) => d.id === activeDriverId)?.name ?? null)
    : (profile?.name ?? null);

  const value: SessionContextValue = {
    loading,
    session,
    userId,
    profile,
    isAnalyst,
    activeDriverId,
    activeDriverName,
    setActiveDriverId: (id) => {
      setChosenDriver(id);
      AsyncStorage.setItem(ACTIVE_DRIVER_KEY, id).catch(() => {});
    },
    linkedDrivers,
    signOut: async () => {
      await supabase.auth.signOut();
      queryClient.clear();
      await AsyncStorage.removeItem(ACTIVE_DRIVER_KEY).catch(() => {});
    },
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession fora do SessionProvider');
  return ctx;
}

/** Atalho para telas que só fazem sentido com um fretista selecionado. */
export function useActiveDriver() {
  const { activeDriverId, activeDriverName, isAnalyst } = useSession();
  return { driverId: activeDriverId, driverName: activeDriverName, readOnly: isAnalyst };
}
