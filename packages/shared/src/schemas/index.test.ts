import { describe, expect, it } from 'vitest';
import { companySchema, loginSchema, settingsSchema } from './index.js';

describe('shared schemas', () => {
  it('validates login input', () => {
    expect(loginSchema.safeParse({ email: 'user@example.com', password: 'secret' }).success).toBe(true);
    expect(loginSchema.safeParse({ email: 'invalid', password: '' }).success).toBe(false);
  });

  it('validates companies against the fiscal regime catalog', () => {
    const company = {
      id: 'company-1',
      name: 'Empresa de prueba',
      legalName: 'Empresa de prueba S.A. de C.V.',
      rfc: 'AAA010101AAA',
      taxZipCode: '01000',
      fiscalRegime: '626'
    };

    expect(companySchema.safeParse(company).success).toBe(true);
    expect(companySchema.safeParse({ ...company, fiscalRegime: '999' }).success).toBe(false);
  });

  it('allows structured settings values', () => {
    expect(settingsSchema.safeParse({ key: 'timezone', value: { region: 'America/Mexico_City' } }).success).toBe(true);
  });
});