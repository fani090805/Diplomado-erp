import React, { Fragment, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { BREAKPOINTS, COLORS, RADIUS, SIZES, SPACING, TYPOGRAPHY } from '../tokens';
import { TTButton } from './TTButton';
import { TTEmptyState } from './TTEmptyState';
import { TTLoading } from './TTLoading';
import { TTSearch } from './TTSearch';
import { TTIcon } from './TTIcon';

/**
 * TTTable - Tabla de datos empresarial de FAI Solution ERP
 *
 * Barra de herramientas (a la derecha del título), en este orden:
 *   [filters…] [Buscar] [Refrescar] [extraActions…] [+ Crear]
 * Todo mide SIZES.toolbar (44 px) con SIZES.toolbarGap (12 px) entre
 * controles: los filtros usan <TTSelect size="toolbar" /> y los botones
 * <TTButton size="toolbar" />. `filters` y `extraActions` aceptan un
 * elemento, un fragmento o un arreglo. `headerExtra` es el nombre anterior
 * de `extraActions` (se mantiene por compatibilidad).
 * En pantallas < BREAKPOINTS.tablet el título va arriba y los controles debajo,
 * a todo el ancho, con el botón de crear al final.
 */

const countFormatter = new Intl.NumberFormat('es-MX');

/** 10000 → "10,000" (conteos de registros con separador de miles). */
export function formatCount(value) {
  return countFormatter.format(Number(value) || 0);
}

/** Aplana fragmentos/arreglos en una lista de elementos (ignora null/false). */
function toItems(node) {
  const out = [];
  React.Children.forEach(node, (child) => {
    if (!child) return;
    if (child.type === Fragment) out.push(...toItems(child.props.children));
    else out.push(child);
  });
  return out;
}
/** Cabecera y celdas comparten base y crecimiento para quedar alineadas. */
function columnSize(col) {
  const width = col.width || 130;
  return { minWidth: width, flexBasis: width, flexGrow: 1 };
}

function actionHoverStyle(action) {
  if (action.danger) return styles.actionDangerHover;
  if (action.primary) return styles.actionPrimaryHover;
  return styles.actionBtnHover;
}

export function TTTable({
  title,
  subtitle,
  columns = [],
  rows = [],
  loading = false,
  error = null,
  search = '',
  onSearchChange,
  onRefresh,
  page = 1,
  total = 0,
  limit = 20,
  onPageChange,
  onCreate,
  createLabel = 'Nuevo',
  rowActions,
  emptyText = 'No hay datos registrados en este módulo.',
  emptyTitle = 'Sin datos disponibles',
  headerExtra = null,
  filters = null,
  extraActions = null,
  emptyIcon = 'carpetaVacia',
}) {
  const [searchDraft, setSearchDraft] = useState(search);
  const { width } = useWindowDimensions();
  const isMobile = width < BREAKPOINTS.tablet;

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const handleSearchSubmit = (val) => {
    setSearchDraft(val);
    if (onSearchChange) onSearchChange(val);
  };

  return (
    <View style={styles.container}>
      {/* Header: título + barra de herramientas */}
      <View style={[styles.headerRow, isMobile && styles.headerRowMobile]}>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>

        <View style={[styles.toolbar, isMobile && styles.toolbarMobile]}>
          {toItems(filters).map((item, index) => (
            <View key={`f${index}`} style={isMobile ? styles.mobileFull : styles.filterItem}>
              {item}
            </View>
          ))}

          {onSearchChange ? (
            <View style={isMobile ? styles.mobileFull : styles.searchItem}>
              <TTSearch
                value={searchDraft}
                onChangeText={handleSearchSubmit}
                placeholder="Buscar registros…"
                style={styles.searchControl}
              />
            </View>
          ) : null}

          {onRefresh ? (
            <View style={isMobile ? styles.mobileIcon : null}>
              <TTButton
                variant="secondary"
                size="toolbar"
                onPress={onRefresh}
                style={styles.iconButton}
                iconLeft={<TTIcon name="refrescar" size={18} color={COLORS.textPrimary} />}
                accessibilityLabel="Actualizar"
              />
            </View>
          ) : null}

          {toItems(extraActions || headerExtra).map((item, index) => (
            <View key={`a${index}`} style={isMobile ? styles.mobileAction : null}>
              {item}
            </View>
          ))}

          {onCreate ? (
            <View style={isMobile ? styles.mobileFull : null}>
              <TTButton
                variant="primary"
                size="toolbar"
                onPress={onCreate}
                iconLeft={<TTIcon name="agregar" size={16} color={COLORS.textInverted} />}
              >
                {createLabel}
              </TTButton>
            </View>
          ) : null}
        </View>
      </View>

      {/* Banner de Error */}
      {error ? (
        <View style={styles.errorBox}>
          <TTIcon name="alerta" size={18} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Contenedor de Tabla */}
      <View style={styles.tableCard}>
        <ScrollView horizontal contentContainerStyle={styles.tableScroll}>
          <View style={styles.tableBody}>
            {/* Cabecera de Tabla */}
            <View style={[styles.row, styles.headRow]}>
              {columns.map((col) => (
                <Text
                  key={col.key}
                  style={[styles.th, columnSize(col)]}
                >
                  {col.label}
                </Text>
              ))}
              {rowActions ? <Text style={[styles.th, styles.thActions]}>Acciones</Text> : null}
            </View>

            {/* Cuerpo de Tabla */}
            {loading ? (
              <TTLoading text="Cargando información..." />
            ) : rows.length === 0 ? (
              <TTEmptyState
                icon={emptyIcon}
                title={emptyTitle}
                description={error ? error : emptyText}
                actionLabel={onCreate ? createLabel : undefined}
                onAction={onCreate}
              />
            ) : (
              rows.map((row, idx) => (
                <View
                  key={String(row._id || idx)}
                  style={[styles.row, idx % 2 === 1 && styles.rowAlternate]}
                >
                  {columns.map((col) => (
                    <View
                      key={col.key}
                      style={[columnSize(col), styles.cell]}
                    >
                      {col.render ? (
                        col.render(row)
                      ) : (
                        <Text style={styles.td}>{formatCell(row[col.key])}</Text>
                      )}
                    </View>
                  ))}

                  {rowActions ? (
                    <View style={styles.actionsCell}>
                      {rowActions(row).map((action) => (
                        <Pressable
                          key={action.label}
                          onPress={action.onPress}
                          hitSlop={6}
                          style={({ hovered, pressed }) => [
                            styles.actionBtn,
                            action.danger && styles.actionDanger,
                            action.primary && styles.actionPrimary,
                            hovered && actionHoverStyle(action),
                            pressed && styles.actionPressed,
                          ]}
                        >
                          <Text
                            pointerEvents="none"
                            style={[
                              styles.actionText,
                              action.danger && styles.actionDangerText,
                              action.primary && styles.actionPrimaryText,
                            ]}
                          >
                            {action.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </View>

      {/* Paginación en Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Mostrando <Text style={styles.footerHighlight}>{formatCount(from)}–{formatCount(to)}</Text> de{' '}
          <Text style={styles.footerHighlight}>{formatCount(total)}</Text> registros · Página{' '}
          <Text style={styles.footerHighlight}>{formatCount(page)}</Text> de {formatCount(totalPages)}
        </Text>

        {onPageChange ? (
          <View style={styles.pager}>
            <Pressable
              disabled={page <= 1}
              onPress={() => onPageChange(page - 1)}
              style={({ hovered }) => [
                styles.pageBtn,
                page <= 1 && styles.pageDisabled,
                hovered && page > 1 && styles.pageHovered,
              ]}
            >
              <View style={styles.pageBtnContent}>
                <TTIcon name="flechaIzquierda" size={14} color={COLORS.textSecondary} />
                <Text style={styles.pageBtnText}>Prev</Text>
              </View>
            </Pressable>

            <Pressable
              disabled={page >= totalPages}
              onPress={() => onPageChange(page + 1)}
              style={({ hovered }) => [
                styles.pageBtn,
                page >= totalPages && styles.pageDisabled,
                hovered && page < totalPages && styles.pageHovered,
              ]}
            >
              <View style={styles.pageBtnContent}>
                <Text style={styles.pageBtnText}>Sig</Text>
                <TTIcon name="flechaDerecha" size={14} color={COLORS.textSecondary} />
              </View>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function formatCell(val) {
  if (val === null || val === undefined || val === '') return '—';
  if (typeof val === 'object') return val.name || val.code || val.sku || val._id || '—';
  return String(val);
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.md,
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SIZES.toolbarGap,
    flexWrap: 'wrap',
    zIndex: 20, // menús desplegables de la barra por encima de la tabla
  },
  headerRowMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  headerTitleGroup: {
    gap: SPACING.xs / 2,
    flexShrink: 0,
  },
  // Barra: a la derecha; si no cabe, baja a otra línea alineada a la derecha.
  toolbar: {
    flexGrow: 1,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: SIZES.toolbarGap,
  },
  toolbarMobile: {
    justifyContent: 'flex-start',
  },
  filterItem: { width: 200 },
  searchItem: { width: 240 },
  searchControl: { height: SIZES.toolbar, minWidth: 0 },
  iconButton: { width: SIZES.toolbar, paddingHorizontal: 0 },
  // Móvil: filtros, búsqueda y crear a todo el ancho; acciones comparten fila.
  mobileFull: { flexBasis: '100%', flexGrow: 1 },
  mobileAction: { flexGrow: 1, flexBasis: 120 },
  mobileIcon: { flexGrow: 0 },
  title: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: TYPOGRAPHY.fontWeight.extrabold,
    color: COLORS.textPrimary,
    fontFamily: TYPOGRAPHY.fontFamily.display,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textMuted,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: `${COLORS.error}15`,
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

  // Table Structure
  tableCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopWidth: 3,
    borderTopColor: COLORS.primary,
    overflow: 'hidden',
  },
  tableScroll: {
    minWidth: '100%',
  },
  // Ocupa todo el ancho de la tarjeta; con más columnas que espacio, desplaza.
  tableBody: {
    flexGrow: 1,
  },
  cell: {
    paddingVertical: SPACING.md,
    paddingRight: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    minHeight: 56,
  },
  headRow: {
    backgroundColor: COLORS.background,
  },
  rowAlternate: {
    backgroundColor: COLORS.card,
  },
  th: {
    paddingVertical: SPACING.md,
    paddingRight: SPACING.sm,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },
  thActions: {
    minWidth: 160,
    flexBasis: 160,
    flexGrow: 1,
  },
  td: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textPrimary,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },

  // Actions Column
  actionsCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs + 2,
    paddingVertical: SPACING.sm,
    minWidth: 160,
    flexBasis: 160,
    flexGrow: 1,
    flexWrap: 'wrap',
  },
  actionBtn: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md - 2,
    paddingVertical: SPACING.xs + 1,
    ...Platform.select({
      web: { cursor: 'pointer', userSelect: 'none' },
    }),
  },
  actionPressed: {
    opacity: 0.75,
  },
  actionBtnHover: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryGlow,
  },
  actionText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  actionDanger: {
    backgroundColor: COLORS.errorGlow,
    borderColor: `${COLORS.error}40`,
  },
  actionDangerHover: {
    backgroundColor: `${COLORS.error}22`,
    borderColor: COLORS.error,
  },
  actionDangerText: {
    color: COLORS.error,
  },
  actionPrimary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  actionPrimaryHover: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primaryLight,
  },
  actionPrimaryText: {
    color: COLORS.textInverted,
  },

  // Footer Pager
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.fontSize.xs + 1,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },
  footerHighlight: {
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  pager: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  pageBtn: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
  },
  pageBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  pageHovered: {
    borderColor: COLORS.borderHover,
    backgroundColor: COLORS.cardElevated,
  },
  pageDisabled: {
    opacity: 0.3,
  },
  pageBtnText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.fontSize.xs + 1,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
});
