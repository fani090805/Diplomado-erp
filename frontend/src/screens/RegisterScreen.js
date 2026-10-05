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
import { TTButton, TTIcon, TTInput } from '../design-system/components';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../design-system/tokens';
import { FaiLogo } from '../components/FaiLogo';
import PasswordRequirements from '../components/PasswordRequirements';
import CompanyRequestForm from './register/CompanyRequestForm';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const REGISTER_OPTIONS = [
  {
    mode: 'company',
    icon: 'empresa',
    title: 'Registrar mi empresa',
    description: 'Soy el dueño o encargado y quiero usar FAI en mi negocio.',
  },
  {
    mode: 'join',
    icon: 'usuarios',
    title: 'Unirme a mi empresa',
    description: 'Mi empresa ya usa FAI y tengo un código.',
  },
];

export default function RegisterScreen({ onGoLogin, onGoBack }) {
  const { register } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const [logoHovered, setLogoHovered] = useState(false);
  const [form, setForm] = useState({
    name: '',
    lastName: '',
    companyCode: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('');
  const [registrationSucceeded, setRegistrationSucceeded] = useState(false);
  // null = elegir opción | 'join' = unirse con código | 'company' = registrar empresa
  const [mode, setMode] = useState(null);
  const [companySubmitted, setCompanySubmitted] = useState(false);

  const changeOption = () => {
    setMode(null);
    setServerError('');
    setErrors({});
  };

  const update = (field) => (value) => {
    setForm((current) => ({
      ...current,
      [field]: field === 'companyCode' ? value.toUpperCase() : value,
    }));
    setErrors((current) => ({ ...current, [field]: '' }));
    setServerError('');
  };

  const validate = () => {
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Ingresa un nombre de al menos 2 caracteres.';
    if (form.name.trim().length > 100) next.name = 'El nombre no puede exceder 100 caracteres.';
    if (form.lastName.trim().length > 100) next.lastName = 'El apellido no puede exceder 100 caracteres.';
    if (!form.companyCode.trim()) {
      next.companyCode = 'Ingresa el código de tu empresa.';
    }
    if (form.companyCode.trim().length > 10) {
      next.companyCode = 'El código de empresa no puede exceder 10 caracteres.';
    }
    if (!EMAIL_PATTERN.test(form.email.trim())) next.email = 'Ingresa un correo electrónico válido.';
    if (
      form.password.length < 8 ||
      !/[A-Za-z]/.test(form.password) ||
      !/\d/.test(form.password)
    ) {
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
    setConnectionStatus('');
    if (!validate()) return;

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
      await register({
        name: form.name.trim(),
        lastName: form.lastName.trim(),
        companyCode: form.companyCode.trim().toUpperCase(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      }, { signal: controller.signal });
      setRegistrationSucceeded(true);
    } catch (error) {
      if (!timedOut) {
        setServerError(
          error.status
            ? error.message
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.shell, !isDesktop && styles.shellStacked]}>
        {isDesktop ? (
          <View style={styles.brandPanel}>
            <Pressable
              onPress={onGoBack}
              accessibilityRole="button"
              accessibilityLabel="Volver al inicio"
              onHoverIn={() => setLogoHovered(true)}
              onHoverOut={() => setLogoHovered(false)}
              style={({ hovered, pressed }) => [
                styles.brandAction,
                hovered && styles.brandActionHovered,
                pressed && styles.brandActionPressed,
              ]}
            >
              <FaiLogo size="xl" layout="vertical" variant="dark" />
              <Text style={[styles.backHomeText, logoHovered && styles.backHomeTextHovered]}>
                ← Volver al inicio
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.mobileBrand}>
            <Pressable
              onPress={onGoBack}
              accessibilityRole="button"
              accessibilityLabel="Volver al inicio"
              onHoverIn={() => setLogoHovered(true)}
              onHoverOut={() => setLogoHovered(false)}
              style={({ hovered, pressed }) => [
                styles.brandAction,
                hovered && styles.brandActionHovered,
                pressed && styles.brandActionPressed,
              ]}
            >
              <FaiLogo size="lg" layout="vertical" variant="dark" />
              <Text style={[styles.backHomeText, logoHovered && styles.backHomeTextHovered]}>
                ← Volver al inicio
              </Text>
            </Pressable>
          </View>
        )}

        <ScrollView
          style={styles.formPanel}
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            {mode && !registrationSucceeded && !companySubmitted ? (
              <Pressable
                onPress={changeOption}
                accessibilityRole="button"
                style={({ hovered }) => [styles.changeOption, hovered && styles.changeOptionHovered]}
              >
                <Text style={styles.changeOptionText}>← Cambiar opción</Text>
              </Pressable>
            ) : null}
            {mode === null ? (
              <>
                <Text style={styles.title}>Crear cuenta</Text>
                <Text style={styles.subtitle}>¿Cómo quieres empezar con FAI Solution ERP?</Text>
                {REGISTER_OPTIONS.map((option) => (
                  <Pressable
                    key={option.mode}
                    onPress={() => setMode(option.mode)}
                    accessibilityRole="button"
                    accessibilityLabel={option.title}
                    style={({ hovered, pressed }) => [
                      styles.optionCard,
                      hovered && styles.optionCardHovered,
                      pressed && styles.optionCardPressed,
                    ]}
                  >
                    <View style={styles.optionIcon}>
                      <TTIcon name={option.icon} size={28} color={COLORS.primary} />
                    </View>
                    <View style={styles.optionText}>
                      <Text style={styles.optionTitle}>{option.title}</Text>
                      <Text style={styles.optionDescription}>{option.description}</Text>
                    </View>
                    <TTIcon name="flechaDerecha" size={20} color={COLORS.textMuted} />
                  </Pressable>
                ))}
                <Pressable onPress={onGoLogin} style={styles.loginLink}>
                  <Text style={styles.loginPrompt}>¿Ya tienes cuenta? </Text>
                  <Text style={styles.loginAction}>Inicia sesión</Text>
                </Pressable>
              </>
            ) : mode === 'company' ? (
              <CompanyRequestForm
                onSubmitted={() => setCompanySubmitted(true)}
                onGoHome={onGoBack}
              />
            ) : registrationSucceeded ? (
              <View style={styles.successContent}>
                <TTIcon name="check" size={64} color={COLORS.successText} />
                <Text style={styles.title}>¡Cuenta creada!</Text>
                <Text style={styles.successMessage}>
                  Un administrador debe aprobar tu acceso. Te avisaremos cuando puedas entrar.
                </Text>
                <TTButton variant="primary" size="lg" onPress={onGoLogin}>
                  Ir a iniciar sesión
                </TTButton>
              </View>
            ) : (
              <>
                <Text style={styles.title}>Crear cuenta</Text>
                <Text style={styles.subtitle}>
                  Únete al espacio de tu empresa en FAI Solution ERP
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
                  label="Código de empresa"
                  required
                  value={form.companyCode}
                  onChangeText={update('companyCode')}
                  placeholder="FAI-XXXXXX"
                  autoCapitalize="characters"
                  disabled={loading}
                  error={errors.companyCode}
                  hint="Pídeselo al administrador de tu empresa"
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
                  Crear cuenta
                </TTButton>
                {connectionStatus ? (
                  <Text style={styles.connectionMessage}>
                    {connectionStatus === 'timeout'
                      ? 'El servidor no responde. Intenta de nuevo en un momento.'
                      : 'Conectando con el servidor, esto puede tardar unos segundos la primera vez…'}
                  </Text>
                ) : null}

                <Pressable onPress={onGoLogin} style={styles.loginLink}>
                  <Text style={styles.loginPrompt}>¿Ya tienes cuenta? </Text>
                  <Text style={styles.loginAction}>Inicia sesión</Text>
                </Pressable>
              </>
            )}
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
  brandAction: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
    ...Platform.select({
      web: { cursor: 'pointer', transition: 'transform 180ms ease, opacity 180ms ease' },
    }),
  },
  brandActionHovered: {
    transform: [{ scale: 1.04 }],
  },
  brandActionPressed: {
    opacity: 0.8,
  },
  backHomeText: {
    color: COLORS.textInverted,
    opacity: 0.6,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
    ...Platform.select({ web: { transition: 'opacity 180ms ease' } }),
  },
  backHomeTextHovered: {
    opacity: 1,
  },
  mobileBrand: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.primary,
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
  changeOption: {
    alignSelf: 'flex-start',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    marginLeft: -SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  changeOptionHovered: {
    backgroundColor: COLORS.background,
  },
  changeOptionText: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.background,
    ...Platform.select({
      web: { cursor: 'pointer', transition: 'border-color 160ms ease, transform 160ms ease' },
    }),
  },
  optionCardHovered: {
    borderColor: COLORS.primary,
    transform: [{ translateY: -2 }],
  },
  optionCardPressed: {
    opacity: 0.85,
  },
  optionIcon: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryGlow,
  },
  optionText: {
    flex: 1,
    gap: SPACING.xs,
  },
  optionTitle: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontFamily: TYPOGRAPHY.fontFamily.display,
  },
  optionDescription: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
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
  submitButton: {
    marginTop: SPACING.xs,
  },
  connectionMessage: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
    textAlign: 'center',
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