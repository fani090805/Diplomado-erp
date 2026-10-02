import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setTokens, setOnSessionExpired } from '../api/client';

/**
 * Sesión de la aplicación.
 * - login(email, password) → llama a /auth/login y guarda los tokens.
 * - logout() → /auth/logout (invalidación global en servidor) y limpia.
 * - session: salida de /auth/me ({ user, role, company, branch }).
 * TODO FASE 3: persistir tokens con AsyncStorage (hoy: memoria, se pierde al recargar).
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [initializing, setInitializing] = useState(true);

  const logout = useCallback(async ({ callServer = true } = {}) => {
    try {
      if (callServer) await api('/auth/logout', { method: 'POST' });
    } catch {
      /* el logout local procede aunque la red falle */
    }
    setTokens({ access: null, refresh: null });
    setSession(null);
  }, []);

  useEffect(() => {
    setOnSessionExpired(() => {
      // Refresh inválido/expirado: la sesión ya no es válida.
      setTokens({ access: null, refresh: null });
      setSession(null);
    });
    setInitializing(false);
    // TODO: si hay tokens guardados → /auth/me para restaurar la sesión.
  }, []);

  const establishSession = useCallback(async (path, body) => {
    const data = await api(path, {
      method: 'POST',
      body,
      auth: false,
    });
    setTokens({ access: data.accessToken, refresh: data.refreshToken });
    const me = await api('/auth/me');
    setSession(me);
    return me;
  }, []);

  const login = useCallback(
    (email, password) => establishSession('/auth/login', { email, password }),
    [establishSession]
  );

  const register = useCallback(
    (body) => establishSession('/auth/register', body),
    [establishSession]
  );

  const can = useCallback(
    (permission) => Boolean(session?.role?.permissions?.includes(permission)),
    [session]
  );

  const value = useMemo(
    () => ({ session, initializing, login, register, logout, can }),
    [session, initializing, login, register, logout, can]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
