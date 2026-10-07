import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setTokens, setOnSessionExpired, restoreTokens } from '../api/client';

/**
 * Sesión de la aplicación.
 * - login(email, password) → llama a /auth/login y guarda los tokens.
 * - logout() → /auth/logout (invalidación global en servidor) y limpia.
 * - session: salida de /auth/me ({ user, role, company, branch }).
 * - isPlatformAdmin: Super Admin de plataforma (user.isPlatformAdmin de /auth/me).
 * En web conserva los tokens en localStorage y valida la sesión con /auth/me al iniciar.
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  const logout = useCallback(async ({ callServer = true } = {}) => {
    try {
      if (callServer) await api('/auth/logout', { method: 'POST' });
    } catch {
      /* el logout local procede aunque la red falle */
    }
    setTokens({ access: null, refresh: null });
    setSession(null);
    setSessionExpired(false);
  }, []);

  useEffect(() => {
    setOnSessionExpired(() => {
      // Refresh inválido/expirado: la sesión ya no es válida.
      setTokens({ access: null, refresh: null });
      setSession(null);
      setSessionExpired(true);
    });
    let active = true;
    const restore = async () => {
      if (!restoreTokens()) {
        if (active) setInitializing(false);
        return;
      }
      try {
        const me = await api('/auth/me');
        if (active) setSession(me);
      } catch {
        setTokens({ access: null, refresh: null });
        if (active) setSession(null);
      } finally {
        if (active) setInitializing(false);
      }
    };
    restore();
    return () => { active = false; };
  }, []);

  const establishSession = useCallback(async (path, body, signal) => {
    const data = await api(path, {
      method: 'POST',
      body,
      auth: false,
      signal,
    });
    setTokens({ access: data.accessToken, refresh: data.refreshToken });
    let me;
    try {
      me = await api('/auth/me', { signal });
    } catch (error) {
      if (signal?.aborted) setTokens({ access: null, refresh: null });
      throw error;
    }
    setSession(me);
    setSessionExpired(false);
    return me;
  }, []);

  const login = useCallback(
    (email, password, { signal } = {}) => establishSession('/auth/login', { email, password }, signal),
    [establishSession]
  );

  const register = useCallback(
    (body, { signal } = {}) =>
      api('/auth/register', {
        method: 'POST',
        body,
        auth: false,
        signal,
      }),
    []
  );

  const registerCompany = useCallback(
    (body, { signal } = {}) =>
      api('/auth/register-company', {
        method: 'POST',
        body,
        auth: false,
        signal,
      }),
    []
  );

  const forgotPassword = useCallback(
    (email, { signal } = {}) =>
      api('/auth/forgot-password', {
        method: 'POST',
        body: { email },
        auth: false,
        signal,
      }),
    []
  );

  const resetPassword = useCallback(
    (token, password, { signal } = {}) =>
      api('/auth/reset-password', {
        method: 'POST',
        body: { token, password },
        auth: false,
        signal,
      }),
    []
  );

  const can = useCallback(
    (permission) => Boolean(session?.role?.permissions?.includes(permission)),
    [session]
  );

  const isPlatformAdmin = Boolean(
    session?.user?.isPlatformAdmin || session?.role?.code === 'super_admin'
  );
  const hasCompany = Boolean(session?.company?._id || session?.user?.companyId);

  const value = useMemo(
    () => ({
      session,
      initializing,
      sessionExpired,
      isPlatformAdmin,
      hasCompany,
      login,
      register,
      registerCompany,
      forgotPassword,
      resetPassword,
      logout,
      can,
    }),
    [
      session,
      initializing,
      sessionExpired,
      isPlatformAdmin,
      hasCompany,
      login,
      register,
      registerCompany,
      forgotPassword,
      resetPassword,
      logout,
      can,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
