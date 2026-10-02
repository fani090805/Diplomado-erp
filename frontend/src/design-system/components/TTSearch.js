import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../tokens';

/**
 * TTSearch - Campo de búsqueda rápida de FAI Solution ERP
 */
export function TTSearch({ value, onChangeText, onClear, placeholder = 'Buscar en FAI Solution ERP…', style }) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrapper, focused && styles.focused, style]}>
      <Text pointerEvents="none" style={styles.searchIcon}>🔍</Text>
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
          <Text pointerEvents="none" style={styles.clearIcon}>✕</Text>
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
    fontSize: 13,
    marginRight: SPACING.xs + 2,
    opacity: 0.7,
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
