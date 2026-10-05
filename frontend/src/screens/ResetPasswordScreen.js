import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import AuthRecoveryLayout from '../components/AuthRecoveryLayout';
import PasswordRequirements from '../components/PasswordRequirements';
import { TTButton, TTIcon, TTInput } from '../design-system/components';
import { COLORS, SPACING, TYPOGRAPHY } from '../design-system/tokens';

export default function ResetPasswordScreen({ token, onGoLogin, onRequestNewLink }) {
  const { resetPassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [invalidToken, setInvalidToken] = useState(!token);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const submit = async () => {
    setError('');
    if (!token) {
      setInvalidToken(true);
      return;
    }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError('La contraseña debe cumplir todos los requisitos.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      setSuccess(true);
    } catch (requestError) {
      // 400: token vencido/usado; 422: token mal formado (la contraseña ya se validó aquí).
      if (requestError.status === 400 || requestError.status === 422) setInvalidToken(true);
      else setError(requestError.message || 'No fue posible actualizar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthRecoveryLayout onGoBack={onGoLogin}>
      {success ? (
        <View style={styles.success}>
          <TTIcon name="check" size={56} color={COLORS.successText} />
          <Text style={styles.title}>¡Contraseña actualizada!</Text>
          <TTButton variant="primary" size="lg" onPress={onGoLogin}>
            Iniciar sesión
          </TTButton>
        </View>
      ) : invalidToken ? (
        <View style={styles.success}>
          <TTIcon name="alerta" size={48} color={COLORS.warning} />
          <Text style={styles.title}>Enlace no válido</Text>
          <Text style={styles.message}>El enlace no es válido o ya venció.</Text>
          <TTButton variant="primary" size="lg" onPress={onRequestNewLink}>
            Solicitar un nuevo enlace
          </TTButton>
        </View>
      ) : (
        <>
          <Text style={styles.title}>Crear nueva contraseña</Text>
          {error ? (
            <View accessibilityRole="alert" style={styles.errorBox}>
              <TTIcon name="alerta" size={18} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          <TTInput
            label="Nueva contraseña"
            required
            value={password}
            onChangeText={setPassword}
            placeholder="Crea una contraseña"
            secureTextEntry
            autoComplete="new-password"
            disabled={loading}
          />
          <PasswordRequirements password={password} />
          <TTInput
            label="Confirmar contraseña"
            required
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Repite tu contraseña"
            secureTextEntry
            autoComplete="new-password"
            disabled={loading}
          />
          <TTButton
            variant="primary"
            size="lg"
            loading={loading}
            disabled={loading}
            onPress={submit}
          >
            Guardar contraseña
          </TTButton>
        </>
      )}
      {!success && !invalidToken ? (
        <Pressable onPress={onGoLogin} style={styles.link}>
          <Text style={styles.linkText}>Volver a iniciar sesión</Text>
        </Pressable>
      ) : null}
    </AuthRecoveryLayout>
  );
}

const styles = StyleSheet.create({
  title: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontFamily: TYPOGRAPHY.fontFamily.display,
    textAlign: 'center',
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
