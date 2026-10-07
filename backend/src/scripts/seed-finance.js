'use strict';

/**
 * DATOS DEMO DE COMPRAS Y FINANZAS POR EMPRESA (sólo para probar reportes).
 *
 * Uso (desde backend/):
 *   node src/scripts/seed-finance.js --company=FAI-XXXXXX [--dry-run] [--seed=123]
 *   npm run seed:sales -- --company=FAI-XXXXXX --count=10000 --with-finance
 *
 * Requiere ventas demo APROBADAS (seed-sales.js) en la empresa. Crea, todo
 * marcado con "seed:demo-sales" (ver remove-demo-sales.js):
 *  - Proveedores ficticios hasta tener 15.
 *  - ~1,200 órdenes de compra en los meses de las ventas (90 % aprobadas), con
 *    costos ±5 % del costo del producto; cada aprobada genera sus ENTRADAS de
 *    inventario (como purchase_order.service al aprobar) y su pago (gasto
 *    "Compras" al proveedor).
 *  - El INGRESO de cada venta demo aprobada que aún no lo tenga, con los
 *    mismos campos que incomeService.recordSale (cuenta VENTAS, "Ventas").
 *  - Gastos operativos mensuales (nómina, renta, servicios, transporte y
 *    publicidad) para un neto mensual con margen de 8–20 %.
 * Es re-ejecutable: no duplica ingresos y no repite compras ni gastos operativos demo.
 */

const mongoose = require('mongoose');
const { DEMO_MARK, createRng } = require('./lib/demo-sales-data');
const { DAY_MS, OPEX_PLAN, monthOf, planSuppliers, planPurchaseOrders, planOperatingExpenses } = require('./lib/demo-finance-data');
const cli = require('./lib/script-cli');

const MIN_SUPPLIERS = 15;
const PURCHASE_TARGET = 1200;
const BATCH_SIZE = 500;
const PURCHASE_CATEGORY = 'Compras';
const MARK_RE = new RegExp(DEMO_MARK.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
const round2 = (n) => Math.round(n * 100) / 100;
const sum = (list, pick) => round2(list.reduce((acc, x) => acc + pick(x), 0));

/** Modelos y servicios se cargan tarde: el script primero valida backend/.env. */
function models() {
  const accountService = require('../modules/accounts/account.service');
  return {
    Product: require('../modules/products/product.model'),
    Supplier: require('../modules/suppliers/supplier.model'),
    SalesOrder: require('../modules/sales-orders/sales_order.model'),
    PurchaseOrder: require('../modules/purchase-orders/purchase_order.model'),
    Income: require('../modules/incomes/income.model'),
    Expense: require('../modules/expenses/expense.model'),
    FinanceAccount: require('../modules/accounts/account.model'),
    InventoryMovement: require('../modules/inventory/inventory_movement.model'),
    StockLevel: require('../modules/inventory/stock_level.model'),
    Counter: require('../common/sequence').Counter,
    formatCode: require('../common/sequence').formatCode,
    saleIncomeFields: require('../modules/incomes/income.service').saleIncomeFields,
    accountService,
    SALES_ACCOUNT: accountService.SALES_ACCOUNT,
  };
}

/** Suma por mes (hora de México) de documentos POSTED de un modelo financiero. */
async function postedByMonth(Model, companyId) {
  const rows = await Model.aggregate([
    { $match: { companyId, status: 'POSTED' } },
    { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$date', timezone: 'America/Mexico_City' } }, total: { $sum: '$amount' } } },
  ]);
  return new Map(rows.map((r) => [r._id, r.total]));
}

const addTo = (map, key, value) => map.set(key, round2((map.get(key) || 0) + value));

/** Plan completo en memoria (nada se escribe). */
async function buildFinancePlan(ctx, { seed, now = new Date() }) {
  const m = models();
  const { companyId } = ctx;
  const rng = createRng(seed);

  const sales = await m.SalesOrder.find({ companyId, notes: DEMO_MARK, status: 'APPROVED' })
    .select('_id code total createdAt approvedAt customerId lines')
    .lean();
  if (!sales.length) {
    throw new Error(`${ctx.company.name} no tiene ventas demo aprobadas. Genera primero las ventas con seed-sales.js.`);
  }

  const [withIncome, suppliers, demoPurchases, demoOpex, account, products, incomeByMonth, otherExpensesByMonth] = await Promise.all([
    m.Income.distinct('salesOrderId', { companyId, status: 'POSTED', salesOrderId: { $in: sales.map((s) => s._id) } }),
    m.Supplier.find({ companyId, status: 'active' }).lean(),
    m.PurchaseOrder.countDocuments({ companyId, notes: DEMO_MARK }),
    m.Expense.countDocuments({ companyId, description: MARK_RE, category: { $in: OPEX_PLAN.map((o) => o.category) } }),
    m.FinanceAccount.findOne({ companyId, code: m.SALES_ACCOUNT.code }).lean(),
    m.Product.find({ companyId }).select('_id costPrice salePrice status trackingMode').lean(),
    postedByMonth(m.Income, companyId),
    postedByMonth(m.Expense, companyId),
  ]);
  if (account && account.status !== 'active') {
    throw new Error(`La cuenta ${m.SALES_ACCOUNT.code} está inactiva; actívala antes de generar los ingresos demo.`);
  }

  // Ingresos que faltan (misma regla que recordSale: un ingreso vigente por venta, total > 0).
  const hasIncome = new Set(withIncome.map(String));
  const incomeSales = sales.filter((s) => s.total > 0 && !hasIncome.has(String(s._id)));
  for (const sale of incomeSales) addTo(incomeByMonth, monthOf(sale.createdAt), sale.total);

  // Costo de lo vendido por mes: base de las compras.
  const costOf = new Map(products.map((p) => [String(p._id), p.costPrice > 0 ? p.costPrice : round2((p.salePrice || 0) * 0.65)]));
  const cogsByMonth = new Map();
  for (const sale of sales) {
    for (const line of sale.lines) addTo(cogsByMonth, monthOf(sale.createdAt), line.quantity * (costOf.get(String(line.productId)) || 0));
  }

  const newSuppliers = planSuppliers(suppliers, rng, companyId, MIN_SUPPLIERS);
  const purchasable = products
    .filter((p) => p.status === 'active' && (p.trackingMode || 'none') === 'none' && costOf.get(String(p._id)) > 0)
    .map((p) => ({ _id: p._id, cost: costOf.get(String(p._id)) }));
  const purchases = demoPurchases
    ? []
    : planPurchaseOrders({ ctx, rng, cogsByMonth, products: purchasable, suppliers: [...suppliers, ...newSuppliers], now, target: PURCHASE_TARGET });

  // Pago de cada compra aprobada: 0–15 días después, sin salirse del mes de la
  // aprobación (así el costo de cada mes queda en ese mes) ni pasar de hoy.
  const payments = purchases
    .filter((po) => po.status === 'APPROVED')
    .map((po) => {
      const approved = po.approvedAt.getTime();
      let date = new Date(Math.min(approved + rng.int(0, 15) * DAY_MS, now.getTime() - 60 * 1000));
      if (monthOf(date) !== monthOf(po.approvedAt)) date = new Date(Math.min(approved + rng.int(1, 6) * 3600 * 1000, now.getTime() - 60 * 1000));
      if (monthOf(date) !== monthOf(po.approvedAt)) date = po.approvedAt;
      return { po, date };
    });
  const purchasesByMonth = new Map();
  for (const p of payments) addTo(purchasesByMonth, monthOf(p.date), p.po.total);

  const opex = demoOpex
    ? { expenses: [], margins: new Map() }
    : planOperatingExpenses({ incomeByMonth, purchasesByMonth, otherExpensesByMonth, rng, now });

  return {
    sales: sales.length,
    incomeSales,
    suppliers: newSuppliers,
    purchases,
    payments,
    opex: opex.expenses,
    margins: opex.margins,
    skipped: { purchases: demoPurchases > 0, opex: demoOpex > 0, incomes: sales.length - incomeSales.length },
    accountExists: Boolean(account),
    incomeByMonth,
  };
}

function describeFinancePlan(ctx, plan) {
  const approved = plan.purchases.filter((p) => p.status === 'APPROVED');
  const margins = [...plan.margins.values()];
  const pct = (v) => `${(v * 100).toFixed(1)} %`;
  return [
    `Empresa:            ${ctx.company.name} (${ctx.company.joinCode})`,
    `Ventas demo:        ${cli.formatInt(plan.sales)} aprobadas`,
    `Proveedores:        se crearán ${cli.formatInt(plan.suppliers.length)} (mínimo ${MIN_SUPPLIERS})`,
    plan.skipped.purchases
      ? 'Compras:            ya existen compras demo; no se crean más'
      : `Compras:            ${cli.formatInt(plan.purchases.length)} órdenes (APPROVED ${cli.formatInt(approved.length)}) · ${cli.formatMoney(sum(approved, (p) => p.total))} MXN · ${cli.formatInt(approved.reduce((n, p) => n + p.lines.length, 0))} entradas de inventario`,
    `Ingresos:           ${cli.formatInt(plan.incomeSales.length)} nuevos · ${cli.formatMoney(sum(plan.incomeSales, (s) => s.total))} MXN (${cli.formatInt(plan.skipped.incomes)} ventas ya tenían ingreso)`,
    `Gastos:             ${cli.formatInt(plan.payments.length)} pagos a proveedores · ${cli.formatInt(plan.opex.length)} operativos (${cli.formatMoney(sum(plan.opex, (e) => e.amount))} MXN)${plan.skipped.opex ? ' · ya existían gastos operativos demo' : ''}`,
    margins.length ? `Margen neto:        ${pct(Math.min(...margins))} a ${pct(Math.max(...margins))} por mes` : 'Margen neto:        sin cambios',
    `Cuenta:             VENTAS${plan.accountExists ? '' : ' (se creará)'}`,
    `Marca:              todo quedará marcado con "${DEMO_MARK}"`,
  ].join('\n');
}

function assertValid(Model, docs) {
  for (const doc of docs) {
    const error = new Model(doc).validateSync();
    if (error) throw new Error(`Documento inválido para ${Model.modelName}: ${error.message}`);
  }
}

/** Reserva `count` folios consecutivos del contador del módulo; devuelve el primero - 1. */
async function reserve(m, companyId, key, count) {
  if (!count) return 0;
  const counter = await m.Counter.findOneAndUpdate({ companyId, key }, { $inc: { seq: count } }, { upsert: true, new: true }).lean();
  return counter.seq - count;
}

async function insertInBatches(Model, docs) {
  assertValid(Model, docs);
  for (let start = 0; start < docs.length; start += BATCH_SIZE) {
    await Model.collection.insertMany(docs.slice(start, start + BATCH_SIZE), { ordered: true });
  }
}

/** Compras: folios, ENTRADAS de inventario y existencias (mismo efecto que aprobar). */
async function writePurchases(m, ctx, plan) {
  let seq = await reserve(m, ctx.companyId, 'purchase_orders', plan.purchases.length);
  for (const po of plan.purchases) po.code = m.formatCode('PO', (seq += 1));

  const levels = await m.StockLevel.find({ companyId: ctx.companyId, warehouseId: ctx.warehouse._id }).lean();
  const running = new Map(levels.map((l) => [String(l.productId), l.quantity]));
  const movements = [];
  const increments = new Map();
  for (const po of plan.purchases.filter((p) => p.status === 'APPROVED')) {
    for (const line of po.lines) {
      const key = String(line.productId);
      const before = running.get(key) || 0;
      running.set(key, before + line.quantity);
      increments.set(key, (increments.get(key) || 0) + line.quantity);
      movements.push({
        _id: new mongoose.Types.ObjectId(),
        companyId: ctx.companyId,
        type: 'ENTRY',
        productId: line.productId,
        warehouseId: ctx.warehouse._id,
        toWarehouseId: null,
        quantity: line.quantity,
        delta: line.quantity,
        quantityBefore: before,
        quantityAfter: before + line.quantity,
        reason: `Aprobación de orden de compra ${po.code} · ${DEMO_MARK}`,
        reference: po.code,
        idempotencyKey: null,
        traceability: [],
        userId: ctx.admin._id,
        createdAt: po.approvedAt,
        updatedAt: po.approvedAt,
        __v: 0,
      });
    }
  }
  await insertInBatches(m.PurchaseOrder, plan.purchases);
  await insertInBatches(m.InventoryMovement, movements);
  if (increments.size) {
    const stamp = new Date();
    await m.StockLevel.bulkWrite(
      [...increments.entries()].map(([productId, qty]) => ({
        updateOne: {
          filter: { companyId: ctx.companyId, warehouseId: ctx.warehouse._id, productId: new mongoose.Types.ObjectId(productId) },
          update: { $inc: { quantity: qty }, $set: { updatedAt: stamp }, $setOnInsert: { createdAt: stamp } },
          upsert: true,
        },
      })),
      { ordered: true }
    );
  }
  return movements.length;
}

async function executeFinancePlan(ctx, plan, log = () => {}) {
  const m = models();
  const { companyId } = ctx;
  const account = await m.accountService.ensureSalesAccount(String(companyId));
  const docBase = (date) => ({ _id: new mongoose.Types.ObjectId(), companyId, status: 'POSTED', voidedBy: null, voidedAt: null, voidReason: null, createdBy: ctx.admin._id, createdAt: date, updatedAt: date, __v: 0 });

  if (plan.suppliers.length) await insertInBatches(m.Supplier, plan.suppliers.map((s) => ({ ...s, createdAt: new Date(), updatedAt: new Date(), __v: 0 })));
  const entries = await writePurchases(m, ctx, plan);
  log(`Compras: ${cli.formatInt(plan.purchases.length)} órdenes y ${cli.formatInt(entries)} entradas de inventario.`);

  let incSeq = await reserve(m, companyId, 'incomes', plan.incomeSales.length);
  const incomes = plan.incomeSales.map((sale) => {
    const fields = m.saleIncomeFields(sale, account._id);
    return { ...docBase(sale.approvedAt || sale.createdAt), ...fields, code: m.formatCode('INC', (incSeq += 1)), description: `${fields.description} · ${DEMO_MARK}` };
  });
  await insertInBatches(m.Income, incomes);
  log(`Ingresos: ${cli.formatInt(incomes.length)} registrados.`);

  const expenseRows = [
    ...plan.payments.map(({ po, date }) => ({ amount: po.total, date, category: PURCHASE_CATEGORY, supplierId: po.supplierId, reference: po.code, description: `Pago de orden de compra ${po.code}` })),
    ...plan.opex.map((e) => ({ ...e, supplierId: null, reference: null })),
  ].sort((a, b) => a.date - b.date);
  let expSeq = await reserve(m, companyId, 'expenses', expenseRows.length);
  const expenses = expenseRows.map((e) => ({
    ...docBase(e.date),
    code: m.formatCode('EXP', (expSeq += 1)),
    amount: e.amount,
    date: e.date,
    category: e.category,
    method: 'transfer',
    accountId: account._id,
    supplierId: e.supplierId,
    reference: e.reference,
    description: `${e.description} · ${DEMO_MARK}`,
  }));
  await insertInBatches(m.Expense, expenses);
  log(`Gastos: ${cli.formatInt(expenses.length)} registrados.`);

  // Saldo de la cuenta: un solo incremento con el neto (ingresos - gastos demo).
  const net = round2(sum(incomes, (i) => i.amount) - sum(expenses, (e) => e.amount));
  if (net) await m.FinanceAccount.updateOne({ _id: account._id, companyId }, { $inc: { balance: net } });
  return { incomes: incomes.length, expenses: expenses.length, purchases: plan.purchases.length, net };
}

/** API para pruebas y CLI. Devuelve { plan, executed, result }. */
async function seedDemoFinance({ joinCode, seed = Date.now(), dryRun = false, confirmFn = async () => true, log = () => {}, now }) {
  const { loadContext } = require('./seed-sales');
  const ctx = await loadContext(joinCode);
  const plan = await buildFinancePlan(ctx, { seed: Number(seed), now });
  log(describeFinancePlan(ctx, plan));
  if (dryRun) return { plan, executed: false };
  if (!(await confirmFn())) return { plan, executed: false };
  const result = await executeFinancePlan(ctx, plan, log);
  return { plan, executed: true, result };
}

async function main() {
  const args = cli.parseArgs();
  cli.loadBackendEnv();
  /* eslint-disable no-console */
  console.log(`Base de datos: ${cli.describeMongoUri(process.env.MONGO_URI)}\n`);
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  try {
    const result = await seedDemoFinance({
      joinCode: args.company,
      seed: args.seed || Date.now(),
      dryRun: Boolean(args['dry-run']),
      confirmFn: () => cli.confirm('\n¿Generar compras y finanzas demo? Escribe "si" para continuar: '),
      log: (line) => console.log(line),
    });
    if (args['dry-run']) console.log('\n(--dry-run: no se escribió nada)');
    else if (!result.executed) console.log('\nCancelado: no se escribió nada.');
    else console.log(`\n✔ Listo. Neto demo en la cuenta VENTAS: ${cli.formatMoney(result.result.net)}.`);
    return 0;
  } finally {
    await mongoose.disconnect();
  }
  /* eslint-enable no-console */
}

if (require.main === module) cli.runCli(main);

module.exports = { seedDemoFinance, buildFinancePlan, MIN_SUPPLIERS, PURCHASE_TARGET, PURCHASE_CATEGORY };
