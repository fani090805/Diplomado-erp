import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, TYPOGRAPHY } from '../design-system/tokens';
import { useLiveStatus } from '../hooks/useLiveUpdates';

/** Punto salvia + "En vivo" mientras el canal de cambios en vivo está conectado. */
export default function LiveIndicator() {
  const connected = useLiveStatus();
  if (!connected) return null;
  return (
    <View style={styles.wrap} accessibilityLabel="Actualización en vivo activa">
      <View style={styles.dot} />
      <Text style={styles.text}>En vivo</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: COLORS.statusPositiveBg,
    borderWidth: 1,
    borderColor: COLORS.statusPositiveBorder,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.sage },
  text: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.statusPositiveText,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },
});
