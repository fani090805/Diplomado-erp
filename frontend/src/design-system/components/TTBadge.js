import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../tokens';

const STATUS_MAP = {
  active: { color: COLORS.accent, label: 'Activo' },
  inactive: { color: COLORS.textMuted, label: 'Inactivo' },
  locked: { color: COLORS.error, label: 'Bloqueado' },
  suspended: { color: COLORS.error, label: 'Suspendido' },
  DRAFT: { color: COLORS.textMuted, label: 'Borrador' },
  APPROVED: { color: COLORS.accent, label: 'Aprobado' },
  REJECTED: { color: COLORS.error, label: 'Rechazado' },
  RELEASED: { color: COLORS.info, label: 'Liberada' },
  DONE: { color: COLORS.accent, label: 'Finalizada' },
  CANCELLED: { color: COLORS.textMuted, label: 'Cancelado' },
  POSTED: { color: COLORS.accent, label: 'Registrado' },
  VOID: { color: COLORS.textMuted, label: 'Anulado' },
  NEW: { color: COLORS.info, label: 'Nuevo' },
  CONTACTED: { color: COLORS.primaryLight, label: 'Contactado' },
  QUALIFIED: { color: COLORS.warning, label: 'Calificado' },
  WON: { color: COLORS.accent, label: 'Ganado' },
  LOST: { color: COLORS.error, label: 'Perdido' },
  SUCCESS: { color: COLORS.accent, label: 'Éxito' },
  FAILURE: { color: COLORS.error, label: 'Fallo' },
};

/**
 * TTBadge - Indicador de estado de FAI Solution ERP
 */
export function TTBadge({ value, label, variant, style, textStyle }) {
  if (value === null || value === undefined || value === '') return null;

  const key = String(value);
  const info = STATUS_MAP[key] || { color: COLORS.textSecondary, label: key };

  const badgeLabel = label || info.label;
  const badgeColor = variant === 'accent' ? COLORS.accent : variant === 'info' ? COLORS.info : variant === 'error' ? COLORS.error : info.color;
  const isDarkBadge = [COLORS.accent, COLORS.info, COLORS.primary, COLORS.success, COLORS.warning].includes(badgeColor);
  const badgeTextColor = isDarkBadge ? COLORS.textInverted : COLORS.textPrimary;

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: isDarkBadge ? badgeColor : `${badgeColor}18`,
          borderColor: `${badgeColor}44`,
        },
        style,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: isDarkBadge ? COLORS.surface : badgeColor }]} />
      <Text style={[styles.text, { color: badgeTextColor }, textStyle]}>
        {badgeLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs + 2,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    alignSelf: 'flex-start',
    minHeight: 28,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  text: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
    letterSpacing: 0.2,
  },
});
