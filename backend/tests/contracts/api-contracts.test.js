'use strict';

/**
 * Contratos de la API con la app Android.
 *
 * Arma una empresa con datos de todos los módulos que usa Android, pide cada
 * endpoint y compara la FORMA de la respuesta (campos y tipos) con el ejemplo
 * guardado en tests/contracts/fixtures/<nombre>.json. Android lee esos mismos
 * JSON en sus pruebas de DTO (android/app/src/test/resources/contracts/).
 *
 * Si cambias a propósito una respuesta de la API:
 *   UPDATE_CONTRACTS=1 npx jest tests/contracts   (regenera los fixtures)
 *   node ../scripts/sync-contract-fixtures.js     (los copia a Android)
 *   cd ../android && .\gradlew.bat test           (pruebas de contrato de Android)
 *
 * Los fixtures no llevan datos sensibles: tokens y tickets se reemplazan por
 * marcadores, los ObjectId por ids fijos y las fechas ISO por una fecha fija.
 */

const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { describeIfDb, connectTestDb, closeTestDb, app } = require('../helpers/setup');
const { createTenant, createUser, login, auth } = require('../helpers/fixtures');

const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const UPDATE = process.env.UPDATE_CONTRACTS === '1';

const OBJECT_ID = /^[0-9a-f]{24}$/;
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const SECRET_KEYS = new Set(['accessToken', 'refreshToken', 'ticket']);
const FORBIDDEN_KEYS = /password|hash$|secret/i; // passwordHash, tokenHash… (no hasHistory)
const FIXED_DATE = '2026-01-15T18:00:00.000Z';

/** Reemplaza ids, fechas y secretos por valores estables (mismo tipo JSON). */
function normalize(body) {
  const ids = new Map();
  const walk = (value, key) => {
    if (Array.isArray(value)) {
      const items = value.map((item) => walk(item, key));
      // Agregados ($group, sin _id) salen en orden variable: se ordenan para un fixture estable.
      const isAggregate = items.every((item) => isPlainObject(item) && !('_id' in item));
      return isAggregate ? items.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) : items;
    }
    if (value && typeof value === 'object') {
      // TODO(QA): audit_logs.before guarda ObjectId como { buffer: { 0..11: byte } };
      // se conservan la forma y las llaves, con los bytes en 0 para un fixture estable.
      if (key === 'buffer') return Object.fromEntries(Object.keys(value).map((k) => [k, 0]));
      // Llaves ordenadas: Mongo no garantiza el orden de los campos entre corridas.
      return Object.fromEntries(Object.keys(value).sort().map((k) => [k, walk(value[k], k)]));
    }
    if (typeof value !== 'string') return value;
    if (SECRET_KEYS.has(key)) return `<${key}>`;
    if (OBJECT_ID.test(value)) {
      if (!ids.has(value)) ids.set(value, String(ids.size + 1).padStart(24, '0'));
      return ids.get(value);
    }
    if (ISO_DATETIME.test(value)) return FIXED_DATE;
    return value;
  };
  return walk(body);
}

/** Forma de un valor: tipos por campo; en listas, la unión de sus elementos. */
function shapeOf(value) {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) {
    return [value.map(shapeOf).reduce((acc, item) => mergeShapes(acc, item), 'null')];
  }
  if (typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((k) => [k, shapeOf(value[k])]));
  }
  return typeof value;
}

function mergeShapes(a, b) {
  if (a === 'null') return b;
  if (b === 'null') return a;
  if (Array.isArray(a) && Array.isArray(b)) return [mergeShapes(a[0], b[0])];
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
    return Object.fromEntries(keys.map((k) => [k, mergeShapes(a[k] ?? 'null', b[k] ?? 'null')]));
  }
  return a;
}

const isPlainObject = (v) => v && typeof v === 'object' && !Array.isArray(v);

/** Lista de diferencias de forma; `null` es compatible con cualquier tipo. */
function shapeDiff(expected, actual, at = '$') {
  if (expected === 'null' || actual === 'null') return [];
  if (Array.isArray(expected) || Array.isArray(actual)) {
    if (!Array.isArray(expected) || !Array.isArray(actual)) return [`${at}: lista ↔ no lista`];
    return shapeDiff(expected[0], actual[0], `${at}[]`);
  }
  if (isPlainObject(expected) || isPlainObject(actual)) {
    if (!isPlainObject(expected) || !isPlainObject(actual)) {
      return [`${at}: objeto ↔ ${isPlainObject(expected) ? actual : expected}`];
    }
    const keys = [...new Set([...Object.keys(expected), ...Object.keys(actual)])];
    return keys.flatMap((k) => {
      if (!(k in actual)) return [`${at}.${k}: ya no viene en la respuesta`];
      if (!(k in expected)) return [`${at}.${k}: campo nuevo`];
      return shapeDiff(expected[k], actual[k], `${at}.${k}`);
    });
  }
  return expected === actual ? [] : [`${at}: ${expected} → ${actual}`];
}

function forbiddenKeys(value, at = '$') {
  if (Array.isArray(value)) return value.flatMap((v, i) => forbiddenKeys(v, `${at}[${i}]`));
  if (!isPlainObject(value)) return [];
  return Object.entries(value).flatMap(([k, v]) => [
    ...(FORBIDDEN_KEYS.test(k) ? [`${at}.${k}`] : []),
    ...forbiddenKeys(v, `${at}.${k}`),
  ]);
}

/** Guarda (UPDATE_CONTRACTS=1) o compara la respuesta con su fixture. */
function checkContract(name, res) {
  expect(res.status).toBeLessThan(300);
  const body = normalize(res.body);
  expect(forbiddenKeys(body)).toEqual([]);

  const file = path.join(FIXTURES_DIR, `${name}.json`);
  if (UPDATE || !fs.existsSync(file)) {
    fs.mkdirSync(FIXTURES_DIR, { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(body, null, 2)}\n`);
    return;
  }
  const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
  const diff = shapeDiff(shapeOf(saved), shapeOf(body));
  if (diff.length) {
    throw new Error(
      `El contrato "${name}" cambió:\n  ${diff.join('\n  ')}\n` +
        'Si el cambio es intencional: UPDATE_CONTRACTS=1 npx jest tests/contracts, ' +
        'node scripts/sync-contract-fixtures.js y corre las pruebas de Android.',
    );
  }
}

describeIfDb('Contratos API ↔ Android (fixtures JSON)', () => {
  let token;
  const ids = {};
  const range = 'from=2000-01-01&to=2100-01-01';

  const post = async (url, body) => {
    const res = await request(app).post(`/api/v1${url}`).set(auth(token)).send(body);
    if (res.status >= 300) throw new Error(`${url} → ${res.status}: ${JSON.stringify(res.body)}`);
    return res.body.data;
  };
  const get = (url) => request(app).get(`/api/v1${url}`).set(auth(token));

  beforeAll(async () => {
    await connectTestDb();
    const tenant = await createTenant({ name: 'Contratos SA de CV' });
    await createUser({
      company: tenant.company,
      branch: tenant.branch,
      role: tenant.roles.administrador,
      email: 'admin@contratos.local',
      name: 'Ana',
      lastName: 'Contratos',
    });
    token = await login('admin@contratos.local', 'Clave1234');

    ids.product = (await post('/products', {
      sku: 'CT-001', name: 'Tornillo', unit: 'pza', costPrice: 2.5, salePrice: 4, minStock: 5,
    }))._id;
    await post('/products', { sku: 'CT-002', name: 'Tuerca sin uso', unit: 'pza' });
    ids.finished = (await post('/products', { sku: 'CT-003', name: 'Kit armado', unit: 'pza' }))._id;
    ids.supplier = (await post('/suppliers', { code: 'PROV-1', name: 'Distribuidora Norte' }))._id;
    ids.customer = (await post('/customers', { code: 'CLI-1', name: 'Comercial Central' }))._id;

    const po = await post('/purchase-orders', {
      supplierId: ids.supplier,
      lines: [{ productId: ids.product, quantity: 20, unitCost: 2.5 }],
    });
    await post(`/purchase-orders/${po._id}/approve`, {});
    await post('/purchase-orders', {
      supplierId: ids.supplier,
      lines: [{ productId: ids.product, quantity: 3, unitCost: 2.5 }],
    });

    const so = await post('/sales-orders', {
      customerId: ids.customer,
      lines: [{ productId: ids.product, quantity: 4, unitPrice: 4 }],
    });
    await post(`/sales-orders/${so._id}/approve`, {});
    await post('/sales-orders', {
      customerId: ids.customer,
      lines: [{ productId: ids.product, quantity: 1, unitPrice: 4 }],
    });

    const account = await post('/finance/accounts', { code: 'BCO-1', name: 'Banco Principal', type: 'bank' });
    await post('/finance/incomes', { amount: 1000, category: 'Aportación', accountId: account._id });
    await post('/finance/expenses', { amount: 150, category: 'Renta', accountId: account._id });
    await post('/crm/leads', { name: 'Prospecto Uno', company: 'Uno SA', expectedAmount: 5000 });
    await post('/hr/employees', { documentId: 'EMP-001', firstName: 'Luis', lastName: 'Pérez', position: 'Almacén' });
    const bom = await post('/production/boms', {
      productId: ids.finished,
      components: [{ productId: ids.product, quantity: 2 }],
    });
    await post('/production/orders', { bomId: bom._id, quantity: 1 });
    ids.project = (await post('/projects', { code: 'OBR-1', name: 'Obra Centro', budget: 100000 }))._id;
    await post('/cost-centers', { projectId: ids.project, code: 'CC-1', name: 'Materiales', budget: 5000 });
  });

  afterAll(async () => {
    await closeTestDb();
  });

  test('auth-login', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@contratos.local', password: 'Clave1234' });
    checkContract('auth-login', res);
  });

  test.each([
    ['auth-me', '/auth/me'],
    ['meta', '/meta'],
    ['sales-orders', '/sales-orders'],
    ['purchase-orders', '/purchase-orders'],
    ['products', '/products'],
    ['inventory-stock', '/inventory/stock'],
    ['inventory-movements', '/inventory/movements'],
    ['warehouses', '/warehouses'],
    ['customers', '/customers'],
    ['suppliers', '/suppliers'],
    ['reports-kpis', `/reports/kpis?${range}`],
    ['reports-sales', `/reports/sales?${range}`],
    ['reports-sales-by-day', `/reports/sales?${range}&groupBy=day`],
    ['reports-purchases', `/reports/purchases?${range}`],
    ['reports-inventory', '/reports/inventory'],
    ['reports-finance', `/reports/finance?${range}`],
    ['users', '/users'],
    ['roles', '/roles'],
    ['audit', '/audit?limit=20&result=SUCCESS'],
    ['finance-accounts', '/finance/accounts'],
    ['finance-incomes', '/finance/incomes'],
    ['finance-expenses', '/finance/expenses'],
    ['crm-leads', '/crm/leads'],
    ['hr-employees', '/hr/employees'],
    ['production-boms', '/production/boms'],
    ['production-orders', '/production/orders'],
    ['projects', '/projects'],
    ['cost-centers', '/cost-centers'],
  ])('%s', async (name, url) => {
    checkContract(name, await get(url));
  });

  test('events-ticket', async () => {
    checkContract('events-ticket', await request(app).post('/api/v1/events/ticket').set(auth(token)).send({}));
  });

  test('las listas de órdenes traen ids como texto y el nombre ya resuelto', async () => {
    const sales = (await get('/sales-orders')).body.data;
    expect(typeof sales[0].customerId).toBe('string');
    expect(sales[0].customerName).toBe('Comercial Central');
    const purchases = (await get('/purchase-orders')).body.data;
    expect(typeof purchases[0].supplierId).toBe('string');
    expect(purchases[0].supplierName).toBe('Distribuidora Norte');
  });
});
