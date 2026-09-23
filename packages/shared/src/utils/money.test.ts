import { Decimal } from 'decimal.js';
import { describe, expect, it } from 'vitest';
import { addMoney, calculateTax, multiplyMoney, roundMoney } from './money.js';

describe('money utils', () => {
  it('sums money values correctly', () => {
    expect(addMoney(10.12, '5.88')).toEqual(new Decimal('16.00'));
  });

  it('multiplies and rounds money values', () => {
    expect(multiplyMoney(12.345, 2)).toEqual(new Decimal('24.69'));
  });

  it('rounds to 2 decimal places', () => {
    expect(roundMoney('19.999')).toEqual(new Decimal('20.00'));
  });

  it('calculates a configured tax rate', () => {
    expect(calculateTax(100, '0.16')).toEqual(new Decimal('16.00'));
  });
});
