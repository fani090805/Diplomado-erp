import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../auth/AuthContext';
import { TTButton, TTIcon, TTInput, TTSelect } from '../../design-system/components';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../design-system/tokens';
import PasswordRequirements from '../../components/PasswordRequirements';
import {
  INDUSTRY_OPTIONS,
  toCompanyRequestPayload,
  validateCompanyRequest,
} from '../../lib/companyRequest';

const EMPTY_FORM = {
  companyName: '',
  legalName: '',
  taxId: '',
  industry: null,
  phone: '',
  city: '',
  name: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
};

/** Solicitud pública de alta de una empresa nueva (queda en revisión del Super Admin). */
export default function CompanyRequestForm({ onSubmitted, onGoHome }) {
  const { registerCompany } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const update = (field) => (value) => {
    setForm((current) => ({
      ...current,
      [field]: field === 'taxId' ? String(value || '').toUpperCase() : value,
    }));
    setErrors((current) => ({ ...current, [field]: '' }));
    setServerError('');
  };

  const onSubmit = async () => {
    setServerError('');
    setConnectionStatus('');
    const nextErrors = validateCompanyRequest(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    const controller = new AbortController();
    let timedOut = false;
    const slowTimer = setTimeout(() => setConnectionStatus('slow'), 4000);
    const timeoutTimer = setTimeout(() => {
      timedOut = true;
      controller.abort();
      setLoading(false);
      setConnectionStatus('timeout');
    }, 60000);
    try {
      await registerCompany(toCompanyRequestPayload(form), { signal: controller.signal });
      setSubmitted(true);
      if (onSubmitted) onSubmitted();
    } catch (error) {
      if (!timedOut) {
        const details = Array.isArray(error.details?.body)
          ? ` ${error.details.body.map((detail) => detail.message).join(' ')}`
          : '';
        setServerError(
          error.status
            ? `${error.message}${details}`
            : 'No fue posible conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.'
        );
      }
    } finally {
      clearTimeout(slowTimer);
      clearTimeout(timeoutTimer);
      if (!timedOut) {
        setLoading(false);
        setConnectionStatus('');
      }
    }
  };

  if (submitted) {
    return (
      <View style={styles.successContent}>
        <TTIcon name="check" size={64} color={COLORS.successText} />
        <Text style={styles.title}>¡Solicitud enviada!</Text>
        <Text style={styles.successMessage}>
          Revisaremos los datos de tu empresa y te avisaremos por correo cuando esté lista.
        </Text>
        <TTButton variant="primary" size="lg" onPress={onGoHome}>
          Volver al inicio
        </TTButton>
      </View>
    );
  }

  return (
    <View style={styles.form}>
      <Text style={styles.title}>Registrar mi empresa</Text>
      <Text style={styles.subtitle}>
        Envía los datos de tu negocio; te avisaremos por correo cuando tu empresa esté lista.
      </Text>

      {serverError ? (
        <View accessibilityRole="alert" style={styles.serverError}>
          <Text style={styles.serverErrorText}>{serverError}</Text>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Datos de tu empresa</Text>
      <TTInput
        label="Nombre de la empresa"
        required
        value={form.companyName}
        onChangeText={update('companyName')}
        placeholder="Ej. Ferretería El Martillo"
        autoComplete="organization"
        disabled={loading}
        error={errors.companyName}
      />
      <TTInput
        label="Razón social"
        value={form.legalName}
        onChangeText={update('legalName')}
        placeholder="Ej. El Martillo SA de CV"
        disabled={loading}
        error={errors.legalName}
      />
      <TTInput
        label="RFC"
        value={form.taxId}
        onChangeText={update('taxId')}
        placeholder="XAXX010101000"
        autoCapitalize="characters"
        disabled={loading}
        error={errors.taxId}
      />
      <TTSelect
        label="Giro *"
        value={form.industry}
        onChange={update('industry')}
        options={INDUSTRY_OPTIONS}
        placeholder="Selecciona el giro"
        disabled={loading}
        error={errors.industry}
      />
      <TTInput
        label="Teléfono"
        value={form.phone}
        onChangeText={update('phone')}
        placeholder="10 dígitos"
        keyboardType="phone-pad"
        autoComplete="tel"
        disabled={loading}
        error={errors.phone}
      />
      <TTInput
        label="Ciudad"
        value={form.city}
        onChangeText={update('city')}
        placeholder="Ej. Puebla"
        disabled={loading}
        error={errors.city}
      />

      <Text style={styles.sectionTitle}>Tus datos (serás el administrador)</Text>
      <TTInput
        label="Nombre"
        required
        value={form.name}
        onChangeText={update('name')}
        placeholder="Tu nombre"
        autoComplete="name-given"
        disabled={loading}
        error={errors.name}
      />
      <TTInput
        label="Apellido"
        value={form.lastName}
        onChangeText={update('lastName')}
        placeholder="Tu apellido"
        autoComplete="name-family"
        disabled={loading}
        error={errors.lastName}
      />
      <TTInput
        label="Correo electrónico"
        required
        value={form.email}
        onChangeText={update('email')}
        placeholder="tu@empresa.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        disabled={loading}
        error={errors.email}
      />
      <TTInput
        label="Contraseña"
        required
        value={form.password}
        onChangeText={update('password')}
        placeholder="Crea una contraseña"
        secureTextEntry
        autoComplete="new-password"
        disabled={loading}
        error={errors.password}
      />
      <PasswordRequirements password={form.password} />
      <TTInput
        label="Confirmar contraseña"
        required
        value={form.confirmPassword}
        onChangeText={update('confirmPassword')}
        placeholder="Repite tu contraseña"
        secureTextEntry
        autoComplete="new-password"
        disabled={loading}
        error={errors.confirmPassword}
      />

      <TTButton
        variant="primary"
        size="lg"
        loading={loading}
        disabled={loading}
        onPress={onSubmit}
        style={styles.submitButton}
      >
        Enviar solicitud
      </TTButton>
      {connectionStatus ? (
        <Text style={styles.connectionMessage}>
          {connectionStatus === 'timeout'
            ? 'El servidor no responde. Intenta de nuevo en un momento.'
            : 'Conectando con el servidor, esto puede tardar unos segundos la primera vez…'}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: SPACING.md,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontFamily: TYPOGRAPHY.fontFamily.display,
  },
  subtitle: {
    marginBottom: SPACING.xs,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },
  sectionTitle: {
    marginTop: SPACING.sm,
    paddingBottom: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontFamily: TYPOGRAPHY.fontFamily.display,
  },
  serverError: {
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.accentGlow,
  },
  serverErrorText: {
    color: COLORS.error,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },
  submitButton: {
    marginTop: SPACING.xs,
  },
  connectionMessage: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
    textAlign: 'center',
  },
  successContent: {
    alignItems: 'center',
    gap: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  successMessage: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
    textAlign: 'center',
  },
});
