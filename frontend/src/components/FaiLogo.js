import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { COLORS, TYPOGRAPHY } from '../design-system/tokens';

export function FaiLogoIcon({ size = 40, style }) {
  return (
    <Image
      source={require('../../assets/fai-icono.png')}
      accessibilityLabel="FAI Solution ERP"
      resizeMode="contain"
      style={[{ width: size, height: size }, style]}
    />
  );
}

export function FaiLogo({ size = 'md', showTag = true, layout = 'horizontal', variant = 'dark', style }) {
  const isLarge = size === 'lg';
  const isExtraLarge = size === 'xl';
  const textColor = variant === 'dark' ? COLORS.textInverted : COLORS.primary;
  const iconSize = isExtraLarge ? 140 : isLarge ? 52 : 38;

  return (
    <View
      style={[
        styles.container,
        layout === 'vertical' && styles.vertical,
        isExtraLarge && styles.extraLargeContainer,
        style,
      ]}
    >
      <FaiLogoIcon size={iconSize} />
      <View style={[styles.textGroup, layout === 'vertical' && styles.verticalTextGroup]}>
        <Text
          style={[
            styles.wordmark,
            isLarge && styles.wordmarkLarge,
            isExtraLarge && styles.wordmarkExtraLarge,
            { color: textColor },
          ]}
        >
          FAI
        </Text>
        {showTag ? (
          <Text
            style={[
              styles.tagline,
              isExtraLarge && styles.taglineExtraLarge,
              { color: textColor },
            ]}
          >
            SOLUTION ERP
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  vertical: { flexDirection: 'column', gap: 9 },
  extraLargeContainer: { alignItems: 'center' },
  textGroup: { justifyContent: 'center', gap: 1 },
  verticalTextGroup: { alignItems: 'center' },
  wordmark: { fontSize: 23, lineHeight: 28, fontWeight: '700', fontFamily: TYPOGRAPHY.fontFamily.display },
  wordmarkLarge: { fontSize: 30, lineHeight: 36 },
  wordmarkExtraLarge: { fontSize: 56, lineHeight: 64, fontWeight: '700', textAlign: 'center' },
  tagline: { fontSize: 8, lineHeight: 12, fontWeight: '600', letterSpacing: 2.1, fontFamily: TYPOGRAPHY.fontFamily.ui },
  taglineExtraLarge: { fontSize: 13, lineHeight: 20, letterSpacing: 6, textAlign: 'center' },
});