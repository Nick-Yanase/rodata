import { centsFromTyped, typedFromCents, type Cents } from '@/domain/money';

import { TextField } from './Field';

type Props = {
  label: string;
  value: Cents;
  onChange: (cents: Cents) => void;
  error?: string;
  hint?: string;
  optional?: boolean;
  onBlur?: () => void;
  editable?: boolean;
};

/** Campo de dinheiro com R$ fixo e máscara de banco (RF-11). */
export function MoneyField({ label, value, onChange, ...rest }: Props) {
  return (
    <TextField
      label={label}
      prefix="R$"
      value={typedFromCents(value)}
      onChangeText={(t) => onChange(centsFromTyped(t))}
      keyboardType="number-pad"
      inputMode="numeric"
      placeholder="0,00"
      selectTextOnFocus
      {...rest}
    />
  );
}
