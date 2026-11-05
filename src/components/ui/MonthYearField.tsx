import { useState } from 'react';

import { formatMonthYear, maskMonthYear, parseMonthYear, type ISODate } from '@/domain/dates';

import { TextField } from './Field';

type Props = {
  label: string;
  value: ISODate | '';
  onChange: (iso: ISODate | '') => void;
  hint?: string;
  optional?: boolean;
};

/** Mês e ano digitados (MM/AAAA). Guarda o primeiro dia do mês. */
export function MonthYearField({ label, value, onChange, hint, optional }: Props) {
  const [text, setText] = useState(value ? formatMonthYear(value) : '');
  const [error, setError] = useState<string>();
  return (
    <TextField
      label={label}
      value={text}
      placeholder="MM/AAAA"
      keyboardType="number-pad"
      inputMode="numeric"
      maxLength={7}
      hint={hint}
      optional={optional}
      error={error}
      onChangeText={(t) => {
        const masked = maskMonthYear(t);
        setText(masked);
        if (!masked) {
          setError(undefined);
          onChange('');
          return;
        }
        const iso = parseMonthYear(masked);
        if (iso) {
          setError(undefined);
          onChange(iso);
        } else if (masked.length === 7) {
          setError('Confira o mês (01 a 12) e o ano.');
        }
      }}
    />
  );
}
