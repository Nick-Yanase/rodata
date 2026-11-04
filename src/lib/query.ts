import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient, onlineManager } from '@tanstack/react-query';
import { Platform } from 'react-native';

// No celular, o TanStack Query não sabe sozinho se há internet: usa o NetInfo.
if (Platform.OS !== 'web') {
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => setOnline(Boolean(state.isConnected))),
  );
}

const DAY = 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Mantém os dados em cache por 7 dias: o app abre instantaneamente, mesmo sem sinal (RNF-20).
      gcTime: 7 * DAY,
      staleTime: 30 * 1000,
      retry: 2,
    },
    mutations: {
      // Sem internet a mutação fica "pausada" (e salva no aparelho) até o sinal voltar.
      retry: 3,
    },
  },
});

export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'rodata-cache-v1',
  throttleTime: 1000,
});

export const PERSIST_MAX_AGE = 7 * DAY;
