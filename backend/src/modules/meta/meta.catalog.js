'use strict';

/**
 * Configuración compartida por web y Android (GET /api/v1/meta).
 * Única fuente de verdad de etiquetas/tonos de estado y del menú.
 * Tonos: positive | neutral | pending | negative (tokens de estado de design/tokens.json).
 */

const s = (code, label, tone) => ({ code, label, tone });
const CATALOG_STATUSES = [s('active', 'Activo', 'positive'), s('inactive', 'Inactivo', 'neutral')];
const APPROVAL_STATUSES = [s('DRAFT', 'Borrador', 'neutral'), s('APPROVED', 'Aprobado', 'positive'), s('REJECTED', 'Rechazado', 'negative')];
const MONEY_STATUSES = [s('POSTED', 'Registrado', 'positive'), s('VOID', 'Anulado', 'neutral'), s('PAID', 'Pagado', 'positive')];

const STATUSES = {
  'sales-order': APPROVAL_STATUSES,
  'purchase-order': APPROVAL_STATUSES,
  'production-order': [
    s('DRAFT', 'Borrador', 'neutral'),
    s('RELEASED', 'Liberada', 'pending'),
    s('IN_PROGRESS', 'En proceso', 'pending'),
    s('DONE', 'Finalizada', 'positive'),
    s('COMPLETED', 'Completado', 'positive'),
    s('CANCELLED', 'Cancelado', 'neutral'),
  ],
  income: MONEY_STATUSES,
  expense: MONEY_STATUSES,
  user: [s('active', 'Activo', 'positive'), s('pending', 'Pendiente', 'pending'), s('inactive', 'Inactivo', 'neutral'), s('locked', 'Bloqueado', 'negative')],
  company: [s('active', 'Activo', 'positive'), s('pending', 'Pendiente', 'pending'), s('suspended', 'Suspendido', 'negative')],
  'company-request': [
    s('PENDING', 'Pendiente', 'pending'),
    s('IN_REVIEW', 'En revisión', 'pending'),
    s('APPROVED', 'Aprobado', 'positive'),
    s('REJECTED', 'Rechazado', 'negative'),
  ],
  'inventory-count': [
    s('POSTING', 'Registrando', 'pending'),
    s('PARTIAL', 'Parcial', 'pending'),
    s('POSTED', 'Registrado', 'positive'),
    s('RECEIVED', 'Recibido', 'positive'),
    s('DELIVERED', 'Entregado', 'positive'),
    s('OVERDUE', 'Vencido', 'negative'),
  ],
  lead: [
    s('NEW', 'Nuevo', 'pending'),
    s('CONTACTED', 'Contactado', 'pending'),
    s('QUALIFIED', 'Calificado', 'pending'),
    s('WON', 'Ganado', 'positive'),
    s('LOST', 'Perdido', 'negative'),
  ],
  project: [
    s('PLANEADA', 'Planeada', 'neutral'),
    s('EN_PROCESO', 'En proceso', 'pending'),
    s('PAUSADA', 'Pausada', 'pending'),
    s('FINALIZADA', 'Finalizada', 'positive'),
    s('CANCELADA', 'Cancelada', 'neutral'),
  ],
  audit: [s('SUCCESS', 'Éxito', 'positive'), s('FAILURE', 'Fallo', 'negative')],
  product: CATALOG_STATUSES,
  customer: CATALOG_STATUSES,
  supplier: CATALOG_STATUSES,
  warehouse: CATALOG_STATUSES,
  account: CATALOG_STATUSES,
};

/**
 * Módulos del menú, EN ORDEN. `icon` es un nombre genérico (cada plataforma lo
 * traduce a su ícono: TTIcon en web, Material Icons en Android).
 * `shortName`: para barras compactas (barra inferior de Android).
 * `platformOnly`: sólo para el Super Admin de plataforma.
 * Cada plataforma muestra sólo los módulos que tiene implementados (web:
 * WEB_ROUTES en frontend/src/components/Layout.js; Android: su NavGraph).
 */
const m = (id, name, shortName, icon, permission, section, extra = {}) => ({ id, name, shortName, icon, permission, section, ...extra });

const MODULES = [
  m('companies', 'Empresas', 'Empresas', 'empresa', null, 'PLATAFORMA', { platformOnly: true }),
  m('dashboard', 'Dashboard', 'Inicio', 'dashboard', null, 'PRINCIPAL'),
  m('accounts', 'Finanzas', 'Finanzas', 'finanzas', 'finance.accounts.read', 'PRINCIPAL'),
  m('stock', 'Inventario', 'Inventario', 'inventario', 'inventory.read', 'PRINCIPAL'),
  m('sales-orders', 'Ventas', 'Ventas', 'ventas', 'sales.orders.read', 'PRINCIPAL'),
  m('employees', 'Recursos Humanos', 'RRHH', 'rrhh', 'hr.read', 'PRINCIPAL'),
  m('reports', 'Analítica', 'Analítica', 'analitica', 'reports.read', 'PRINCIPAL'),
  m('users', 'Configuración', 'Usuarios', 'configuracion', 'users.read', 'PRINCIPAL'),
  m('products', 'Productos', 'Productos', 'productos', 'products.read', 'OPERACIONES'),
  m('warehouses', 'Almacenes', 'Almacenes', 'almacen', 'warehouses.read', 'OPERACIONES'),
  m('movements', 'Movimientos', 'Movimientos', 'intercambio', 'inventory.read', 'OPERACIONES'),
  m('counts', 'Inventarios Físicos', 'Conteos', 'documento', 'inventory.read', 'OPERACIONES'),
  m('suppliers', 'Proveedores', 'Proveedores', 'proveedores', 'suppliers.read', 'OPERACIONES'),
  m('purchase-orders', 'Órdenes de Compra', 'Compras', 'ordenes', 'purchases.read', 'OPERACIONES'),
  m('customers', 'Clientes', 'Clientes', 'clientes', 'customers.read', 'OPERACIONES'),
  m('incomes', 'Ingresos', 'Ingresos', 'dinero', 'finance.income.read', 'FINANZAS'),
  m('expenses', 'Gastos', 'Gastos', 'gastos', 'finance.expenses.read', 'FINANZAS'),
  m('budgets', 'Presupuestos', 'Presupuestos', 'documento', 'finance.budgets.read', 'FINANZAS'),
  m('leads', 'CRM / Leads', 'CRM', 'objetivo', 'crm.read', 'NEGOCIO'),
  m('projects', 'Obras', 'Obras', 'obra', 'projects.read', 'NEGOCIO'),
  m('boms', 'Listas BOM', 'BOM', 'fabrica', 'production.read', 'NEGOCIO'),
  m('production-orders', 'Órdenes Producción', 'Producción', 'fabrica', 'production.read', 'NEGOCIO'),
  m('branches', 'Sucursales', 'Sucursales', 'ubicacion', 'branches.read', 'ADMINISTRACIÓN'),
  m('roles', 'Roles y Permisos', 'Roles', 'escudo', 'roles.read', 'ADMINISTRACIÓN'),
  m('audit', 'Auditoría', 'Auditoría', 'ver', 'audit.read', 'ADMINISTRACIÓN'),
];

module.exports = { STATUSES, MODULES };
