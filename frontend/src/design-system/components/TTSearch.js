import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../tokens';
import { TTIcon } from './TTIcon';

/**
 * TTSearch - Campo de búsqueda rápida de FAI Solution ERP
 */
export function TTSearch({ value, onChangeText, onClear, placeholder = 'Buscar en FAI Solution ERP…', style }) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrapper, focused && styles.focused, style]}>
      <TTIcon name="buscar" size={16} color={COLORS.textMuted} style={styles.searchIcon} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.input, Platform.OS === 'web' && styles.inputWeb]}
      />
      {value ? (
        <Pressable
          hitSlop={8}
          style={({ hovered, pressed }) => [
            styles.clearBtn,
            hovered && styles.clearBtnHovered,
            pressed && styles.clearBtnPressed,
          ]}
          onPress={() => {
            if (onChangeText) onChangeText('');
            if (onClear) onClear();
          }}
        >
          <TTIcon name="cerrar" size={14} color={COLORS.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 38,
    minWidth: 220,
  },
  focused: {
    borderWidth: 1.5,
    borderColor: COLORS.borderFocus,
    backgroundColor: COLORS.card,
    ...Platform.select({
      web: { boxShadow: `0 0 0 3px ${COLORS.primaryGlow}` },
      default: {
        shadowColor: COLORS.borderFocus,
        shadowOpacity: 0.12,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
    }),
  },
  searchIcon: {
    marginRight: SPACING.xs + 2,
  },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
    paddingVertical: 0,
  },
  inputWeb: {
    outlineStyle: 'none',
    outlineWidth: 0,
  },
  clearBtn: {
    padding: SPACING.xs,
    borderRadius: RADIUS.pill,
    ...Platform.select({
      web: { cursor: 'pointer', userSelect: 'none' },
    }),
  },
  clearBtnHovered: {
    backgroundColor: COLORS.primaryGlow,
  },
  clearBtnPressed: {
    opacity: 0.7,
  },
  clearIcon: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
});
