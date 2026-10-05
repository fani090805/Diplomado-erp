import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { api } from '../../api/client';
import { TTButton, TTSelect } from '../../design-system/components';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../design-system/tokens';

export default function PendingUserApprovalModal({
  user,
  roleOptions,
  branchOptions,
  rolesLoading,
  branchesLoading,
  onClose,
  onApproved,
}) {
  const [roleId, setRoleId] = useState(null);
  const [branchId, setBranchId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setRoleId(null);
    setBranchId(null);
    setError('');
  }, [user]);

  const approve = async () => {
    if (!roleId) {
      setError('Selecciona el rol que tendrá esta persona.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api(`/users/${user._id}/approve`, {
        method: 'PATCH',
        body: {
          roleId,
          ...(branchId ? { branchId } : {}),
        },
      });
      onClose();
      onApproved();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={Boolean(user)} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <Text style={styles.title}>Aprobar solicitud</Text>
          {user ? (
            <Text style={styles.subtitle}>
              {`${user.name} ${user.lastName || ''}`.trim()} · {user.email}
            </Text>
          ) : null}
          <TTSelect
            label="Rol"
            value={roleId}
            onChange={setRoleId}
            options={roleOptions}
            placeholder="Selecciona un rol"
            error={error && !roleId ? error : undefined}
          />
          <TTSelect
            label="Sucursal (opcional)"
            value={branchId}
            onChange={setBranchId}
            options={branchOptions}
            placeholder="Usar sucursal principal"
          />
          {error && roleId ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          ) : null}
          <View style={styles.actions}>
            <TTButton variant="secondary" onPress={onClose} disabled={loading}>
              Cancelar
            </TTButton>
            <TTButton
              variant="primary"
              onPress={approve}
              loading={loading}
              disabled={loading || rolesLoading || branchesLoading}
            >
              Aprobar
            </TTButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.backdrop,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
  },
  modal: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopWidth: 3,
    borderTopColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    gap: SPACING.lg,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontFamily: TYPOGRAPHY.fontFamily.display,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
  },
  error: {
    color: COLORS.error,
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
});
