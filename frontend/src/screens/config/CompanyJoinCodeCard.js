import React, { useEffect, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { StyleSheet, Text, View } from 'react-native';
import { api } from '../../api/client';
import { useConfirm } from '../../components/Confirm';
import { TTButton, TTIcon } from '../../design-system/components';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../design-system/tokens';

export default function CompanyJoinCodeCard() {
  const [confirmUI, confirm] = useConfirm();
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api('/companies/me/join-code')
      .then((data) => {
        if (!cancelled) setJoinCode(data.joinCode);
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const copyJoinCode = async () => {
    try {
      await Clipboard.setStringAsync(joinCode);
      setCopied(true);
      setError('');
    } catch (copyError) {
      setError(copyError.message || 'No fue posible copiar el código.');
    }
  };

  const regenerateJoinCode = () => {
    confirm('El código anterior dejará de funcionar. ¿Deseas generar uno nuevo?', async () => {
      setLoading(true);
      setError('');
      setCopied(false);
      try {
        const data = await api('/companies/me/join-code/regenerate', { method: 'POST' });
        setJoinCode(data.joinCode);
      } catch (requestError) {
        setError(requestError.message);
        throw requestError;
      } finally {
        setLoading(false);
      }
    });
  };

  return (
    <>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.titleGroup}>
            <TTIcon name="empresa" size={20} color={COLORS.primary} />
            <Text style={styles.title}>Código de tu empresa</Text>
          </View>
          <Text style={styles.code}>{loading ? '…' : joinCode || '—'}</Text>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {copied ? <Text style={styles.success}>Código copiado.</Text> : null}
        <View style={styles.actions}>
          <TTButton
            variant="secondary"
            size="sm"
            disabled={!joinCode || loading}
            onPress={copyJoinCode}
          >
            Copiar
          </TTButton>
          <TTButton
            variant="secondary"
            size="sm"
            disabled={loading}
            onPress={regenerateJoinCode}
          >
            Generar nuevo
          </TTButton>
        </View>
      </View>
      {confirmUI}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopWidth: 3,
    borderTopColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontFamily: TYPOGRAPHY.fontFamily.display,
  },
  code: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    letterSpacing: 2,
    fontFamily: TYPOGRAPHY.fontFamily.display,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  error: {
    color: COLORS.error,
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  success: {
    color: COLORS.successText,
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
});
