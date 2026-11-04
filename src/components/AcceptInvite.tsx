import { useState } from 'react';
import { View } from 'react-native';

import { useAcceptInvite } from '@/features/settings/api';
import { useSession } from '@/features/auth/session';
import { friendlyError } from '@/lib/supabase';

import { Button, Card, TextField, useToast } from './ui';

/** Analista digita o código que o fretista mandou (RF-06). */
export function AcceptInvite() {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const accept = useAcceptInvite();
  const { setActiveDriverId } = useSession();
  const toast = useToast();

  async function submit() {
    const clean = code.replace(/\s/g, '').toUpperCase();
    if (clean.length !== 6) return setError('O código tem 6 letras e números.');
    setError(undefined);
    try {
      const driverId = await accept.mutateAsync(clean);
      setActiveDriverId(driverId);
      setCode('');
      toast({ message: 'Pronto! Agora você acompanha esse fretista.' });
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  return (
    <Card>
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
        <Button title="Acompanhar fretista" icon="link-outline" onPress={submit} loading={accept.isPending} />
      </View>
    </Card>
  );
}
