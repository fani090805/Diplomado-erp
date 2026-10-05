import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import AuthRecoveryLayout from '../components/AuthRecoveryLayout';
import { TTButton, TTIcon, TTInput } from '../design-system/components';
import { COLORS, SPACING, TYPOGRAPHY } from '../design-system/tokens';

export default function ForgotPasswordScreen({ onGoLogin, onGoBack }) {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      setSubmitted(true);
    } catch (requestError) {
      setError(requestError.message || 'No fue posible enviar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthRecoveryLayout onGoBack={onGoBack}>
      {submitted ? (
        <View style={styles.success}>
          <TTIcon name="check" size={56} color={COLORS.successText} />
          <Text style={styles.title}>Revisa tu correo</Text>
          <Text style={styles.message}>Si no lo ves, busca en spam.</Text>
        </View>
      ) : (
        <>
          <Text style={styles.title}>Recuperar contraseña</Text>
          <Text style={styles.subtitle}>
            Escribe tu correo y te enviaremos un enlace para crear una nueva
          </Text>
          {error ? (
            <View accessibilityRole="alert" style={styles.errorBox}>
              <TTIcon name="alerta" size={18} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          <TTInput
            label="Correo electrónico"
            value={email}
            onChangeText={setEmail}
            placeholder="usuario@empresa.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            disabled={loading}
          />
          <TTButton
            variant="primary"
            size="lg"
            loading={loading}
            disabled={loading || !email.trim()}
            onPress={submit}
          >
            Enviar enlace
          </TTButton>
        </>
      )}
      <Pressable onPress={onGoLogin} style={styles.link}>
        <Text style={styles.linkText}>Volver a iniciar sesión</Text>
      </Pressable>
    </AuthRecoveryLayout>
  );
}

const styles = StyleSheet.create({
  title: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontFamily: TYPOGRAPHY.fontFamily.display,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },
  success: { alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.xl },
  message: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
    textAlign: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: 8,
    backgroundColor: COLORS.errorGlow,
  },
  errorText: { flex: 1, color: COLORS.error, fontSize: TYPOGRAPHY.fontSize.sm },
  link: { alignItems: 'center', paddingVertical: SPACING.xs },
  linkText: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },
});
