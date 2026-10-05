'use strict';

/**
 * BORRA LOS DATOS DEMO generados por seed-sales.js (marca "seed:demo-sales")
 * de UNA empresa: ventas, movimientos de inventario, clientes y productos demo.
 *
 * Uso (desde backend/):
 *   node src/scripts/remove-demo-sales.js --company=FAI-XXXXXX [--dry-run]
 *   npm run seed:sales:remove -- --company=FAI-XXXXXX
 *
 * Reglas:
 *  - Sólo toca documentos de esa empresa con la marca demo.
 *  - Revierte en stock_levels el efecto neto de los movimientos demo. Si eso
 *    dejara alguna existencia negativa (hubo salidas reales que consumieron
 *    stock demo), se detiene SIN borrar nada.
 *  - Clientes/productos demo usados por documentos reales se conservan.
 *  - El contador de folios no retrocede (los códigos SO-… no se reutilizan).
 *  - La generación no crea ingresos, así que no hay ingresos que borrar.
 */

const mongoose = require('mongoose');
const { DEMO_MARK } = require('./lib/demo-sales-data');
const cli = require('./lib/script-cli');

const MARK_RE = new RegExp(DEMO_MARK.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

function models() {
  return {
    Company: require('../modules/companies/company.model'),
    Product: require('../modules/products/product.model'),
    Customer: require('../modules/customers/customer.model'),
    SalesOrder: require('../modules/sales-orders/sales_order.model'),
    PurchaseOrder: require('../modules/purchase-orders/purchase_order.model'),
    InventoryMovement: require('../modules/inventory/inventory_movement.model'),
    StockLevel: require('../modules/inventory/stock_level.model'),
  };
}

/** Calcula qué se borraría y valida que el stock quede consistente. No escribe nada. */
async function planRemoval(joinCode) {
  const m = models();
  const code = String(joinCode || '').trim().toUpperCase();
  if (!code) throw new Error('Indica la empresa con --company=FAI-XXXXXX (su código de empresa).');
  const company = await m.Company.findOne({ joinCode: code }).lean();
  if (!company) throw new Error(`No existe ninguna empresa con el código ${code}.`);
  const companyId = company._id;

  const [orderCount, movementGroups, demoCustomers, demoProducts] = await Promise.all([
    m.SalesOrder.countDocuments({ companyId, notes: DEMO_MARK }),
    m.InventoryMovement.aggregate([
      { $match: { companyId, reason: MARK_RE } },
      { $group: { _id: { warehouseId: '$warehouseId', productId: '$productId' }, net: { $sum: '$delta' }, count: { $sum: 1 } } },
    ]),
    m.Customer.find({ companyId, notes: MARK_RE }).select('_id').lean(),
    m.Product.find({ companyId, description: MARK_RE }).select('_id sku name').lean(),
  ]);

  // Revertir el efecto neto de los movimientos demo no puede dejar existencias negativas.
  const stockFixes = [];
  const conflicts = [];
  for (const group of movementGroups) {
    const level = await m.StockLevel.findOne({ companyId, ...group._id }).lean();
    const current = level ? level.quantity : 0;
    if (current - group.net < 0) conflicts.push({ ...group._id, current, net: group.net });
    else if (group.net !== 0) stockFixes.push({ ...group._id, net: group.net });
  }

  // Clientes y productos demo que ya usa algún documento real se conservan.
  const customerIds = demoCustomers.map((c) => c._id);
  const usedCustomers = await m.SalesOrder.distinct('customerId', {
    companyId,
    customerId: { $in: customerIds },
    notes: { $ne: DEMO_MARK },
  });
  const productIds = demoProducts.map((p) => p._id);
  const [realMovements, realSales, realPurchases] = await Promise.all([
    m.InventoryMovement.distinct('productId', { companyId, productId: { $in: productIds }, reason: { $not: MARK_RE } }),
    m.SalesOrder.distinct('lines.productId', { companyId, 'lines.productId': { $in: productIds }, notes: { $ne: DEMO_MARK } }),
    m.PurchaseOrder.distinct('lines.productId', { companyId, 'lines.productId': { $in: productIds } }),
  ]);
  const usedProducts = new Set([...realMovements, ...realSales, ...realPurchases].map(String));
  const keptCustomers = new Set(usedCustomers.map(String));

  return {
    company,
    companyId,
    orderCount,
    movementCount: movementGroups.reduce((sum, g) => sum + g.count, 0),
    stockFixes,
    conflicts,
    customersToDelete: customerIds.filter((id) => !keptCustomers.has(String(id))),
    customersKept: keptCustomers.size,
    productsToDelete: productIds.filter((id) => !usedProducts.has(String(id))),
    productsKept: demoProducts.filter((p) => usedProducts.has(String(p._id))),
  };
}

function describeRemoval(plan) {
  return [
    `Empresa:      ${plan.company.name} (${plan.company.joinCode})`,
    `Ventas demo:  ${cli.formatInt(plan.orderCount)}`,
    `Movimientos:  ${cli.formatInt(plan.movementCount)} (se revierten ${cli.formatInt(plan.stockFixes.length)} existencias)`,
    `Clientes:     ${cli.formatInt(plan.customersToDelete.length)} se borran · ${cli.formatInt(plan.customersKept)} se conservan (usados en ventas reales)`,
    `Productos:    ${cli.formatInt(plan.productsToDelete.length)} se borran · ${cli.formatInt(plan.productsKept.length)} se conservan (usados en documentos reales)`,
  ].join('\n');
}

async function executeRemoval(plan) {
  const m = models();
  const { companyId } = plan;
  if (plan.stockFixes.length) {
    const ops = plan.stockFixes.map((fix) => ({
      updateOne: {
        filter: { companyId, warehouseId: fix.warehouseId, productId: fix.productId, quantity: { $gte: Math.max(fix.net, 0) } },
        update: { $inc: { quantity: -fix.net }, $set: { updatedAt: new Date() } },
      },
    }));
    const result = await m.StockLevel.bulkWrite(ops, { ordered: true });
    if (result.modifiedCount !== ops.length) {
      throw new Error('Las existencias cambiaron durante la limpieza; vuelve a ejecutar el script.');
    }
  }
  await m.InventoryMovement.deleteMany({ companyId, reason: MARK_RE });
  await m.SalesOrder.deleteMany({ companyId, notes: DEMO_MARK });
  if (plan.customersToDelete.length) {
    await m.Customer.deleteMany({ companyId, _id: { $in: plan.customersToDelete }, notes: MARK_RE });
  }
  if (plan.productsToDelete.length) {
    await m.StockLevel.deleteMany({ companyId, productId: { $in: plan.productsToDelete }, quantity: 0 });
    await m.Product.deleteMany({ companyId, _id: { $in: plan.productsToDelete }, description: MARK_RE });
  }
}

/** API para pruebas y CLI. */
async function removeDemoSales({ joinCode, dryRun = false, confirmFn = async () => true, log = () => {} }) {
  const plan = await planRemoval(joinCode);
  log(describeRemoval(plan));
  if (plan.conflicts.length) {
    throw new Error(
      `No se puede revertir: ${plan.conflicts.length} existencia(s) quedarían negativas porque hubo salidas reales ` +
        'que consumieron inventario demo. No se borró nada.'
    );
  }
  const nothing = !plan.orderCount && !plan.movementCount && !plan.customersToDelete.length && !plan.productsToDelete.length;
  if (dryRun || nothing) return { plan, executed: false };
  if (!(await confirmFn())) return { plan, executed: false };
  await executeRemoval(plan);
  return { plan, executed: true };
}

async function main() {
  const args = cli.parseArgs();
  cli.loadBackendEnv();
  /* eslint-disable no-console */
  console.log(`Base de datos: ${cli.describeMongoUri(process.env.MONGO_URI)}\n`);
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  try {
    const result = await removeDemoSales({
      joinCode: args.company,
      dryRun: Boolean(args['dry-run']),
      confirmFn: () => cli.confirm('\n¿Borrar estos datos demo? Escribe "si" para continuar: '),
      log: (line) => console.log(line),
    });
    if (args['dry-run']) console.log('\n(--dry-run: no se borró nada)');
    else if (!result.executed) console.log('\nNo se borró nada.');
    else console.log('\n✔ Datos demo eliminados.');
    return 0;
  } finally {
    await mongoose.disconnect();
  }
  /* eslint-enable no-console */
}

if (require.main === module) cli.runCli(main);

module.exports = { removeDemoSales, planRemoval, DEMO_MARK };
