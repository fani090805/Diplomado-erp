import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../tokens';
import { TTIcon } from './TTIcon';

/**
 * TTCard - Contenedor en tarjeta de FAI Solution ERP
 */
export function TTCard({ children, title, subtitle, titleIcon, action, elevated = false, style, contentStyle, onPress }) {
  const Container = onPress ? Pressable : View;

  return (
    <Container
      onPress={onPress}
      style={({ hovered }) => [
        styles.card,
        elevated && styles.elevated,
        hovered && onPress && styles.hovered,
        style,
      ]}
    >
      {title || subtitle || action ? (
        <View style={styles.header}>
          <View style={styles.titleArea}>
            {titleIcon ? <TTIcon name={titleIcon} size={18} color={COLORS.primary} /> : null}
            <View style={styles.titleTextArea}>
              {title ? <Text style={styles.title}>{title}</Text> : null}
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
          </View>
          {action ? <View style={styles.action}>{action}</View> : null}
        </View>
      ) : null}
      <View style={[styles.content, contentStyle]}>{children}</View>
    </Container>
  );
}

/**
 * TTStatCard - Tarjeta KPI empresarial de FAI Solution ERP
 */
export function TTStatCard({ label, value, trend, trendType = 'neutral', icon, style }) {
  const isPositive = trendType === 'positive';
  const isNegative = trendType === 'negative';

  return (
    <View style={[styles.statCard, style]}>
      <View style={styles.statHeader}>
        <Text style={styles.statLabel}>{label}</Text>
        {icon ? (
          <View style={styles.statIconWrap}>
            <TTIcon name={icon} size={18} color={COLORS.primary} />
          </View>
        ) : null}
      </View>

      <Text style={[styles.statValue, { color: COLORS.textPrimary }]}>{value}</Text>

      {trend ? (
        <View style={styles.trendRow}>
          <View style={styles.trendContent}>
            {isPositive || isNegative ? (
              <TTIcon
                name={isPositive ? 'tendenciaArriba' : 'tendenciaAbajo'}
                size={14}
                color={isPositive ? COLORS.success : COLORS.error}
              />
            ) : null}
            <Text style={[styles.trendText, isPositive && styles.trendPositive, isNegative && styles.trendNegative]}>
              {trend}
            </Text>
          </View>
        </View>
      ) : null}

    </View>
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
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  elevated: {
    backgroundColor: COLORS.card,
  },
  hovered: {
    borderColor: COLORS.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  titleArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  titleTextArea: {
    flex: 1,
    gap: SPACING.xs / 2,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    fontFamily: TYPOGRAPHY.fontFamily.display,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textMuted,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    gap: SPACING.md,
  },

  // Stat Card
  statCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    minWidth: 170,
    flex: 1,
    gap: SPACING.sm,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.025,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    ...TYPOGRAPHY.kpiLabel,
    flex: 1,
    minWidth: 0,
    paddingRight: SPACING.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryGlow,
    flexShrink: 0,
  },
  statValue: {
    ...TYPOGRAPHY.kpiValue,
    color: COLORS.textPrimary,
    marginVertical: 0,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  trendText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textMuted,
  },
  trendPositive: {
    color: COLORS.trendUpText,
  },
  trendNegative: {
    color: COLORS.trendDownText,
  },
});
