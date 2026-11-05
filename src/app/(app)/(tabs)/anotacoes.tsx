import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useDeferredValue, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OrgSwitcher } from '@/components/OrgSwitcher';
import { NoteCard } from '@/components/NoteCard';
import { AppText, Button, EmptyState } from '@/components/ui';
import { useActiveOrg, useSession } from '@/features/auth/session';
import { useAuthorLabel } from '@/features/settings/api';
import { useNotes } from '@/features/notes/api';
import { colors, font, MAX_WIDTH, radius, space } from '@/theme/tokens';

export default function NotesList() {
  const { orgId } = useActiveOrg();
  const { userId } = useSession();
  const authorOf = useAuthorLabel(orgId, userId);
  const [search, setSearch] = useState('');
  const deferred = useDeferredValue(search);
  const notes = useNotes(orgId, deferred);
  const items = notes.data?.pages.flat() ?? [];

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        refreshing={notes.isRefetching}
        onRefresh={() => notes.refetch()}
        onEndReachedThreshold={0.4}
        onEndReached={() => notes.hasNextPage && !notes.isFetchingNextPage && notes.fetchNextPage()}
        ListHeaderComponent={
          <View style={styles.header}>
            <AppText variant="heading">Anotações</AppText>
            <OrgSwitcher />
            <View style={styles.search}>
              <Ionicons name="search" size={22} color={colors.textMuted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar anotação"
                placeholderTextColor={colors.textSubtle}
                accessibilityLabel="Buscar anotação"
                style={styles.searchInput}
                maxFontSizeMultiplier={1.6}
              />
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <NoteCard
            note={item}
            authorLabel={authorOf(item.author_id)}
            onPress={() => router.push({ pathname: '/anotacao/[id]', params: { id: item.id } })}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
        ListEmptyComponent={
          notes.isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 48 }} />
          ) : (
            <EmptyState
              icon="document-text-outline"
              title={search ? 'Nada encontrado' : 'Nenhuma anotação'}
              message={search ? undefined : 'Guarde lembretes: cliente que paga atrasado, oficina boa, rota com muito pedágio…'}
            />
          )
        }
      />
      {orgId ? (
        <View style={styles.footer}>
          <View style={styles.footerInner}>
            <Button title="Nova anotação" icon="add-circle" onPress={() => router.push({ pathname: '/anotacao/[id]', params: { id: 'nova' } })} />
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
  footer: { padding: space.lg, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  footerInner: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
});
