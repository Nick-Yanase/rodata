import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { AppText, Button, Card, confirm, DateField, EmptyState, Screen, TextField, useToast } from '@/components/ui';
import { toISODate } from '@/domain/dates';
import { useActiveDriver, useSession } from '@/features/auth/session';
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
  const { driverId } = useActiveDriver();
  const { userId } = useSession();
  const save = useSaveNote();
  const del = useDeleteNote();
  const toast = useToast();

  const [title, setTitle] = useState(existing?.title ?? '');
  const [body, setBody] = useState(existing?.body ?? '');
  const [date, setDate] = useState(existing?.note_date ?? toISODate(new Date()));
  const [error, setError] = useState<string>();

  const canEdit = isNew || existing?.author_id === userId;

  function onSave() {
    if (!title.trim()) return setError('Dê um título para a anotação.');
    if (!driverId || !userId) return;
    const now = new Date().toISOString();
    save.mutate(
      {
        id: isNew ? newId() : id,
        driver_id: existing?.driver_id ?? driverId,
        author_id: userId,
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
    <Screen edges={['bottom']} footer={canEdit ? <Button title="Salvar" icon="checkmark-circle" onPress={onSave} /> : undefined}>
      <Stack.Screen options={{ title: isNew ? 'Nova anotação' : canEdit ? 'Editar anotação' : 'Anotação' }} />
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
          editable={canEdit}
        />
        <DateField label="Data" value={date} onChange={setDate} editable={canEdit} />
        <TextField
          label="Anotação"
          value={body}
          onChangeText={setBody}
          multiline
          textAlignVertical="top"
          style={styles.body}
          placeholder="Escreva aqui…"
          editable={canEdit}
          optional
        />
        {!canEdit ? (
          <AppText variant="small" color={colors.textMuted}>
            Só quem escreveu pode alterar esta anotação.
          </AppText>
        ) : null}
      </Card>
      {!isNew && canEdit ? <Button title="Excluir anotação" variant="danger" icon="trash-outline" onPress={onDelete} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({ body: { minHeight: 180 } });
