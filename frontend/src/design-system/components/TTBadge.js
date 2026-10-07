import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../tokens';

/** Tonos del badge: fondo claro, borde un tono más fuerte, texto oscuro y punto medio. */
const TONES = {
  positive: {
    backgroundColor: COLORS.statusPositiveBg,
    borderColor: COLORS.statusPositiveBorder,
    color: COLORS.statusPositiveText,
    dot: COLORS.statusPositiveDot,
  },
  neutral: {
    backgroundColor: COLORS.statusNeutralBg,
    borderColor: COLORS.statusNeutralBorder,
    color: COLORS.statusNeutralText,
    dot: COLORS.statusNeutralDot,
  },
  pending: {
    backgroundColor: COLORS.statusPendingBg,
    borderColor: COLORS.statusPendingBorder,
    color: COLORS.statusPendingText,
    dot: COLORS.statusPendingDot,
  },
  negative: {
    backgroundColor: COLORS.statusNegativeBg,
    borderColor: COLORS.statusNegativeBorder,
    color: COLORS.statusNegativeText,
    dot: COLORS.statusNegativeDot,
  },
};

const STATUS_MAP = {
  // Usuarios, empresas y catálogos
  active: { tone: 'positive', label: 'Activo' },
  pending: { tone: 'pending', label: 'Pendiente' },
  inactive: { tone: 'neutral', label: 'Inactivo' },
  locked: { tone: 'negative', label: 'Bloqueado' },
  suspended: { tone: 'negative', label: 'Suspendido' },
  // Documentos y flujos de aprobación
  DRAFT: { tone: 'neutral', label: 'Borrador' },
  PENDING: { tone: 'pending', label: 'Pendiente' },
  IN_REVIEW: { tone: 'pending', label: 'En revisión' },
  APPROVED: { tone: 'positive', label: 'Aprobado' },
  REJECTED: { tone: 'negative', label: 'Rechazado' },
  CANCELLED: { tone: 'neutral', label: 'Cancelado' },
  OVERDUE: { tone: 'negative', label: 'Vencido' },
  // Producción
  RELEASED: { tone: 'pending', label: 'Liberada' },
  IN_PROGRESS: { tone: 'pending', label: 'En proceso' },
  DONE: { tone: 'positive', label: 'Finalizada' },
  COMPLETED: { tone: 'positive', label: 'Completado' },
  // Inventario y conteos
  POSTING: { tone: 'pending', label: 'Registrando' },
  PARTIAL: { tone: 'pending', label: 'Parcial' },
  POSTED: { tone: 'positive', label: 'Registrado' },
  RECEIVED: { tone: 'positive', label: 'Recibido' },
  DELIVERED: { tone: 'positive', label: 'Entregado' },
  // Finanzas
  PAID: { tone: 'positive', label: 'Pagado' },
  VOID: { tone: 'neutral', label: 'Anulado' },
  // CRM
  NEW: { tone: 'pending', label: 'Nuevo' },
  CONTACTED: { tone: 'pending', label: 'Contactado' },
  QUALIFIED: { tone: 'pending', label: 'Calificado' },
  WON: { tone: 'positive', label: 'Ganado' },
  LOST: { tone: 'negative', label: 'Perdido' },
  // Obras
  PLANEADA: { tone: 'neutral', label: 'Planeada' },
  EN_PROCESO: { tone: 'pending', label: 'En proceso' },
  PAUSADA: { tone: 'pending', label: 'Pausada' },
  FINALIZADA: { tone: 'positive', label: 'Finalizada' },
  CANCELADA: { tone: 'neutral', label: 'Cancelada' },
  // Auditoría
  SUCCESS: { tone: 'positive', label: 'Éxito' },
  FAILURE: { tone: 'negative', label: 'Fallo' },
};

/** Compatibilidad con la prop `variant` histórica (accent/info/error) y nombres de tono. */
const VARIANT_TONES = {
  accent: 'positive',
  success: 'positive',
  positive: 'positive',
  info: 'neutral',
  neutral: 'neutral',
  warning: 'pending',
  pending: 'pending',
  error: 'negative',
  negative: 'negative',
};

/**
 * Catálogo de estados que manda el backend (GET /api/v1/meta → statuses), el
 * mismo que usa la app Android. STATUS_MAP queda como respaldo si /meta falla.
 */
let statusCatalog = null;

/** catalog: { CODE: { label, tone } } (lo llama lib/meta.js al cargar /meta). */
export function setStatusCatalog(catalog) {
  statusCatalog = catalog || null;
}

/**
 * TTBadge - Indicador de estado de FAI Solution ERP
 */
export function TTBadge({ value, label, variant, style, textStyle }) {
  if (value === null || value === undefined || value === '') return null;

  const key = String(value);
  const info = statusCatalog?.[key] || STATUS_MAP[key] || { tone: 'neutral', label: key };
  const tone = TONES[VARIANT_TONES[variant] || info.tone];

  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: tone.backgroundColor, borderColor: tone.borderColor },
        style,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: tone.dot }]} />
      <Text style={[styles.text, { color: tone.color }, textStyle]}>{label || info.label}</Text>
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
    paddingHorizontal: SPACING.md - 2,
    paddingVertical: SPACING.xs,
    alignSelf: 'flex-start',
    minHeight: 26,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: RADIUS.pill,
  },
  text: {
    fontSize: 13,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },
});
