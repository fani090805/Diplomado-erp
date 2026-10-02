'use strict';

const { z, email } = require('../../utils/validators');
const { passwordSchema } = require('../users/user.validation');
const { isStrongPassword } = require('../../utils/password');

const loginSchema = z
  .object({
    email,
    password: z.string().min(1, 'La contraseña es obligatoria.').max(100),
  })
  .strict();

const registerSchema = z
  .object({
    name: z
      .string({ required_error: 'El nombre es obligatorio.', invalid_type_error: 'El nombre debe ser texto.' })
      .trim()
      .min(2, 'El nombre debe tener al menos 2 caracteres.')
      .max(100, 'El nombre no puede exceder 100 caracteres.'),
    lastName: z
      .string({ invalid_type_error: 'El apellido debe ser texto.' })
      .trim()
      .max(100, 'El apellido no puede exceder 100 caracteres.')
      .optional(),
    companyName: z
      .string({
        required_error: 'El nombre de la empresa es obligatorio.',
        invalid_type_error: 'El nombre de la empresa debe ser texto.',
      })
      .trim()
      .min(2, 'El nombre de la empresa debe tener al menos 2 caracteres.')
      .max(120, 'El nombre de la empresa no puede exceder 120 caracteres.'),
    email: z
      .string({ required_error: 'El correo electrónico es obligatorio.', invalid_type_error: 'El correo debe ser texto.' })
      .trim()
      .toLowerCase()
      .email('Correo electrónico inválido.'),
    password: z
      .string({ required_error: 'La contraseña es obligatoria.', invalid_type_error: 'La contraseña debe ser texto.' })
      .min(8, 'La contraseña debe tener al menos 8 caracteres.')
      .max(100, 'La contraseña no puede exceder 100 caracteres.')
      .refine(isStrongPassword, 'La contraseña debe incluir al menos una letra y un número.'),
  })
  .strict();

const refreshSchema = z
  .object({
    refreshToken: z.string().min(10, 'Refresh token inválido.').max(2000),
  })
  .strict();

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'La contraseña actual es obligatoria.').max(100),
    newPassword: passwordSchema,
  })
  .strict()
  .refine((b) => b.currentPassword !== b.newPassword, {
    path: ['newPassword'],
    message: 'La nueva contraseña debe ser distinta a la actual.',
  });

module.exports = { loginSchema, registerSchema, refreshSchema, changePasswordSchema };
