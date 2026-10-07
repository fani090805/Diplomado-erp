'use strict';

/**
 * Catálogo de entidades que emiten eventos en vivo.
 *
 *  - `permission`: permiso de LECTURA que debe tener el rol para recibir el
 *    evento (el cliente sólo vuelve a pedir datos que ya puede ver).
 *  - `scope: 'platform'`: eventos de plataforma (empresas): sólo para el
 *    Super Admin; no pertenecen a ninguna empresa.
 *  - `paths`: prefijos de URL (después de /api/v1) cuyas escrituras exitosas
 *    emiten el evento (ver events.middleware.js).
 */
const ENTITIES = {
  'sales-order': { permission: 'sales.orders.read', paths: ['/sales-orders'] },
  'purchase-order': { permission: 'purchases.read', paths: ['/purchase-orders'] },
  product: { permission: 'products.read', paths: ['/products'] },
  inventory: { permission: 'inventory.read', paths: ['/inventory'] },
  customer: { permission: 'customers.read', paths: ['/customers'] },
  supplier: { permission: 'suppliers.read', paths: ['/suppliers'] },
  income: { permission: 'finance.income.read', paths: ['/finance/incomes'] },
  expense: { permission: 'finance.expenses.read', paths: ['/finance/expenses'] },
  user: { permission: 'users.read', paths: ['/users'] },
  company: { permission: null, scope: 'platform', paths: ['/companies', '/platform/companies', '/platform/company-requests'] },
};

/**
 * Efectos colaterales de una acción: aprobar una venta descuenta inventario y
 * registra su ingreso; aprobar una compra mete inventario. Se notifican para
 * que esas pantallas también se refresquen.
 */
const SIDE_EFFECTS = {
  'sales-order:approved': [
    { entity: 'inventory', action: 'updated' },
    { entity: 'income', action: 'created' },
  ],
  'purchase-order:approved': [{ entity: 'inventory', action: 'updated' }],
};

const ACTIONS = ['created', 'updated', 'approved', 'rejected', 'deleted'];

/** Entidad cuyo prefijo coincide con la ruta (el más largo gana). */
function entityForPath(path) {
  let best = null;
  for (const [entity, cfg] of Object.entries(ENTITIES)) {
    for (const prefix of cfg.paths) {
      const matches = path === prefix || path.startsWith(`${prefix}/`);
      if (matches && (!best || prefix.length > best.prefix.length)) best = { entity, prefix };
    }
  }
  return best;
}

/** Acción de negocio según método y sub-recurso (/approve, /reject…). */
function actionFor(method, rest) {
  if (method === 'DELETE') return 'deleted';
  if (/\/approve$/.test(rest)) return 'approved';
  if (/\/reject$/.test(rest)) return 'rejected';
  if (method === 'POST' && (rest === '' || rest === '/')) return 'created';
  // Entradas, salidas, ajustes y transferencias de inventario crean movimientos.
  if (method === 'POST' && /^\/(entries|exits|adjustments|transfers|counts)\/?$/.test(rest)) return 'created';
  return 'updated'; // PATCH/PUT y acciones como /void, /deactivate, /status…
}

module.exports = { ENTITIES, SIDE_EFFECTS, ACTIONS, entityForPath, actionFor };
