import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { RouterProvider, useNav } from './src/nav/RouterContext';
import Layout from './src/components/Layout';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import LandingScreen from './src/screens/public/LandingScreen';
import { SCREENS } from './src/screens';
import { COLORS } from './src/design-system/tokens';
import { warmUp } from './src/api/client';

/**
 * Shell Tec[ode ERP: cabecera + menú lateral responsive + 22 pantallas.
 */
function Shell() {
  const { route } = useNav();
  const Screen = SCREENS[route.name] || SCREENS.home;
  return (
    <Layout>
      <Screen />
    </Layout>
  );
}

function Root() {
  const { session, initializing } = useAuth();
  const [viewState, setViewState] = useState('landing'); // 'landing' | 'login'
  const [resetToken, setResetToken] = useState(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
    const url = new URL(window.location.href);
    const token = url.searchParams.get('reset');
    if (token) {
      url.searchParams.delete('reset');
      window.history.replaceState({}, '', url);
    }
    return token;
  });

  if (initializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (resetToken) {
    return (
      <ResetPasswordScreen
        token={resetToken}
        onGoLogin={() => {
          setResetToken(null);
          setViewState('login');
        }}
        onRequestNewLink={() => {
          setResetToken(null);
          setViewState('forgot');
        }}
      />
    );
  }

  if (!session) {
    if (viewState === 'landing') {
      return (
        <LandingScreen
          onGoLogin={() => setViewState('login')}
          onGoRegister={() => setViewState('register')}
        />
      );
    }
    if (viewState === 'register') {
      return (
        <RegisterScreen
          onGoLogin={() => setViewState('login')}
          onGoBack={() => setViewState('landing')}
        />
      );
    }
    if (viewState === 'forgot') {
      return (
        <ForgotPasswordScreen
          onGoLogin={() => setViewState('login')}
          onGoBack={() => setViewState('landing')}
        />
      );
    }
    if (viewState === 'reset') {
      return (
        <ResetPasswordScreen
          token=""
          onGoLogin={() => setViewState('login')}
          onRequestNewLink={() => setViewState('forgot')}
        />
      );
    }
    return (
      <LoginScreen
        onGoRegister={() => setViewState('register')}
        onGoForgot={() => setViewState('forgot')}
        onGoBack={() => setViewState('landing')}
      />
    );
  }

  return (
    <RouterProvider>
      <Shell />
    </RouterProvider>
  );
}

export default function App() {
  useEffect(() => {
    warmUp();
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || document.querySelector('[data-fai-focus-styles]')) return;
    const focusStyles = document.createElement('style');
    focusStyles.dataset.faiFocusStyles = 'true';
    focusStyles.textContent = `
      :where(button, [role="button"], [role="link"], [tabindex]:not(input):not(textarea):not(select)):focus:not(:focus-visible) {
        outline: none !important;
      }
      :where(button, [role="button"], [role="link"], [tabindex]:not(input):not(textarea):not(select)):focus-visible {
        outline: 2px solid ${COLORS.borderFocus} !important;
        outline-offset: 2px;
      }
    `;
    document.head.appendChild(focusStyles);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || document.querySelector('[data-craberp-fonts]')) return;
    const fonts = document.createElement('link');
    fonts.rel = 'stylesheet';
    fonts.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap';
    fonts.dataset.craberpFonts = 'true';
    document.head.appendChild(fonts);
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Root />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
});
