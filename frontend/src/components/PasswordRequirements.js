import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TTIcon } from '../design-system/components';
import { COLORS, SPACING, TYPOGRAPHY } from '../design-system/tokens';

export default function PasswordRequirements({ password }) {
  const requirements = [
    { label: 'Mínimo 8 caracteres', met: password.length >= 8 },
    { label: 'Al menos una letra', met: /[A-Za-z]/.test(password) },
    { label: 'Al menos un número', met: /\d/.test(password) },
  ];

  return (
    <View style={styles.container}>
      {requirements.map((requirement) => (
        <View key={requirement.label} style={styles.row}>
          <TTIcon
            name={requirement.met ? 'check' : 'punto'}
            size={requirement.met ? 14 : 8}
            color={requirement.met ? COLORS.successText : COLORS.textMuted}
          />
          <Text
            style={[
              styles.text,
              requirement.met ? styles.met : styles.unmet,
            ]}
          >
            {requirement.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: SPACING.xs, marginTop: -SPACING.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  text: { fontSize: TYPOGRAPHY.fontSize.xs, fontFamily: TYPOGRAPHY.fontFamily.ui },
  met: { color: COLORS.successText },
  unmet: { color: COLORS.textMuted },
});
