import { subDays } from 'date-fns';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { formatDateBR, maskDateBR, parseDateBR, toISODate, type ISODate } from '@/domain/dates';
import { space } from '@/theme/tokens';

import { Chip } from './Chip';
import { TextField } from './Field';

type Props = {
  label: string;
  value: ISODate;
  onChange: (iso: ISODate) => void;
  error?: string;
  editable?: boolean;
  /** atalhos Hoje/Ontem (para datas recentes) */
  quickChips?: boolean;
};

/** Data digitada (dd/mm/aaaa) com atalhos "Hoje" e "Ontem" — menos toques que um calendário. */
export function DateField({ label, value, onChange, error, editable = true, quickChips = true }: Props) {
  const [text, setText] = useState(value ? formatDateBR(value) : '');
  const [localError, setLocalError] = useState<string>();
  const [lastValue, setLastValue] = useState(value);

  // valor mudou por fora (ex.: botão "Hoje"): atualiza o texto do campo
  if (value !== lastValue) {
    setLastValue(value);
    if (value && parseDateBR(text) !== value) setText(formatDateBR(value));
  }

  const today = toISODate(new Date());
  const yesterday = toISODate(subDays(new Date(), 1));

  return (
    <View style={styles.wrap}>
      <TextField
        label={label}
        value={text}
        placeholder="DD/MM/AAAA"
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={10}
        editable={editable}
        error={error ?? localError}
        onChangeText={(t) => {
          const masked = maskDateBR(t);
          setText(masked);
          const iso = parseDateBR(masked);
          if (iso) {
            setLocalError(undefined);
            onChange(iso);
          } else if (masked.length === 10) {
            setLocalError('Essa data não existe. Confira o dia e o mês.');
          }
        }}
      />
      {editable && quickChips ? (
      <View style={styles.chips}>
        <Chip label="Hoje" selected={value === today} onPress={() => onChange(today)} />
        <Chip label="Ontem" selected={value === yesterday} onPress={() => onChange(yesterday)} />
      </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  chips: { flexDirection: 'row', gap: space.sm },
});
