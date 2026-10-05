'use strict';

const { z, objectId, paginationQuery } = require('../../utils/validators');
const { isStrongPassword } = require('../../utils/password');
const { INDUSTRIES, REQUEST_STATUSES } = require('./company_request.model');

const RFC_PATTERN = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;

/** Texto opcional: '' se trata como ausente. */
function optionalText(max, label) {
  return z
    .string({ invalid_type_error: `${label} debe ser texto.` })
    .trim()
    .max(max, `${label} no puede exceder ${max} caracteres.`)
    .optional()
    .transform((value) => value || undefined);
}

const companyFields = {
  companyName: z
    .string({
      required_error: 'El nombre de la empresa es obligatorio.',
      invalid_type_error: 'El nombre de la empresa debe ser texto.',
    })
    .trim()
    .min(2, 'El nombre de la empresa debe tener al menos 2 caracteres.')
    .max(120, 'El nombre de la empresa no puede exceder 120 caracteres.'),
  legalName: optionalText(160, 'La razón social'),
  taxId: z
    .string({ invalid_type_error: 'El RFC debe ser texto.' })
    .trim()
    .toUpperCase()
    .optional()
    .transform((value) => value || undefined)
    .refine((value) => !value || RFC_PATTERN.test(value), 'El RFC no tiene un formato válido.'),
  industry: z.enum(INDUSTRIES, {
    errorMap: () => ({ message: 'Selecciona un giro válido.' }),
  }),
  phone: optionalText(30, 'El teléfono'),
  city: optionalText(100, 'La ciudad'),
};

const applicantFields = {
  name: z
    .string({ required_error: 'El nombre es obligatorio.', invalid_type_error: 'El nombre debe ser texto.' })
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres.')
    .max(100, 'El nombre no puede exceder 100 caracteres.'),
  lastName: optionalText(100, 'El apellido'),
  email: z
    .string({ required_error: 'El correo electrónico es obligatorio.', invalid_type_error: 'El correo debe ser texto.' })
    .trim()
    .toLowerCase()
    .email('Correo electrónico inválido.')
    .max(120, 'El correo no puede exceder 120 caracteres.'),
  password: z
    .string({ required_error: 'La contraseña es obligatoria.', invalid_type_error: 'La contraseña debe ser texto.' })
    .min(8, 'La contraseña debe tener al menos 8 caracteres.')
    .max(72, 'La contraseña no puede exceder 72 caracteres.')
    .refine(isStrongPassword, 'La contraseña debe incluir al menos una letra y un número.'),
};

/** Alta pública (POST /auth/register-company) y alta directa del Super Admin. */
const companyWithAdminSchema = z.object({ ...companyFields, ...applicantFields }).strict();

const idParams = z.object({ id: objectId });

const listRequestsQuery = paginationQuery.extend({
  status: z.enum(REQUEST_STATUSES).optional(),
});

const rejectSchema = z
  .object({
    reason: optionalText(500, 'El motivo'),
  })
  .strict();

const listCompaniesQuery = paginationQuery.extend({
  status: z.enum(['active', 'suspended']).optional(),
});

const companyStatusSchema = z
  .object({
    status: z.enum(['active', 'suspended'], {
      errorMap: () => ({ message: 'El estado debe ser "active" o "suspended".' }),
    }),
  })
  .strict();

module.exports = {
  companyWithAdminSchema,
  idParams,
  listRequestsQuery,
  rejectSchema,
  listCompaniesQuery,
  companyStatusSchema,
};
