import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { TTButton, TTInput } from '../design-system/components';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../design-system/tokens';
import { FaiLogo } from '../components/FaiLogo';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen({ onGoLogin, onGoBack }) {
  const { register } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const [form, setForm] = useState({
    name: '',
    lastName: '',
    companyName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field) => (value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
    setServerError('');
  };

  const passwordRequirements = [
    { label: 'Mínimo 8 caracteres', met: form.password.length >= 8 },
    { label: 'Al menos una letra', met: /[A-Za-z]/.test(form.password) },
    { label: 'Al menos un número', met: /\d/.test(form.password) },
  ];

  const validate = () => {
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Ingresa un nombre de al menos 2 caracteres.';
    if (form.name.trim().length > 100) next.name = 'El nombre no puede exceder 100 caracteres.';
    if (form.lastName.trim().length > 100) next.lastName = 'El apellido no puede exceder 100 caracteres.';
    if (form.companyName.trim().length < 2) {
      next.companyName = 'Ingresa un nombre de empresa de al menos 2 caracteres.';
    }
    if (form.companyName.trim().length > 120) {
      next.companyName = 'El nombre de la empresa no puede exceder 120 caracteres.';
    }
    if (!EMAIL_PATTERN.test(form.email.trim())) next.email = 'Ingresa un correo electrónico válido.';
    if (!passwordRequirements.every((requirement) => requirement.met)) {
      next.password = 'La contraseña debe cumplir todos los requisitos.';
    }
    if (form.confirmPassword !== form.password) {
      next.confirmPassword = 'Las contraseñas no coinciden.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async () => {
    setServerError('');
    if (!validate()) return;

    setLoading(true);
    try {
      await register({
        name: form.name.trim(),
        lastName: form.lastName.trim(),
        companyName: form.companyName.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
    } catch (error) {
      setServerError(
        error.status
          ? error.message
          : 'No fue posible conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.shell, !isDesktop && styles.shellStacked]}>
        {isDesktop ? (
          <View style={styles.brandPanel}>
            <FaiLogo size="lg" layout="vertical" variant="dark" />
            <Text style={styles.brandMessage}>Gestiona tu empresa en un solo lugar</Text>
          </View>
        ) : (
          <View style={styles.mobileBrand}>
            <FaiLogo size="lg" layout="vertical" variant="dark" />
          </View>
        )}

        <ScrollView
          style={styles.formPanel}
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            {onGoBack ? (
              <Pressable onPress={onGoBack} style={styles.desktopBackLink}>
                <Text style={styles.backLinkText}>Volver</Text>
              </Pressable>
            ) : null}
            <Text style={styles.title}>Crear cuenta</Text>
            <Text style={styles.subtitle}>
              Registra tu empresa y empieza a usar FAI Solution ERP
            </Text>

            {serverError ? (
              <View accessibilityRole="alert" style={styles.serverError}>
                <Text style={styles.serverErrorText}>{serverError}</Text>
              </View>
            ) : null}

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
              label="Nombre de la empresa"
              required
              value={form.companyName}
              onChangeText={update('companyName')}
              placeholder="Nombre de tu empresa"
              disabled={loading}
              error={errors.companyName}
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
            <View style={styles.requirements}>
              {passwordRequirements.map((requirement) => (
                <View key={requirement.label} style={styles.requirementRow}>
                  <Text
                    style={[
                      styles.requirementMark,
                      requirement.met ? styles.requirementMet : styles.requirementUnmet,
                    ]}
                  >
                    {requirement.met ? '✓' : '•'}
                  </Text>
                  <Text
                    style={[
                      styles.requirementText,
                      requirement.met ? styles.requirementMet : styles.requirementUnmet,
                    ]}
                  >
                    {requirement.label}
                  </Text>
                </View>
              ))}
            </View>
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
              Crear cuenta
            </TTButton>

            <Pressable onPress={onGoLogin} style={styles.loginLink}>
              <Text style={styles.loginPrompt}>¿Ya tienes cuenta? </Text>
              <Text style={styles.loginAction}>Inicia sesión</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  shell: {
    flex: 1,
    flexDirection: 'row',
  },
  shellStacked: {
    flexDirection: 'column',
  },
  brandPanel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING['2xl'],
    padding: SPACING['3xl'],
    backgroundColor: COLORS.primary,
  },
  brandMessage: {
    maxWidth: '80%',
    color: COLORS.textInverted,
    textAlign: 'center',
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontFamily: TYPOGRAPHY.fontFamily.display,
  },
  mobileBrand: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.primary,
  },
  desktopBackLink: {
    alignSelf: 'flex-start',
  },
  backLinkText: {
    color: COLORS.textInverted,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },
  formPanel: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  formContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  card: {
    width: '100%',
    gap: SPACING.md,
    padding: SPACING['2xl'],
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surface,
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
  requirements: {
    gap: SPACING.xs,
    marginTop: -SPACING.sm,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  requirementMark: {
    width: SPACING.lg,
    textAlign: 'center',
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  requirementText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },
  requirementMet: {
    color: COLORS.successText,
  },
  requirementUnmet: {
    color: COLORS.textMuted,
  },
  submitButton: {
    marginTop: SPACING.xs,
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    paddingVertical: SPACING.xs,
  },
  loginPrompt: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },
  loginAction: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },
});