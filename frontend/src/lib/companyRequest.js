/**
 * Datos compartidos del alta de empresas (registro público y panel de plataforma).
 * Las reglas replican las del backend (company_request.validation.js), que siempre revalida.
 */

export const INDUSTRY_OPTIONS = [
  { value: 'comercio', label: 'Comercio' },
  { value: 'construccion', label: 'Construcción' },
  { value: 'manufactura', label: 'Manufactura' },
  { value: 'servicios', label: 'Servicios' },
  { value: 'otro', label: 'Otro' },
];

export const INDUSTRY_LABELS = Object.fromEntries(
  INDUSTRY_OPTIONS.map((option) => [option.value, option.label])
);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RFC_PATTERN = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;

export function isStrongPassword(password) {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

/** Errores por campo del formulario de alta de empresa ({} si es válido). */
export function validateCompanyRequest(form) {
  const errors = {};
  const companyName = form.companyName.trim();
  if (companyName.length < 2) errors.companyName = 'Ingresa el nombre de la empresa (mínimo 2 caracteres).';
  if (companyName.length > 120) errors.companyName = 'El nombre no puede exceder 120 caracteres.';
  if (form.legalName.trim().length > 160) errors.legalName = 'La razón social no puede exceder 160 caracteres.';
  const taxId = form.taxId.trim().toUpperCase();
  if (taxId && !RFC_PATTERN.test(taxId)) errors.taxId = 'El RFC no tiene un formato válido.';
  if (!form.industry) errors.industry = 'Selecciona el giro de tu empresa.';
  if (form.phone.trim().length > 30) errors.phone = 'El teléfono no puede exceder 30 caracteres.';
  if (form.city.trim().length > 100) errors.city = 'La ciudad no puede exceder 100 caracteres.';
  if (form.name.trim().length < 2) errors.name = 'Ingresa un nombre de al menos 2 caracteres.';
  if (form.name.trim().length > 100) errors.name = 'El nombre no puede exceder 100 caracteres.';
  if (form.lastName.trim().length > 100) errors.lastName = 'El apellido no puede exceder 100 caracteres.';
  if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = 'Ingresa un correo electrónico válido.';
  if (!isStrongPassword(form.password)) errors.password = 'La contraseña debe cumplir todos los requisitos.';
  if (form.confirmPassword !== form.password) errors.confirmPassword = 'Las contraseñas no coinciden.';
  return errors;
}

/** Cuerpo para POST /auth/register-company (omite opcionales vacíos). */
export function toCompanyRequestPayload(form) {
  const optional = (value) => (value.trim() ? value.trim() : undefined);
  return {
    companyName: form.companyName.trim(),
    legalName: optional(form.legalName),
    taxId: optional(form.taxId.toUpperCase()),
    industry: form.industry,
    phone: optional(form.phone),
    city: optional(form.city),
    name: form.name.trim(),
    lastName: optional(form.lastName),
    email: form.email.trim().toLowerCase(),
    password: form.password,
  };
}
