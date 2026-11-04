/** Valores monetários são sempre inteiros em centavos (RN-06). */
export type Cents = number;

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const brlCompact = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** 123456 → "R$ 1.234,56" (espaço normal, não o NBSP do Intl, para não quebrar testes/cópias). */
export function formatBRL(cents: Cents): string {
  return brl.format(cents / 100).replace(/ /g, ' ');
}

/** 12345600 → "R$ 123,5 mil" — para eixos de gráfico. */
export function formatBRLCompact(cents: Cents): string {
  return brlCompact.format(cents / 100).replace(/ /g, ' ');
}

/**
 * Máscara de digitação de dinheiro: o usuário só digita números e eles entram
 * pela direita, como em app de banco. "1" → 1 centavo, "12345" → R$ 123,45.
 */
export function centsFromTyped(text: string): Cents {
  const digits = text.replace(/\D/g, '').replace(/^0+/, '').slice(0, 13);
  return digits ? Number.parseInt(digits, 10) : 0;
}

/** Valor exibido dentro do campo enquanto digita (sem o "R$", que fica fixo ao lado). */
export function typedFromCents(cents: Cents): string {
  if (!cents) return '';
  return formatBRL(cents).replace(/^-?R\$\s?/, '');
}

export function sumCents(...values: (Cents | null | undefined)[]): Cents {
  return values.reduce<number>((acc, v) => acc + (v ?? 0), 0);
}
