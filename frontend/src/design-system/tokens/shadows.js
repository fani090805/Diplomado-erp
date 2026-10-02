/**
 * FAI Solution ERP Design Tokens - Subtle Shadows & Elevation
 */
import { Platform } from 'react-native';
import { COLORS } from './colors';

export const SHADOWS = {
  sm: Platform.select({
    web: { boxShadow: '0 1px 3px rgba(37, 47, 26, 0.06)' },
    ios: {
      shadowColor: COLORS.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
    },
    android: { elevation: 3 },
  }),
  md: Platform.select({
    web: { boxShadow: '0 2px 6px rgba(37, 47, 26, 0.07)' },
    ios: {
      shadowColor: COLORS.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 5,
    },
    android: { elevation: 6 },
  }),
  lg: Platform.select({
    web: { boxShadow: '0 4px 12px rgba(37, 47, 26, 0.08)' },
    ios: {
      shadowColor: COLORS.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    android: { elevation: 12 },
  }),
  glowAccent: Platform.select({
    web: { boxShadow: `0 0 10px ${COLORS.accentGlow}` },
    ios: {
      shadowColor: COLORS.accent,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.14,
      shadowRadius: 6,
    },
    android: { elevation: 8 },
  }),
  glowPrimary: Platform.select({
    web: { boxShadow: `0 0 10px ${COLORS.primaryGlow}` },
    ios: {
      shadowColor: COLORS.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.14,
      shadowRadius: 6,
    },
    android: { elevation: 8 },
  }),
};
