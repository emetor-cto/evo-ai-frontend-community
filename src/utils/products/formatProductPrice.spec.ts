import { describe, expect, it } from 'vitest';
import { formatProductAmount, formatProductPrice } from './formatProductPrice';

describe('formatProductPrice', () => {
  it('keeps millesimal precision instead of rounding to cents', () => {
    expect(formatProductAmount(5.799)).toBe('5.799');
    // Locale may use comma or dot as decimal separator (e.g. pt-BR → "R$ 5,799").
    expect(formatProductPrice(5.799, 'BRL')).toMatch(/5[,.]799/);
  });

  it('does not force trailing zeros on whole numbers', () => {
    expect(formatProductAmount(10)).toBe('10');
  });
});
