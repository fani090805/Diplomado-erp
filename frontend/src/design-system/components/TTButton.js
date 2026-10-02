import React from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../tokens';

/**
 * TTButton - Botón de FAI Solution ERP
 * Variantes: primary (Lime #B6FF00), brand (Morado #7C3AED), secondary (#151B28), ghost, danger (#EF4444)
 * Tamaños: sm, md, lg
 */
export function TTButton({
  children,
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onPress,
  style,
  textStyle,
  iconLeft,
  iconRight,
  ...props
}) {
  const content = title || children;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      hitSlop={8}
      style={({ hovered, pressed }) => [
        styles.base,
        styles[`size_${size}`],
        styles[`variant_${variant}`],
        hovered && !disabled && styles[`variant_${variant}_hover`],
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? COLORS.textDark : COLORS.textPrimary}
        />
      ) : (
        <>
          {iconLeft ? iconLeft : null}
          <Text
            pointerEvents="none"
            style={[
              styles.text,
              styles[`textSize_${size}`],
              styles[`textVariant_${variant}`],
              disabled && styles.textDisabled,
              textStyle,
            ]}
          >
            {content}
          </Text>
          {iconRight ? iconRight : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'transparent',
    ...Platform.select({
      web: { cursor: 'pointer', userSelect: 'none' },
    }),
  },

  // Tamaños
  size_sm: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    minHeight: 32,
  },
  size_md: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    minHeight: 40,
  },
  size_lg: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    minHeight: 48,
  },

  // Variantes
  variant_primary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  variant_primary_hover: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primaryDark,
  },

  variant_brand: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  variant_brand_hover: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primaryDark,
  },

  variant_secondary: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
  },
  variant_secondary_hover: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.borderHover,
  },

  variant_ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  variant_ghost_hover: {
    backgroundColor: COLORS.primaryGlow,
  },

  variant_danger: {
    backgroundColor: COLORS.errorGlow,
    borderColor: COLORS.error,
  },
  variant_danger_hover: {
    backgroundColor: COLORS.trendDownBg,
  },

  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },

  disabled: {
    opacity: 0.4,
    ...Platform.select({
      web: { cursor: 'not-allowed' },
    }),
  },

  // Textos
  text: {
    fontFamily: TYPOGRAPHY.fontFamily.ui,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  textSize_sm: { fontSize: TYPOGRAPHY.fontSize.sm },
  textSize_md: { fontSize: TYPOGRAPHY.fontSize.md },
  textSize_lg: { fontSize: TYPOGRAPHY.fontSize.lg },

  textVariant_primary: { color: COLORS.textInverted, fontWeight: '700' },
  textVariant_brand: { color: COLORS.textInverted },
  textVariant_secondary: { color: COLORS.textPrimary },
  textVariant_ghost: { color: COLORS.textSecondary },
  textVariant_danger: { color: COLORS.error },
  textDisabled: { color: COLORS.textMuted },
});
