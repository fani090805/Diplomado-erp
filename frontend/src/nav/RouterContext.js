import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

const RouterContext = createContext(null);
const PATHS = {
  home: '/', companies: '/empresas', products: '/inventario/productos', warehouses: '/inventario/almacenes',
  stock: '/inventario/existencias', movements: '/inventario/movimientos', counts: '/inventario/conteos',
  suppliers: '/compras/proveedores', purchaseOrders: '/compras', customers: '/ventas/clientes', salesOrders: '/ventas',
  accounts: '/finanzas/cuentas', incomes: '/finanzas/ingresos', expenses: '/finanzas/gastos', budgets: '/finanzas/presupuestos',
  reports: '/reportes', leads: '/crm/leads', employees: '/rh/empleados', boms: '/produccion/listas',
  productionOrders: '/produccion/ordenes', users: '/config/usuarios', roles: '/config/roles', branches: '/config/sucursales', audit: '/config/auditoria',
};
const ROUTES = Object.fromEntries(Object.entries(PATHS).map(([name, path]) => [path, name]));
const ORDER_PATHS = { salesOrders: '/ventas/ordenes', purchaseOrders: '/compras/ordenes' };

function routeFromLocation(homeRoute) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return { name: homeRoute, params: {} };
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  const detail = /^\/(ventas|compras)\/ordenes\/([^/]+)$/.exec(path);
  if (detail) {
    try {
      return { name: detail[1] === 'ventas' ? 'salesOrders' : 'purchaseOrders', params: { id: decodeURIComponent(detail[2]) } };
    } catch {
      return { name: '__notFound', params: {} };
    }
  }
  return { name: ROUTES[path] || '__notFound', params: {} };
}

function writeRoute(route, mode = 'push') {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  let path = PATHS[route.name];
  if (route.params?.id && ORDER_PATHS[route.name]) path = `${ORDER_PATHS[route.name]}/${encodeURIComponent(route.params.id)}`;
  if (!path) return;
  const current = routeFromLocation(route.name);
  const query = current.name === route.name ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const next = `${path}${query.toString() ? `?${query}` : ''}`;
  if (mode === 'replace') window.history.replaceState({}, '', next);
  else window.history.pushState({}, '', next);
}

export function RouterProvider({ children, homeRoute = 'home' }) {
  const [route, setRoute] = useState(() => routeFromLocation(homeRoute));
  const [stack, setStack] = useState(() => [routeFromLocation(homeRoute)]);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (route.name === '__notFound') return;
    writeRoute(route, 'replace');
    const onPopState = () => {
      const next = routeFromLocation(homeRoute);
      setRoute(next);
      setStack([next]);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  const navigate = useCallback((name, params = {}) => {
    const next = { name, params };
    setStack((s) => [...s, next]);
    setRoute(next);
    writeRoute(next);
  }, []);
  const go = useCallback((name, params = {}) => {
    const next = { name, params };
    setStack(name === homeRoute ? [next] : [{ name: homeRoute, params: {} }, next]);
    setRoute(next);
    writeRoute(next, 'replace');
  }, [homeRoute]);
  const back = useCallback(() => {
    setStack((s) => {
      if (s.length <= 1) return s;
      const next = s[s.length - 2];
      setRoute(next);
      writeRoute(next, 'replace');
      return s.slice(0, -1);
    });
  }, []);
  const value = useMemo(() => ({ route, navigate, go, back, homeRoute, canGoBack: stack.length > 1 }), [route, navigate, go, back, homeRoute, stack.length]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useNav() {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useNav debe usarse dentro de <RouterProvider>');
  return ctx;
}

export function routePath(name) { return PATHS[name]; }
export function isKnownLocation() { return routeFromLocation('home').name !== '__notFound'; }
