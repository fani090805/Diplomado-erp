import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
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
import { TTButton, TTInput } from '../design-system/components';
import { FaiLogo } from '../components/FaiLogo';

/** Pantalla de inicio de sesión de FAI Solution ERP. */
export default function LoginScreen() {
  const { login } = useAuth();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e) {
      setError(e.message || 'Credenciales inválidas. Verifique sus datos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.shell, isMobile && styles.shellMobile]}>
        {!isMobile ? (
          <View style={styles.brandPanel}>
            <View style={styles.brandInner}>
              <FaiLogo size="lg" layout="vertical" variant="dark" />
            </View>
          </View>
        ) : (
          <View style={styles.mobileBrand}>
            <FaiLogo size="lg" layout="vertical" variant="dark" />
          </View>
        )}

        <View style={styles.formPanel}>
          <View style={styles.card}>
            <Text style={styles.welcomeTitle}>Iniciar Sesión</Text>
            <Text style={styles.welcomeSub}>Ingrese sus credenciales para acceder al ecosistema.</Text>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
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
  brandInner: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.sidebarActiveBg,
    borderWidth: 1,
    borderColor: COLORS.sidebarTextMuted,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
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
  submitBtn: {
    marginTop: SPACING.sm,
  },
  footerNote: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
});
