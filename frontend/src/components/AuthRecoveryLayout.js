import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { FaiLogo } from './FaiLogo';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../design-system/tokens';

export default function AuthRecoveryLayout({ onGoBack, children }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.shell, !isDesktop && styles.shellMobile]}>
        <View style={[styles.brandPanel, !isDesktop && styles.brandPanelMobile]}>
          <Pressable
            onPress={onGoBack}
            accessibilityRole="button"
            accessibilityLabel="Volver al inicio"
            style={styles.brandAction}
          >
            <FaiLogo size={isDesktop ? 'xl' : 'lg'} layout="vertical" variant="dark" />
            <Text style={styles.backText}>← Volver al inicio</Text>
          </Pressable>
        </View>
        <ScrollView
          style={styles.formPanel}
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>{children}</View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  shell: { flex: 1, flexDirection: 'row' },
  shellMobile: { flexDirection: 'column' },
  brandPanel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING['3xl'],
    backgroundColor: COLORS.primary,
  },
  brandPanelMobile: { flex: 0, padding: SPACING.lg },
  brandAction: { alignItems: 'center', justifyContent: 'center', gap: SPACING.lg },
  backText: {
    color: COLORS.textInverted,
    opacity: 0.7,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },
  formPanel: { flex: 1, backgroundColor: COLORS.background },
  formContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    gap: SPACING.md,
    padding: SPACING['2xl'],
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surface,
  },
});
