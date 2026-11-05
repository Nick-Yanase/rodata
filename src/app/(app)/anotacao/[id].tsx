import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { AppText, Button, Card, confirm, DateField, EmptyState, Screen, TextField, useToast } from '@/components/ui';
import { toISODate } from '@/domain/dates';
import { useActiveOrg, useSession } from '@/features/auth/session';
import { useAuthorLabel } from '@/features/settings/api';
import { useDeleteNote, useNote, useSaveNote } from '@/features/notes/api';
import type { NoteRow } from '@/lib/database.types';
import { goBack } from '@/lib/navigation';
import { newId } from '@/lib/uuid';
import { colors } from '@/theme/tokens';

export default function NoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'nova';
  const existing = useNote(isNew ? undefined : id);

  if (!isNew && !existing.data) {
    return (
      <Screen edges={[]}>
        {existing.isLoading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 48 }} />
        ) : (
          <EmptyState icon="alert-circle-outline" title="Anotação não encontrada" />
        )}
      </Screen>
    );
  }
  return <NoteForm key={id} id={id} isNew={isNew} existing={existing.data ?? undefined} />;
}

function NoteForm({ id, isNew, existing }: { id: string; isNew: boolean; existing?: NoteRow }) {
  const { orgId } = useActiveOrg();
  const { userId } = useSession();
  const authorOf = useAuthorLabel(orgId, userId);
  const author = existing ? authorOf(existing.author_id) : undefined;
  const save = useSaveNote();
  const del = useDeleteNote();
  const toast = useToast();

  const [title, setTitle] = useState(existing?.title ?? '');
  const [body, setBody] = useState(existing?.body ?? '');
  const [date, setDate] = useState(existing?.note_date ?? toISODate(new Date()));
  const [error, setError] = useState<string>();


  function onSave() {
    if (!title.trim()) return setError('Dê um título para a anotação.');
    if (!orgId || !userId) return;
    const now = new Date().toISOString();
    save.mutate(
      {
        id: isNew ? newId() : id,
        org_id: existing?.org_id ?? orgId,
        author_id: existing ? existing.author_id : userId,
        title: title.trim(),
        body: body.trim(),
        note_date: date,
        created_at: existing?.created_at ?? now,
        updated_at: now,
      },
      { onError: () => toast({ tone: 'error', message: 'Não conseguimos salvar a anotação.' }) },
    );
    toast({ message: 'Anotação salva!' });
    goBack('/anotacoes');
  }

  async function onDelete() {
    const row = existing;
    if (!row) return;
    if (!(await confirm('Excluir anotação?', `“${row.title}” será apagada.`, 'Excluir'))) return;
    del.mutate(row.id);
    goBack('/anotacoes');
    toast({ message: 'Anotação excluída.', actionLabel: 'Desfazer', onAction: () => save.mutate(row) });
  }

  return (
    <Screen edges={['bottom']} footer={<Button title="Salvar" icon="checkmark-circle" onPress={onSave} />}>
      <Stack.Screen options={{ title: isNew ? 'Nova anotação' : 'Editar anotação' }} />
      <Card>
        <TextField
          label="Título"
          value={title}
          onChangeText={(t) => {
            setTitle(t);
            setError(undefined);
          }}
          placeholder="Ex.: Cliente paga só no dia 10"
          error={error}
        />
        <DateField label="Data" value={date} onChange={setDate} />
        <TextField
          label="Anotação"
          value={body}
          onChangeText={setBody}
          multiline
          textAlignVertical="top"
          style={styles.body}
          placeholder="Escreva aqui…"
          optional
        />
        {author ? (
          <AppText variant="small" color={colors.textMuted}>
            Escrita por {author}
          </AppText>
        ) : null}
      </Card>
      {!isNew ? <Button title="Excluir anotação" variant="danger" icon="trash-outline" onPress={onDelete} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({ body: { minHeight: 180 } });
