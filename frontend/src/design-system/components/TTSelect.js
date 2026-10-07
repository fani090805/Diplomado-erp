import React, { useState } from 'react';
import { FlatList, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { COLORS, RADIUS, SIZES, SPACING, TYPOGRAPHY } from '../tokens';
import { TTIcon } from './TTIcon';

/**
 * TTSelect - Desplegable selector de FAI Solution ERP
 *
 * - `size="toolbar"`: alto fijo de la barra de herramientas de las tablas.
 * - `valuePrefix`: antepone un texto al valor elegido ("Estado: Aprobada").
 * - `title`: título del panel cuando el control no lleva `label`.
 */
export function TTSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Seleccione una opción…',
  label,
  title,
  valuePrefix,
  size = 'md',
  error,
  disabled = false,
  style,
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [filterFocused, setFilterFocused] = useState(false);

  const selectedOption = options.find((o) => String(o.value) === String(value));
  const searchable = options.length > 8;

  const visibleOptions = searchable
    ? options.filter((o) => String(o.label).toLowerCase().includes(filter.trim().toLowerCase()))
    : options;

  const handlePick = (val) => {
    onChange(val);
    setOpen(false);
    setFilter('');
  };

  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <Pressable
        disabled={disabled}
        onPress={() => setOpen((o) => !o)}
        style={({ hovered, focused }) => [
          styles.control,
          size === 'toolbar' && styles.controlToolbar,
          open && styles.controlOpen,
          focused && styles.controlFocused,
          error && styles.controlError,
          disabled && styles.controlDisabled,
          hovered && !disabled && styles.controlHovered,
        ]}
      >
        <Text
          style={[styles.valueText, size === 'toolbar' && styles.valueTextToolbar, !selectedOption && styles.placeholderText]}
          numberOfLines={1}
        >
          {selectedOption ? (valuePrefix ? `${valuePrefix}: ${selectedOption.label}` : selectedOption.label) : placeholder}
        </Text>
        <TTIcon
          name={open ? 'chevronArriba' : 'chevronAbajo'}
          size={16}
          color={COLORS.textMuted}
          style={styles.caret}
        />
      </Pressable>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Modal o panel flotante */}
      {open ? (
        <Modal transparent visible animationType="fade" onRequestClose={() => setOpen(false)}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
            <View style={styles.panel} onStartShouldSetResponder={() => true}>
              <View style={styles.panelHeader}>
                <Text style={styles.panelTitle}>{label || title || valuePrefix || 'Seleccionar'}</Text>
                <Pressable onPress={() => setOpen(false)}>
                  <TTIcon name="cerrar" size={18} color={COLORS.textMuted} />
                </Pressable>
              </View>

              {searchable ? (
                <View style={[styles.filterWrapper, filterFocused && styles.filterFocused]}>
                  <TextInput
                    value={filter}
                    onChangeText={setFilter}
                    placeholder="Buscar opción…"
                    placeholderTextColor={COLORS.textMuted}
                    onFocus={() => setFilterFocused(true)}
                    onBlur={() => setFilterFocused(false)}
                    style={[styles.filterInput, Platform.OS === 'web' && styles.filterInputWeb]}
                    autoFocus
                  />
                </View>
              ) : null}

              <FlatList
                keyboardShouldPersistTaps="handled"
                data={[{ value: '', label: placeholder }, ...visibleOptions]}
                keyExtractor={(item, idx) => `${String(item.value)}-${idx}`}
                style={styles.list}
                renderItem={({ item }) => {
                  const isSelected = String(item.value) === String(value);
                  return (
                    <Pressable
                      style={({ hovered }) => [
                        styles.optionItem,
                        isSelected && styles.optionSelected,
                        hovered && styles.optionHovered,
                      ]}
                      onPress={() => handlePick(item.value === '' ? null : item.value)}
                    >
                      <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                        {item.label}
                      </Text>
                      {isSelected ? <TTIcon name="check" size={16} color={COLORS.primary} /> : null}
                    </Pressable>
                  );
                }}
              />
            </View>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.xs + 2,
    width: '100%',
  },
  label: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textSecondary,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },
  control: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    minHeight: 46,
  },
  controlToolbar: {
    minHeight: SIZES.toolbar,
    height: SIZES.toolbar,
    backgroundColor: COLORS.surface,
  },
  controlOpen: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  controlFocused: {
    outlineStyle: 'none',
    outlineWidth: 0,
    borderWidth: 1.5,
    borderColor: COLORS.borderFocus,
    ...Platform.select({ web: { boxShadow: `0 0 0 3px ${COLORS.primaryGlow}` } }),
  },
  controlError: {
    borderColor: COLORS.error,
  },
  controlDisabled: {
    opacity: 0.5,
  },
  controlHovered: {
    borderColor: COLORS.borderHover,
  },
  valueText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textPrimary,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },
  valueTextToolbar: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  placeholderText: {
    color: COLORS.textMuted,
  },
  caret: {
    marginLeft: SPACING.sm,
  },
  errorText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.error,
  },

  // Modal Panel
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.backdrop,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  panel: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '80%',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopWidth: 3,
    borderTopColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  panelTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    fontFamily: TYPOGRAPHY.fontFamily.display,
  },
  filterWrapper: {
    padding: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterFocused: {
    borderWidth: 1.5,
    borderColor: COLORS.borderFocus,
    borderRadius: RADIUS.sm,
    ...Platform.select({ web: { boxShadow: `0 0 0 3px ${COLORS.primaryGlow}` } }),
  },
  filterInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  filterInputWeb: {
    outlineStyle: 'none',
    outlineWidth: 0,
  },
  list: {
    maxHeight: 320,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  optionSelected: {
    backgroundColor: COLORS.primaryGlow,
  },
  optionHovered: {
    backgroundColor: COLORS.background,
  },
  optionText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },
  optionTextSelected: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
});
