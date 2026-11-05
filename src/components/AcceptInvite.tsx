import { useState } from 'react';
import { View } from 'react-native';

import { useSession } from '@/features/auth/session';
import { useAcceptInvite } from '@/features/settings/api';
import { friendlyError } from '@/lib/supabase';

import { Button, TextField, useToast } from './ui';

/** Entrar numa organização com o código recebido pelo WhatsApp. */
export function AcceptInvite({ onJoined }: { onJoined?: (orgId: string) => void }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const accept = useAcceptInvite();
  const { setActiveOrgId } = useSession();
  const toast = useToast();

  async function submit() {
    const clean = code.replace(/\s/g, '').toUpperCase();
    if (clean.length !== 6) return setError('O código tem 6 letras e números.');
    setError(undefined);
    try {
      const orgId = await accept.mutateAsync(clean);
      setActiveOrgId(orgId);
      setCode('');
      toast({ message: 'Pronto! Você entrou na organização.' });
      onJoined?.(orgId);
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  return (
    <View style={{ gap: 12 }}>
      <TextField
        label="Código de convite"
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase())}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={8}
        placeholder="Ex.: K7P2QX"
        error={error}
        onSubmitEditing={submit}
      />
      <Button title="Entrar na organização" icon="enter-outline" onPress={submit} loading={accept.isPending} />
    </View>
  );
}
