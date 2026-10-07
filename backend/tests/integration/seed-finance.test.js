'use strict';

/**
 * Datos demo de compras y finanzas (src/scripts/seed-finance.js, también vía
 * seed-sales.js --with-finance) y su limpieza, contra la BD de test en memoria.
 */

const { describeIfDb, connectTestDb, closeTestDb } = require('../helpers/setup');
const { createTenant, createUser } = require('../helpers/fixtures');
const { seedDemoSales } = require('../../src/scripts/seed-sales');
const { seedDemoFinance, MIN_SUPPLIERS, PURCHASE_CATEGORY } = require('../../src/scripts/seed-finance');
const { removeDemoSales } = require('../../src/scripts/remove-demo-sales');
const { DEMO_MARK } = require('../../src/scripts/lib/demo-sales-data');
const { monthOf, OPEX_PLAN } = require('../../src/scripts/lib/demo-finance-data');
const Product = require('../../src/modules/products/product.model');
const Supplier = require('../../src/modules/suppliers/supplier.model');
const SalesOrder = require('../../src/modules/sales-orders/sales_order.model');
const PurchaseOrder = require('../../src/modules/purchase-orders/purchase_order.model');
const InventoryMovement = require('../../src/modules/inventory/inventory_movement.model');
const StockLevel = require('../../src/modules/inventory/stock_level.model');
const Income = require('../../src/modules/incomes/income.model');
const Expense = require('../../src/modules/expenses/expense.model');
const FinanceAccount = require('../../src/modules/accounts/account.model');

const round2 = (n) => Math.round(n * 100) / 100;

describeIfDb('Script seed-finance / --with-finance (integración)', () => {
  let tenantA;
  let tenantB;
  let realProduct;
  let realSupplier;
  let cashAccount;
  let snapshotB;
  // Fecha fija a mitad de mes: el resultado no depende del día en que corra la prueba.
  const now = new Date('2026-09-17T18:00:00Z');

  async function counts(companyId) {
    const [suppliers, purchases, incomes, expenses, movements, accounts] = await Promise.all([
      Supplier.countDocuments({ companyId }),
      PurchaseOrder.countDocuments({ companyId }),
      Income.countDocuments({ companyId }),
      Expense.countDocuments({ companyId }),
      InventoryMovement.countDocuments({ companyId }),
      FinanceAccount.find({ companyId }).sort({ code: 1 }).select('code balance -_id').lean(),
    ]);
    return { suppliers, purchases, incomes, expenses, movements, accounts: JSON.stringify(accounts) };
  }

  beforeAll(async () => {
    await connectTestDb();
    await Income.syncIndexes();
    tenantA = await createTenant({ name: 'Finanzas Demo A' });
    tenantB = await createTenant({ name: 'Finanzas Demo B' });
    await createUser({ company: tenantA.company, branch: tenantA.branch, role: tenantA.roles.administrador, email: 'admin-fin-a@test.local' });
    await createUser({ company: tenantB.company, branch: tenantB.branch, role: tenantB.roles.administrador, email: 'admin-fin-b@test.local' });

    // Datos reales de A que la generación y la limpieza deben respetar.
    const a = tenantA.company._id;
    realProduct = await Product.create({ companyId: a, sku: 'REAL-1', name: 'Producto real', salePrice: 100, costPrice: 60 });
    await StockLevel.create({ companyId: a, warehouseId: tenantA.warehouse._id, productId: realProduct._id, quantity: 50 });
    realSupplier = await Supplier.create({ companyId: a, code: 'REAL-P1', name: 'Proveedor real' });
    cashAccount = await FinanceAccount.create({ companyId: a, code: 'CAJA', name: 'Caja chica', currency: 'MXN', balance: 1000 });
    await Income.create({ companyId: a, code: 'INC-REAL', amount: 1000, category: 'Otros', accountId: cashAccount._id, description: 'Aportación', date: new Date('2026-09-02T18:00:00Z') });

    snapshotB = await counts(tenantB.company._id);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  test('sin ventas demo aprobadas ⇒ error claro y nada escrito', async () => {
    await expect(seedDemoFinance({ joinCode: tenantB.company.joinCode })).rejects.toThrow('no tiene ventas demo aprobadas');
    expect(await counts(tenantB.company._id)).toEqual(snapshotB);
  });

  describe('ventas + finanzas (--with-finance)', () => {
    let result;
    const companyId = () => tenantA.company._id;

    beforeAll(async () => {
      result = await seedDemoSales({ joinCode: tenantA.company.joinCode, count: 400, seed: 11, withFinance: true, now });
    });

    test('ejecuta ventas y finanzas en una sola corrida', () => {
      expect(result.executed).toBe(true);
      expect(result.finance.executed).toBe(true);
    });

    test(`completa ${MIN_SUPPLIERS} proveedores (conserva el real) marcados como demo`, async () => {
      const suppliers = await Supplier.find({ companyId: companyId() }).lean();
      expect(suppliers).toHaveLength(MIN_SUPPLIERS);
      expect(suppliers.filter((s) => s.notes === DEMO_MARK)).toHaveLength(MIN_SUPPLIERS - 1);
      expect(suppliers.map((s) => s.code)).toContain('REAL-P1');
    });

    test('~1,200 compras en el periodo de las ventas, 90 % aprobadas y costos ±5 % del costo del producto', async () => {
      const pos = await PurchaseOrder.find({ companyId: companyId() }).lean();
      expect(pos.length).toBeGreaterThan(1150);
      expect(pos.length).toBeLessThan(1260);
      const approved = pos.filter((p) => p.status === 'APPROVED');
      expect(approved.length / pos.length).toBeGreaterThan(0.88);
      expect(approved.length / pos.length).toBeLessThan(0.92);
      expect(pos.every((p) => p.notes === DEMO_MARK && p.createdAt <= now)).toBe(true);

      const cost = new Map((await Product.find({ companyId: companyId() }).lean()).map((p) => [String(p._id), p.costPrice]));
      for (const po of pos) {
        expect(po.total).toBeCloseTo(round2(po.lines.reduce((s, l) => s + l.quantity * l.unitCost, 0)), 2);
        for (const line of po.lines) {
          const base = cost.get(String(line.productId));
          expect(line.unitCost).toBeGreaterThanOrEqual(round2(base * 0.95) - 0.01);
          expect(line.unitCost).toBeLessThanOrEqual(round2(base * 1.05) + 0.01);
        }
      }
      const codes = pos.map((p) => p.code).sort();
      expect(codes[0]).toBe('PO-000001');
      expect(new Set(codes).size).toBe(pos.length);
    });

    test('cada compra aprobada genera sus ENTRADAS y las existencias cuadran con el kardex', async () => {
      const approved = await PurchaseOrder.find({ companyId: companyId(), status: 'APPROVED' }).lean();
      const entries = await InventoryMovement.find({ companyId: companyId(), type: 'ENTRY', reference: /^PO-/ }).lean();
      expect(entries).toHaveLength(approved.reduce((n, p) => n + p.lines.length, 0));

      const net = await InventoryMovement.aggregate([
        { $match: { companyId: companyId() } },
        { $group: { _id: '$productId', delta: { $sum: '$delta' } } },
      ]);
      const levels = new Map((await StockLevel.find({ companyId: companyId() }).lean()).map((l) => [String(l.productId), l.quantity]));
      for (const row of net) {
        const initial = String(row._id) === String(realProduct._id) ? 50 : 0;
        expect(levels.get(String(row._id))).toBe(initial + row.delta);
      }
    });

    test('un ingreso por cada venta demo aprobada, con los campos de recordSale', async () => {
      const sales = await SalesOrder.find({ companyId: companyId(), status: 'APPROVED' }).lean();
      const incomes = await Income.find({ companyId: companyId(), category: 'Ventas' }).lean();
      expect(incomes).toHaveLength(sales.length);
      const bySale = new Map(incomes.map((i) => [String(i.salesOrderId), i]));
      for (const sale of sales) {
        const income = bySale.get(String(sale._id));
        expect(income).toMatchObject({ amount: sale.total, reference: sale.code, status: 'POSTED', description: `Venta ${sale.code} · ${DEMO_MARK}` });
        expect(String(income.customerId)).toBe(String(sale.customerId));
        expect(income.date.toISOString()).toBe(sale.createdAt.toISOString());
      }
    });

    test('gastos: un pago por compra aprobada + operativos; margen neto mensual de 8–20 %', async () => {
      const approved = await PurchaseOrder.countDocuments({ companyId: companyId(), status: 'APPROVED' });
      expect(await Expense.countDocuments({ companyId: companyId(), category: PURCHASE_CATEGORY })).toBe(approved);
      const categories = await Expense.distinct('category', { companyId: companyId() });
      expect(categories.sort()).toEqual([PURCHASE_CATEGORY, ...OPEX_PLAN.map((o) => o.category)].sort());

      const [incomes, expenses] = await Promise.all([
        Income.find({ companyId: companyId(), status: 'POSTED' }).lean(),
        Expense.find({ companyId: companyId(), status: 'POSTED' }).lean(),
      ]);
      expect(expenses.every((e) => e.date <= now && e.amount > 0)).toBe(true);
      const byMonth = new Map();
      for (const i of incomes) byMonth.set(monthOf(i.date), { inc: (byMonth.get(monthOf(i.date))?.inc || 0) + i.amount, exp: byMonth.get(monthOf(i.date))?.exp || 0 });
      for (const e of expenses) byMonth.set(monthOf(e.date), { inc: byMonth.get(monthOf(e.date))?.inc || 0, exp: (byMonth.get(monthOf(e.date))?.exp || 0) + e.amount });
      for (const [month, { inc, exp }] of byMonth) {
        const margin = (inc - exp) / inc;
        expect([month, margin >= 0.079 && margin <= 0.201]).toEqual([month, true]);
      }
    });

    test('saldo: VENTAS = ingresos − gastos demo; la caja real no cambia', async () => {
      const ventas = await FinanceAccount.findOne({ companyId: companyId(), code: 'VENTAS' }).lean();
      const inc = await Income.aggregate([{ $match: { companyId: companyId(), accountId: ventas._id } }, { $group: { _id: null, t: { $sum: '$amount' } } }]);
      const exp = await Expense.aggregate([{ $match: { companyId: companyId(), accountId: ventas._id } }, { $group: { _id: null, t: { $sum: '$amount' } } }]);
      expect(ventas.balance).toBeCloseTo(inc[0].t - exp[0].t, 2);
      expect(ventas.balance).toBeGreaterThan(0);
      expect((await FinanceAccount.findById(cashAccount._id).lean()).balance).toBe(1000);
    });

    test('re-ejecutar no duplica ingresos, compras ni gastos operativos', async () => {
      const before = await counts(companyId());
      const lines = [];
      const again = await seedDemoFinance({ joinCode: tenantA.company.joinCode, seed: 5, log: (l) => lines.push(l), now });
      expect(again.executed).toBe(true);
      expect(again.result).toMatchObject({ incomes: 0, expenses: 0, purchases: 0, net: 0 });
      expect(lines.join('\n')).toContain('ya existen compras demo');
      expect(await counts(companyId())).toEqual(before);
    });

    test('--dry-run no escribe nada', async () => {
      const before = await counts(companyId());
      await seedDemoFinance({ joinCode: tenantA.company.joinCode, dryRun: true, now });
      expect(await counts(companyId())).toEqual(before);
    });

    test('NO toca otras empresas', async () => {
      expect(await counts(tenantB.company._id)).toEqual(snapshotB);
    });

    test('limpieza: borra compras, proveedores, ingresos y gastos demo y restaura saldos y existencias', async () => {
      const removal = await removeDemoSales({ joinCode: tenantA.company.joinCode });
      expect(removal.executed).toBe(true);

      expect(await PurchaseOrder.countDocuments({ companyId: companyId() })).toBe(0);
      expect(await SalesOrder.countDocuments({ companyId: companyId() })).toBe(0);
      expect(await Expense.countDocuments({ companyId: companyId() })).toBe(0);
      expect(await Income.find({ companyId: companyId() }).distinct('code')).toEqual(['INC-REAL']);
      expect(await Supplier.find({ companyId: companyId() }).distinct('code')).toEqual([realSupplier.code]);
      expect((await FinanceAccount.findOne({ companyId: companyId(), code: 'VENTAS' }).lean()).balance).toBeCloseTo(0, 2);
      expect((await FinanceAccount.findById(cashAccount._id).lean()).balance).toBe(1000);
      const levels = await StockLevel.find({ companyId: companyId() }).lean();
      expect(levels).toHaveLength(1);
      expect(levels[0].quantity).toBe(50);
      expect(await counts(tenantB.company._id)).toEqual(snapshotB);
    });
  });
});
