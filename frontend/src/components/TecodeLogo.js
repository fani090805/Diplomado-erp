import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, TYPOGRAPHY } from '../design-system/tokens';

/**
 * TecodeLogoIcon - Insignia geométrica de circuito CRABERP.
 */
export function TecodeLogoIcon({ size = 40, style }) {
  return (
    <View style={[styles.iconWrapper, { width: size, height: size, borderRadius: size * 0.28 }, style]}>
      <View style={styles.crabCircuit}>
        <View style={styles.clawLeft} />
        <View style={styles.clawRight} />
        <View style={styles.crabBody}>
          <View style={styles.eyeRow}><View style={styles.eye} /><View style={styles.eye} /></View>
        </View>
        <View style={styles.legRow}>
          <View style={styles.legLeft} /><View style={styles.legCenterLeft} />
          <View style={styles.legCenterRight} /><View style={styles.legRight} />
        </View>
      </View>
    </View>
  );
}

/**
 * TecodeLogo - CRABERP wordmark and geometric crab mark.
 */
export function TecodeLogo({ size = 'md', showTag = true, layout = 'horizontal', style }) {
  const isLg = size === 'lg';
  const iconSize = isLg ? 46 : 34;

  return (
    <View style={[styles.logoContainer, layout === 'vertical' && styles.vertical, style]}>
      <TecodeLogoIcon size={iconSize} />

      <View style={[styles.textGroup, layout === 'vertical' && styles.verticalTextGroup]}>
        <View style={styles.wordmarkRow}>
          <Text style={[styles.wordText, isLg && styles.wordTextLg]}>CRABERP</Text>
        </View>
        {showTag ? (
          <Text style={[styles.tagline, isLg && styles.taglineLg]}>Technologies</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Icon Badge
  iconWrapper: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#15513E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  crabCircuit: { width: '76%', height: '70%', alignItems: 'center', justifyContent: 'center' },
  crabBody: { width: '44%', height: '34%', borderRadius: 8, backgroundColor: '#F28C28', alignItems: 'center', justifyContent: 'center' },
  eyeRow: { flexDirection: 'row', gap: 5 },
  eye: { width: 2, height: 2, borderRadius: 1, backgroundColor: '#FFFFFF' },
  clawLeft: { position: 'absolute', top: '18%', left: '12%', width: '26%', height: 2, backgroundColor: '#F28C28', transform: [{ rotate: '-34deg' }] },
  clawRight: { position: 'absolute', top: '18%', right: '12%', width: '26%', height: 2, backgroundColor: '#F28C28', transform: [{ rotate: '34deg' }] },
  legRow: { position: 'absolute', bottom: '15%', flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  legLeft: { width: '20%', height: 2, backgroundColor: '#FFFFFF', transform: [{ rotate: '28deg' }] },
  legCenterLeft: { width: '18%', height: 2, backgroundColor: '#FFFFFF', transform: [{ rotate: '12deg' }] },
  legCenterRight: { width: '18%', height: 2, backgroundColor: '#FFFFFF', transform: [{ rotate: '-12deg' }] },
  legRight: { width: '20%', height: 2, backgroundColor: '#FFFFFF', transform: [{ rotate: '-28deg' }] },

  // Full Logo Layout
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  vertical: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  textGroup: {
    justifyContent: 'center',
    gap: 1,
  },
  verticalTextGroup: {
    alignItems: 'center',
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    fontFamily: TYPOGRAPHY.fontFamily.display,
    letterSpacing: 0,
  },
  bracketText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    fontFamily: TYPOGRAPHY.fontFamily.display,
  },
  wordTextLg: {
    fontSize: 28,
  },
  tagline: {
    color: '#E8DDC8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  taglineLg: {
    fontSize: 12,
  },
});
