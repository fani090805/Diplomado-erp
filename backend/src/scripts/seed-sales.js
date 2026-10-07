'use strict';

/**
 * GENERADOR DE VENTAS DEMO POR EMPRESA (sólo para probar reportes).
 *
 * Uso (desde backend/):
 *   node src/scripts/seed-sales.js --company=FAI-XXXXXX --count=10000 [--dry-run] [--seed=123]
 *   npm run seed:sales -- --company=FAI-XXXXXX --count=10000
 *   npm run seed:sales -- --company=FAI-XXXXXX --count=10000 --with-finance
 *
 * --with-finance: al terminar las ventas ejecuta seed-finance.js (proveedores,
 * compras con sus entradas, ingresos de las ventas aprobadas y gastos).
 *
 * Reglas:
 *  - Sólo opera sobre la empresa del joinCode indicado (todas las consultas
 *    y escrituras llevan su companyId). Si no existe, termina con error.
 *  - Lee MONGO_URI de backend/.env; si falta, se detiene.
 *  - Muestra un resumen y pide escribir "si" (--dry-run sólo muestra el resumen).
 *  - Replica lo que hace el servicio real al APROBAR una venta: una SALIDA de
 *    inventario por línea desde el almacén. El INGRESO de cada venta aprobada
 *    lo crea seed-finance.js (--with-finance), igual que incomeService.recordSale.
 *    Las existencias iniciales se registran con inventoryService.entry.
 *  - Todo lo generado lleva la marca "seed:demo-sales" (ver remove-demo-sales.js).
 */

const mongoose = require('mongoose');
const {
  DEMO_MARK,
  PRODUCT_TEMPLATES,
  REJECTION_REASONS,
  MONTH_WEIGHTS,
  WEEKDAY_WEIGHTS,
  createRng,
  fakeCustomer,
} = require('./lib/demo-sales-data');
const cli = require('./lib/script-cli');

const MIN_PRODUCTS = 30;
const MIN_CUSTOMERS = 120;
const BATCH_SIZE = 500;
const MX_OFFSET_MS = 6 * 3600 * 1000; // America/Mexico_City: UTC-6 todo el año.
const DAY_MS = 24 * 3600 * 1000;
const LINE_COUNTS = [1, 1, 2, 2, 2, 3, 3, 4, 5, 6];
const round2 = (n) => Math.round(n * 100) / 100;

/** Modelos y servicio se cargan tarde: el script primero valida backend/.env. */
function models() {
  return {
    Company: require('../modules/companies/company.model'),
    Warehouse: require('../modules/warehouses/warehouse.model'),
    Role: require('../modules/roles/role.model'),
    User: require('../modules/users/user.model'),
    Product: require('../modules/products/product.model'),
    Customer: require('../modules/customers/customer.model'),
    SalesOrder: require('../modules/sales-orders/sales_order.model'),
    InventoryMovement: require('../modules/inventory/inventory_movement.model'),
    StockLevel: require('../modules/inventory/stock_level.model'),
    Counter: require('../common/sequence').Counter,
    formatCode: require('../common/sequence').formatCode,
    inventoryService: require('../modules/inventory/inventory.service'),
  };
}

/** Empresa (por joinCode), almacén principal y administrador. Error si falta algo. */
async function loadContext(joinCode) {
  const m = models();
  const code = String(joinCode || '').trim().toUpperCase();
  if (!code) throw new Error('Indica la empresa con --company=FAI-XXXXXX (su código de empresa).');
  const company = await m.Company.findOne({ joinCode: code }).lean();
  if (!company) throw new Error(`No existe ninguna empresa con el código ${code}.`);
  if (company.status !== 'active') throw new Error(`La empresa ${company.name} está suspendida.`);

  const companyId = company._id;
  const warehouse = await m.Warehouse.findOne({ companyId, isDefault: true }).lean();
  if (!warehouse || warehouse.status !== 'active') {
    throw new Error('La empresa no tiene un almacén principal activo.');
  }
  const adminRole = await m.Role.findOne({ companyId, code: 'administrador' }).lean();
  const admin = adminRole
    ? await m.User.findOne({ companyId, roleId: adminRole._id, status: 'active' }).sort({ createdAt: 1 }).lean()
    : null;
  if (!admin) throw new Error('La empresa no tiene un administrador activo (createdBy/approvedBy).');

  const [products, customers] = await Promise.all([
    m.Product.find({ companyId, status: 'active' }).lean(),
    m.Customer.find({ companyId, status: 'active' }).lean(),
  ]);
  return { company, companyId, warehouse, admin, products, customers };
}

/** Productos demo que faltan para llegar a MIN_PRODUCTS utilizables (sin lote/serie, con precio). */
function planProducts(ctx, rng) {
  const usable = ctx.products.filter((p) => (p.trackingMode || 'none') === 'none' && p.salePrice > 0);
  const missing = Math.max(0, MIN_PRODUCTS - usable.length);
  const takenSkus = new Set(ctx.products.map((p) => p.sku));
  const takenNames = new Set(ctx.products.map((p) => p.name.toLowerCase()));
  const templates = PRODUCT_TEMPLATES.filter(([name]) => !takenNames.has(name.toLowerCase()));
  const created = [];
  for (let i = 0; created.length < missing && i < templates.length * 3; i += 1) {
    const [baseName, category, unit, basePrice] = templates[i % templates.length];
    const name = i < templates.length ? baseName : `${baseName} (modelo ${Math.floor(i / templates.length) + 1})`;
    const prefix = category.normalize('NFD').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
    let n = created.length + 1;
    let sku = `DEMO-${prefix}-${String(n).padStart(3, '0')}`;
    while (takenSkus.has(sku)) sku = `DEMO-${prefix}-${String((n += 1)).padStart(3, '0')}`;
    takenSkus.add(sku);
    const salePrice = Math.min(8500, Math.max(25, round2(basePrice * (0.9 + rng.next() * 0.2))));
    created.push({
      _id: new mongoose.Types.ObjectId(),
      companyId: ctx.companyId,
      sku,
      name,
      category,
      unit,
      salePrice,
      costPrice: round2(salePrice * (0.55 + rng.next() * 0.2)),
      taxRate: 16,
      minStock: rng.int(5, 25),
      trackingMode: 'none',
      status: 'active',
      description: `${DEMO_MARK} · Producto de demostración`,
    });
  }
  return { usable: [...usable, ...created], created };
}

function planCustomers(ctx, rng) {
  const missing = Math.max(0, MIN_CUSTOMERS - ctx.customers.length);
  const takenCodes = new Set(ctx.customers.map((c) => c.code));
  const created = [];
  for (let index = 1; created.length < missing; index += 1) {
    const fake = fakeCustomer(rng, index);
    if (takenCodes.has(fake.code)) continue;
    const { city, ...data } = fake;
    created.push({ _id: new mongoose.Types.ObjectId(), companyId: ctx.companyId, ...data, status: 'active', notes: `${DEMO_MARK} · ${city}` });
  }
  return { all: [...ctx.customers, ...created], created };
}

/** Días de los últimos 12 meses (en hora de México) con su peso de temporada. */
function weightedDays(now) {
  const mxToday = new Date(now.getTime() - MX_OFFSET_MS);
  const base = Date.UTC(mxToday.getUTCFullYear(), mxToday.getUTCMonth(), mxToday.getUTCDate());
  const days = [];
  let cumulative = 0;
  for (let i = 0; i < 365; i += 1) {
    const day = new Date(base - i * DAY_MS);
    cumulative += MONTH_WEIGHTS[day.getUTCMonth()] * WEEKDAY_WEIGHTS[day.getUTCDay()];
    days.push({ start: day.getTime() + MX_OFFSET_MS, cumulative });
  }
  return { days, total: cumulative, windowStart: new Date(days[days.length - 1].start) };
}

function sampleDate(rng, calendar, now) {
  const target = rng.next() * calendar.total;
  const day = calendar.days.find((d) => d.cumulative >= target) || calendar.days[0];
  const at = day.start + rng.int(9 * 60, 19 * 60) * 60 * 1000 + rng.int(0, 59) * 1000; // 9:00–19:59 MX
  return new Date(Math.min(at, now.getTime() - rng.int(1, 30) * 60 * 1000));
}

/** Estados exactos (85/10/5) repartidos al azar entre las órdenes. */
function shuffledStatuses(count, rng) {
  const approved = Math.round(count * 0.85);
  const rejected = Math.round(count * 0.05);
  const statuses = [
    ...Array(approved).fill('APPROVED'),
    ...Array(rejected).fill('REJECTED'),
    ...Array(count - approved - rejected).fill('DRAFT'),
  ];
  for (let i = statuses.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng.next() * (i + 1));
    [statuses[i], statuses[j]] = [statuses[j], statuses[i]];
  }
  return statuses;
}

function buildOrder(ctx, rng, { products, customers, calendar, now, status }) {
  const createdAt = sampleDate(rng, calendar, now);
  const reviewedAt = new Date(Math.min(createdAt.getTime() + rng.int(5, 240) * 60 * 1000, now.getTime()));
  const chosen = new Set();
  const lines = [];
  const lineCount = Math.min(rng.pick(LINE_COUNTS), products.length);
  while (lines.length < lineCount) {
    const product = rng.pick(products);
    if (chosen.has(String(product._id))) continue;
    chosen.add(String(product._id));
    lines.push({
      productId: product._id,
      quantity: 1 + Math.floor(19 * rng.next() ** 2),
      unitPrice: round2(product.salePrice * (0.9 + rng.next() * 0.2)),
    });
  }
  const order = {
    _id: new mongoose.Types.ObjectId(),
    companyId: ctx.companyId,
    customerId: rng.pick(customers)._id,
    warehouseId: ctx.warehouse._id,
    status,
    lines,
    total: round2(lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0)),
    notes: DEMO_MARK,
    createdBy: ctx.admin._id,
    approvedBy: null,
    approvedAt: null,
    rejectedBy: null,
    rejectedAt: null,
    rejectionReason: null,
    createdAt,
    updatedAt: status === 'DRAFT' ? createdAt : reviewedAt,
    __v: 0,
  };
  if (status === 'APPROVED') Object.assign(order, { approvedBy: ctx.admin._id, approvedAt: reviewedAt });
  if (status === 'REJECTED') {
    Object.assign(order, { rejectedBy: ctx.admin._id, rejectedAt: reviewedAt, rejectionReason: rng.pick(REJECTION_REASONS) });
  }
  return order;
}

/** Plan completo en memoria (nada se escribe): productos, clientes, órdenes y existencias. */
function buildPlan(ctx, { count, seed, now = new Date() }) {
  const rng = createRng(seed);
  const products = planProducts(ctx, rng);
  const customers = planCustomers(ctx, rng);
  if (!products.usable.length) throw new Error('No hay productos utilizables para generar ventas.');

  const calendar = weightedDays(now);
  const statuses = shuffledStatuses(count, rng);
  const orders = statuses
    .map((status) => buildOrder(ctx, rng, { products: products.usable, customers: customers.all, calendar, now, status }))
    .sort((a, b) => a.createdAt - b.createdAt);

  // Demanda aprobada por producto y existencia inicial que la cubre (+ colchón realista).
  const demand = new Map();
  for (const order of orders.filter((o) => o.status === 'APPROVED')) {
    for (const line of order.lines) {
      demand.set(String(line.productId), (demand.get(String(line.productId)) || 0) + line.quantity);
    }
  }
  const byId = new Map(products.usable.map((p) => [String(p._id), p]));
  const entries = [...demand.entries()].map(([productId, qty]) => {
    const minStock = byId.get(productId).minStock || 0;
    // ~15% de los productos termina en stock bajo; el resto, por encima del mínimo.
    const buffer = minStock > 0 && rng.next() < 0.15 ? rng.int(1, minStock) : minStock + rng.int(10, 60);
    return { productId, quantity: qty + buffer };
  });

  const approved = orders.filter((o) => o.status === 'APPROVED');
  return {
    products: products.created,
    customers: customers.created,
    orders,
    entries,
    entryDate: new Date(calendar.windowStart.getTime() - DAY_MS),
    summary: {
      usableProducts: products.usable.length,
      existingProducts: products.usable.length - products.created.length,
      existingCustomers: ctx.customers.length,
      statuses: { APPROVED: approved.length, DRAFT: orders.filter((o) => o.status === 'DRAFT').length, REJECTED: orders.filter((o) => o.status === 'REJECTED').length },
      approvedTotal: round2(approved.reduce((sum, o) => sum + o.total, 0)),
      exitMovements: approved.reduce((sum, o) => sum + o.lines.length, 0),
      entryUnits: entries.reduce((sum, e) => sum + e.quantity, 0),
      from: orders[0]?.createdAt,
      to: orders[orders.length - 1]?.createdAt,
    },
  };
}

function describePlan(ctx, plan) {
  const s = plan.summary;
  const day = (d) => (d ? d.toISOString().slice(0, 10) : '—');
  return [
    `Empresa:            ${ctx.company.name} (${ctx.company.joinCode})`,
    `Almacén principal:  ${ctx.warehouse.name}`,
    `Administrador:      ${ctx.admin.email} (createdBy / approvedBy)`,
    `Productos:          ${cli.formatInt(s.existingProducts)} utilizables existentes · se crearán ${cli.formatInt(plan.products.length)}`,
    `Clientes:           ${cli.formatInt(s.existingCustomers)} existentes · se crearán ${cli.formatInt(plan.customers.length)}`,
    `Ventas:             ${cli.formatInt(plan.orders.length)} (APPROVED ${cli.formatInt(s.statuses.APPROVED)} · DRAFT ${cli.formatInt(s.statuses.DRAFT)} · REJECTED ${cli.formatInt(s.statuses.REJECTED)})`,
    `Periodo:            ${day(s.from)} a ${day(s.to)}`,
    `Total aprobado:     ${cli.formatMoney(s.approvedTotal)} MXN`,
    `Inventario:         ${cli.formatInt(plan.entries.length)} entradas iniciales (${cli.formatInt(s.entryUnits)} unidades) · ${cli.formatInt(s.exitMovements)} salidas`,
    'Ingresos:           los crea --with-finance (o seed-finance.js) para cada venta aprobada',
    `Marca:              todo quedará marcado con "${DEMO_MARK}"`,
  ].join('\n');
}

/** Valida contra el esquema de Mongoose antes de insertar en bloque con el driver. */
function assertValid(Model, docs) {
  for (const doc of docs) {
    const error = new Model(doc).validateSync();
    if (error) throw new Error(`Documento inválido para ${Model.modelName}: ${error.message}`);
  }
}

/** Escribe el plan: catálogos, existencias iniciales y ventas en lotes de BATCH_SIZE. */
async function executePlan(ctx, plan, log = () => {}) {
  const m = models();
  const actor = { companyId: String(ctx.companyId), userId: String(ctx.admin._id) };

  if (plan.products.length) await m.Product.insertMany(plan.products);
  if (plan.customers.length) await m.Customer.insertMany(plan.customers);
  log(`Catálogos: ${plan.products.length} productos y ${plan.customers.length} clientes creados.`);

  // Existencias iniciales con el mecanismo real del módulo inventory, fechadas al inicio del periodo.
  const running = new Map();
  for (const entry of plan.entries) {
    const movement = await m.inventoryService.entry(
      {
        productId: entry.productId,
        warehouseId: String(ctx.warehouse._id),
        quantity: entry.quantity,
        reason: `Inventario inicial demo · ${DEMO_MARK}`,
        reference: 'DEMO-INICIAL',
      },
      actor
    );
    await m.InventoryMovement.collection.updateOne(
      { _id: movement._id, companyId: ctx.companyId },
      { $set: { createdAt: plan.entryDate, updatedAt: plan.entryDate } }
    );
    running.set(entry.productId, movement.quantityAfter);
  }
  log(`Inventario: ${plan.entries.length} entradas iniciales registradas.`);

  // Códigos consecutivos reservados de golpe en el contador atómico del módulo (SO-000001…).
  const counter = await m.Counter.findOneAndUpdate(
    { companyId: ctx.companyId, key: 'sales_orders' },
    { $inc: { seq: plan.orders.length } },
    { upsert: true, new: true }
  ).lean();
  let seq = counter.seq - plan.orders.length;

  for (let start = 0; start < plan.orders.length; start += BATCH_SIZE) {
    const batch = plan.orders.slice(start, start + BATCH_SIZE).map((o) => ({ ...o, code: m.formatCode('SO', (seq += 1)) }));
    const movements = [];
    const decrements = new Map();
    for (const order of batch.filter((o) => o.status === 'APPROVED')) {
      for (const line of order.lines) {
        const key = String(line.productId);
        const before = running.get(key);
        running.set(key, before - line.quantity);
        decrements.set(key, (decrements.get(key) || 0) + line.quantity);
        movements.push({
          _id: new mongoose.Types.ObjectId(),
          companyId: ctx.companyId,
          type: 'EXIT',
          productId: line.productId,
          warehouseId: ctx.warehouse._id,
          toWarehouseId: null,
          quantity: line.quantity,
          delta: -line.quantity,
          quantityBefore: before,
          quantityAfter: before - line.quantity,
          reason: `Aprobación de pedido de venta ${order.code} · ${DEMO_MARK}`,
          reference: order.code,
          idempotencyKey: null,
          traceability: [],
          userId: ctx.admin._id,
          createdAt: order.approvedAt,
          updatedAt: order.approvedAt,
          __v: 0,
        });
      }
    }
    assertValid(m.SalesOrder, batch);
    assertValid(m.InventoryMovement, movements);

    await m.SalesOrder.collection.insertMany(batch, { ordered: true });
    if (movements.length) await m.InventoryMovement.collection.insertMany(movements, { ordered: true });
    if (decrements.size) {
      // Mismo decremento condicional que la salida real: nunca deja existencias negativas.
      const ops = [...decrements.entries()].map(([productId, qty]) => ({
        updateOne: {
          filter: { companyId: ctx.companyId, warehouseId: ctx.warehouse._id, productId: new mongoose.Types.ObjectId(productId), quantity: { $gte: qty } },
          update: { $inc: { quantity: -qty }, $set: { updatedAt: new Date() } },
        },
      }));
      const result = await m.StockLevel.bulkWrite(ops, { ordered: true });
      if (result.modifiedCount !== ops.length) {
        throw new Error('Existencias insuficientes al descontar un lote (¿hubo salidas reales en paralelo?). Ejecuta remove-demo-sales.js para limpiar.');
      }
    }
    log(`${cli.formatInt(Math.min(start + BATCH_SIZE, plan.orders.length))} / ${cli.formatInt(plan.orders.length)}`);
  }
  return { firstCode: m.formatCode('SO', counter.seq - plan.orders.length + 1), lastCode: m.formatCode('SO', counter.seq) };
}

/**
 * API para pruebas y CLI. `confirmFn` decide si se escribe (CLI: pide "si").
 * Devuelve { plan, executed, codes }.
 */
async function seedDemoSales({ joinCode, count, seed = Date.now(), dryRun = false, withFinance = false, confirmFn = async () => true, log = () => {}, now }) {
  const total = Number(count);
  if (!Number.isInteger(total) || total < 1 || total > 100000) {
    throw new Error('--count debe ser un entero entre 1 y 100000.');
  }
  const ctx = await loadContext(joinCode);
  const plan = buildPlan(ctx, { count: total, seed: Number(seed), now });
  log(describePlan(ctx, plan));
  if (dryRun) {
    if (withFinance) log('\n--with-finance: compras e ingresos se calculan con las ventas ya creadas (no en --dry-run).');
    return { plan, executed: false };
  }
  if (!(await confirmFn())) return { plan, executed: false };
  const codes = await executePlan(ctx, plan, log);
  if (!withFinance) return { plan, executed: true, codes };

  log('\nCompras y finanzas demo:');
  const { seedDemoFinance } = require('./seed-finance');
  const finance = await seedDemoFinance({ joinCode, seed: Number(seed) + 1, log, now });
  return { plan, executed: true, codes, finance };
}

async function main() {
  const args = cli.parseArgs();
  cli.loadBackendEnv();
  /* eslint-disable no-console */
  console.log(`Base de datos: ${cli.describeMongoUri(process.env.MONGO_URI)}\n`);
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  try {
    const result = await seedDemoSales({
      joinCode: args.company,
      count: args.count || 10000,
      seed: args.seed || Date.now(),
      dryRun: Boolean(args['dry-run']),
      withFinance: Boolean(args['with-finance']),
      confirmFn: () => cli.confirm('\n¿Generar estos datos? Escribe "si" para continuar: '),
      log: (line) => console.log(line),
    });
    if (args['dry-run']) console.log('\n(--dry-run: no se escribió nada)');
    else if (!result.executed) console.log('\nCancelado: no se escribió nada.');
    else console.log(`\n✔ Listo. Ventas ${result.codes.firstCode} a ${result.codes.lastCode}.`);
    return 0;
  } finally {
    await mongoose.disconnect();
  }
  /* eslint-enable no-console */
}

if (require.main === module) cli.runCli(main);

module.exports = { seedDemoSales, buildPlan, loadContext, MIN_PRODUCTS, MIN_CUSTOMERS };
