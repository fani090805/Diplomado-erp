import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useAuth } from '../auth/AuthContext';
import {
  COLORS,
  RADIUS,
  SPACING,
  TYPOGRAPHY,
} from '../design-system/tokens';
import { TTButton, TTIcon, TTInput } from '../design-system/components';
import { FaiLogo } from '../components/FaiLogo';

/** Pantalla de inicio de sesión de FAI Solution ERP. */
export default function LoginScreen({ onGoRegister, onGoForgot, onGoBack }) {
  const { login } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('');
  const [logoHovered, setLogoHovered] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setConnectionStatus('');
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
      await login(email.trim(), password, { signal: controller.signal });
    } catch (e) {
      if (!timedOut) {
        setError({
          message: e.message || 'Credenciales inválidas. Verifique sus datos.',
          pending: e.code === 'ACCOUNT_PENDING',
        });
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
      <View style={[styles.shell, !isDesktop && styles.shellMobile]}>
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

        <View style={styles.formPanel}>
          <View style={styles.card}>
            <Text style={styles.welcomeTitle}>Iniciar Sesión</Text>
            <Text style={styles.welcomeSub}>Ingrese sus credenciales para acceder al ecosistema.</Text>

            {error ? (
              <View style={[styles.errorBox, error.pending && styles.pendingBox]}>
                <TTIcon
                  name="alerta"
                  size={18}
                  color={error.pending ? COLORS.warning : COLORS.error}
                />
                <Text style={[styles.errorText, error.pending && styles.pendingText]}>
                  {error.message}
                </Text>
              </View>
            ) : null}

            <TTInput
              label="Correo Electrónico"
              value={email}
              onChangeText={setEmail}
              placeholder="usuario@empresa.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              disabled={loading}
            />

            <TTInput
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              disabled={loading}
              onSubmitEditing={onSubmit}
            />

            <Pressable onPress={onGoForgot} style={styles.forgotLink}>
              <Text style={styles.registerAction}>¿Olvidaste tu contraseña?</Text>
            </Pressable>

            <TTButton
              variant="primary"
              size="lg"
              loading={loading}
              disabled={loading || !email || !password}
              onPress={onSubmit}
              style={styles.submitBtn}
            >
              Acceder al Sistema
            </TTButton>
            {connectionStatus ? (
              <Text style={styles.connectionMessage}>
                {connectionStatus === 'timeout'
                  ? 'El servidor no responde. Intenta de nuevo en un momento.'
                  : 'Conectando con el servidor, esto puede tardar unos segundos la primera vez…'}
              </Text>
            ) : null}

            <Pressable onPress={onGoRegister} style={styles.registerLink}>
              <Text style={styles.registerPrompt}>¿No tienes cuenta? </Text>
              <Text style={styles.registerAction}>Crear cuenta</Text>
            </Pressable>

            <Text style={styles.footerNote}>
              FAI Solution ERP · Sistema Seguro SSL / TLS
            </Text>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
  },
  shell: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  shellMobile: {
    flexDirection: 'column',
  },
  brandPanel: {
    flex: 1,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 420,
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
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formPanel: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    padding: SPACING['2xl'],
    gap: SPACING.md,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  welcomeTitle: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    fontFamily: TYPOGRAPHY.fontFamily.display,
  },
  welcomeSub: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textMuted,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
    marginBottom: SPACING.xs,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.errorGlow,
    borderColor: `${COLORS.error}40`,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  errorText: {
    color: COLORS.error,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  pendingBox: {
    backgroundColor: COLORS.warningGlow,
    borderColor: `${COLORS.warning}40`,
  },
  pendingText: {
    color: COLORS.warning,
  },
  submitBtn: {
    marginTop: SPACING.sm,
  },
  connectionMessage: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
    textAlign: 'center',
  },
  registerLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    paddingVertical: SPACING.xs,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    paddingVertical: SPACING.xs,
    marginTop: -SPACING.sm,
  },
  registerPrompt: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },
  registerAction: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },
  footerNote: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
});
