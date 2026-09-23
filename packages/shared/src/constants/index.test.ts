import { describe, expect, it } from 'vitest';
import { fiscalRegimes } from './index.js';

describe('fiscal regimes', () => {
  it('contains unique CFDI regime codes', () => {
    const codes = Object.values(fiscalRegimes);

    expect(codes).toHaveLength(20);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).toContain('601');
    expect(codes).toContain('626');
  });
});