import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../tokens';

// Positivos/completados: success · negativos: error · pendientes/en proceso: warning
// · inactivos/borradores/cancelados: textMuted.
const STATUS_MAP = {
  // Usuarios, empresas y catálogos
  active: { color: COLORS.success, label: 'Activo' },
  pending: { color: COLORS.warning, label: 'Pendiente' },
  inactive: { color: COLORS.textMuted, label: 'Inactivo' },
  locked: { color: COLORS.error, label: 'Bloqueado' },
  suspended: { color: COLORS.error, label: 'Suspendido' },
  // Documentos y flujos de aprobación
  DRAFT: { color: COLORS.textMuted, label: 'Borrador' },
  PENDING: { color: COLORS.warning, label: 'Pendiente' },
  APPROVED: { color: COLORS.success, label: 'Aprobado' },
  REJECTED: { color: COLORS.error, label: 'Rechazado' },
  CANCELLED: { color: COLORS.textMuted, label: 'Cancelado' },
  // Producción
  RELEASED: { color: COLORS.warning, label: 'Liberada' },
  IN_PROGRESS: { color: COLORS.warning, label: 'En proceso' },
  DONE: { color: COLORS.success, label: 'Finalizada' },
  COMPLETED: { color: COLORS.success, label: 'Completado' },
  // Inventario y conteos
  POSTING: { color: COLORS.warning, label: 'Registrando' },
  PARTIAL: { color: COLORS.warning, label: 'Parcial' },
  POSTED: { color: COLORS.success, label: 'Registrado' },
  RECEIVED: { color: COLORS.success, label: 'Recibido' },
  DELIVERED: { color: COLORS.success, label: 'Entregado' },
  // Finanzas
  PAID: { color: COLORS.success, label: 'Pagado' },
  VOID: { color: COLORS.textMuted, label: 'Anulado' },
  // CRM
  NEW: { color: COLORS.info, label: 'Nuevo' },
  CONTACTED: { color: COLORS.primaryLight, label: 'Contactado' },
  QUALIFIED: { color: COLORS.warning, label: 'Calificado' },
  WON: { color: COLORS.success, label: 'Ganado' },
  LOST: { color: COLORS.error, label: 'Perdido' },
  // Obras
  PLANEADA: { color: COLORS.info, label: 'Planeada' },
  EN_PROCESO: { color: COLORS.warning, label: 'En proceso' },
  PAUSADA: { color: COLORS.warning, label: 'Pausada' },
  FINALIZADA: { color: COLORS.success, label: 'Finalizada' },
  CANCELADA: { color: COLORS.textMuted, label: 'Cancelada' },
  // Auditoría
  SUCCESS: { color: COLORS.success, label: 'Éxito' },
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
