import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useDeferredValue, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DriverSwitcher } from '@/components/DriverSwitcher';
import { SyncStatus } from '@/components/SyncStatus';
import { TripCard } from '@/components/TripCard';
import { AppText, Button, Chip, EmptyState } from '@/components/ui';
import { useActiveDriver } from '@/features/auth/session';
import { useTrips, type TripSort } from '@/features/trips/api';
import { colors, font, MAX_WIDTH, radius, space } from '@/theme/tokens';

const SORTS: { id: TripSort; label: string }[] = [
  { id: 'date_desc', label: 'Mais recentes' },
  { id: 'date_asc', label: 'Mais antigas' },
  { id: 'freight_desc', label: 'Maior frete' },
];

export default function TripsList() {
  const { driverId, readOnly } = useActiveDriver();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<TripSort>('date_desc');
  const deferred = useDeferredValue(search);
  const trips = useTrips(driverId, deferred, sort);
  const items = trips.data?.pages.flat() ?? [];

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <FlatList
        data={items}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        refreshing={trips.isRefetching}
        onRefresh={() => trips.refetch()}
        onEndReachedThreshold={0.4}
        onEndReached={() => trips.hasNextPage && !trips.isFetchingNextPage && trips.fetchNextPage()}
        ListHeaderComponent={
          <View style={styles.header}>
            <AppText variant="heading">Viagens</AppText>
            <SyncStatus />
            <DriverSwitcher />
            <View style={styles.search}>
              <Ionicons name="search" size={22} color={colors.textMuted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar por nome ou cidade"
                placeholderTextColor={colors.textSubtle}
                accessibilityLabel="Buscar viagem por nome ou cidade"
                style={styles.searchInput}
                returnKeyType="search"
                maxFontSizeMultiplier={1.6}
              />
            </View>
            <View style={styles.chips}>
              {SORTS.map((s) => (
                <Chip key={s.id} label={s.label} selected={sort === s.id} onPress={() => setSort(s.id)} />
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <TripCard trip={item} onPress={() => router.push({ pathname: '/viagem/[id]', params: { id: item.id } })} />
        )}
        ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
        ListEmptyComponent={
          trips.isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 48 }} />
          ) : trips.isError ? (
            <EmptyState icon="cloud-offline-outline" title="Não foi possível carregar" message="Puxe a tela para baixo para tentar de novo." />
          ) : search ? (
            <EmptyState icon="search" title="Nada encontrado" message={`Nenhuma viagem com “${search}”.`} />
          ) : (
            <EmptyState
              icon="bus-outline"
              title="Nenhuma viagem ainda"
              message={readOnly ? 'O fretista ainda não lançou viagens.' : 'Toque em “Nova viagem” para lançar a primeira.'}
            />
          )
        }
        ListFooterComponent={
          trips.isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={{ margin: 16 }} /> : undefined
        }
      />
      {!readOnly ? (
        <View style={styles.footer}>
          <View style={styles.footerInner}>
            <Button title="Nova viagem" icon="add-circle" onPress={() => router.push('/viagem/nova')} />
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { padding: space.lg, paddingBottom: space.xxl, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
  header: { gap: space.md, marginBottom: space.md },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    minHeight: 54,
  },
  searchInput: { flex: 1, fontSize: font.body, color: colors.text, paddingVertical: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  footer: { padding: space.lg, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  footerInner: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
});
