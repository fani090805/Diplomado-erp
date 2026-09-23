import { describe, expect, it } from 'vitest';
import type { Company, FiscalRegimeCode } from './index.js';

describe('shared types', () => {
  it('exposes fiscal regime codes from the shared catalog', () => {
    const regime: FiscalRegimeCode = '626';
    const company: Company = {
      id: 'company-1',
      name: 'Empresa de prueba',
      legalName: 'Empresa de prueba S.A. de C.V.',
      rfc: 'AAA010101AAA',
      taxZipCode: '01000',
      fiscalRegime: regime
    };

    expect(company.fiscalRegime).toBe('626');
  });
});