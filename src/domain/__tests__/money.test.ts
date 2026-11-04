import { describe, expect, it } from 'vitest';

import { centsFromTyped, formatBRL, typedFromCents } from '../money';

describe('money', () => {
  it('formata centavos em reais', () => {
    expect(formatBRL(123456)).toBe('R$ 1.234,56');
    expect(formatBRL(0)).toBe('R$ 0,00');
    expect(formatBRL(-5000)).toBe('-R$ 50,00');
  });

  it('máscara de digitação entra pela direita', () => {
    expect(centsFromTyped('')).toBe(0);
    expect(centsFromTyped('1')).toBe(1);
    expect(centsFromTyped('12345')).toBe(12345);
    expect(centsFromTyped('1.234,56')).toBe(123456);
    expect(centsFromTyped('R$ 00600,00')).toBe(60000);
  });

  it('volta do valor para o texto do campo', () => {
    expect(typedFromCents(0)).toBe('');
    expect(typedFromCents(60000)).toBe('600,00');
    expect(centsFromTyped(typedFromCents(123456) + '7')).toBe(1234567);
  });
});
