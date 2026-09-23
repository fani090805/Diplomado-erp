import { z } from 'zod';
import { fiscalRegimes } from '../constants/index.js';

const fiscalRegimeCodes = Object.values(fiscalRegimes) as [string, ...string[]];

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const userSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  tenantId: z.string().min(1),
  companyId: z.string().min(1).nullable()
});

export const companySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  legalName: z.string().min(1),
  rfc: z.string().regex(/^[A-Z&Ñ]{3,4}\d{6}[A-Z\d]{3}$/),
  taxZipCode: z.string().regex(/^\d{5}$/),
  fiscalRegime: z.enum(fiscalRegimeCodes)
});

export const roleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  permissions: z.array(z.string().min(1))
});

export const settingsSchema = z.object({
  key: z.string().min(1),
  value: z.unknown()
});
