import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { isKnownLocation, RouterProvider, useNav } from './src/nav/RouterContext';
import Layout from './src/components/Layout';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import LandingScreen from './src/screens/public/LandingScreen';
import { PLATFORM_ROUTES, SCREENS } from './src/screens';
import { COLORS } from './src/design-system/tokens';
import { TTButton } from './src/design-system/components';
import { warmUp } from './src/api/client';

/**
 * Shell Tec[ode ERP: cabecera + menú lateral responsive + 22 pantallas.
 */
function Shell() {
  const { route, homeRoute, go } = useNav();
  const { hasCompany, can, isPlatformAdmin } = useAuth();
  const routePermissions = {
    products: 'products.read', warehouses: 'warehouses.read', stock: 'inventory.read', movements: 'inventory.read', counts: 'inventory.read',
    suppliers: 'suppliers.read', purchaseOrders: 'purchases.read', customers: 'customers.read', salesOrders: 'sales.orders.read',
    accounts: 'finance.accounts.read', incomes: 'finance.income.read', expenses: 'finance.expenses.read', budgets: 'finance.budgets.read', reports: 'reports.read',
    leads: 'crm.read', employees: 'hr.read', boms: 'production.read', productionOrders: 'production.read', users: 'users.read', roles: 'roles.read', branches: 'branches.read', audit: 'audit.read',
  };
  // Sin empresa (Super Admin de plataforma) sólo existen las pantallas de plataforma.
  const allowed = PLATFORM_ROUTES.includes(route.name) ? isPlatformAdmin : hasCompany;
  const permission = routePermissions[route.name];
  const permitted = !permission || can(permission);
  useEffect(() => {
    if ((allowed && permitted && SCREENS[route.name]) || route.name === '__notFound') return;
    go(homeRoute);
  }, [allowed, permitted, route.name, go, homeRoute]);
  if (route.name === '__notFound') return <NotFoundScreen onHome={() => go(homeRoute)} />;
  if (!allowed || !permitted || !SCREENS[route.name]) return null;
  const Screen = SCREENS[route.name];
  return (
    <Layout>
      <Screen />
    </Layout>
  );
}

function NotFoundScreen({ onHome }) {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}><Text>No encontramos esta página</Text><TTButton title="Ir al inicio" onPress={onHome} /></View>;
}

function Root() {
  const { session, initializing, isPlatformAdmin, sessionExpired } = useAuth();
  const [viewState, setViewState] = useState(() =>
    Platform.OS === 'web' && typeof window !== 'undefined' && window.location.pathname !== '/' ? 'login' : 'landing'
  ); // 'landing' | 'login'
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

  useEffect(() => {
    if (sessionExpired) setViewState('login');
  }, [sessionExpired]);

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

  if (!session && Platform.OS === 'web' && !isKnownLocation()) {
    return <NotFoundScreen onHome={() => {
      window.history.replaceState({}, '', '/');
      setViewState('landing');
    }} />;
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
    <RouterProvider homeRoute={isPlatformAdmin ? 'companies' : 'home'}>
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
