'use strict';

/**
 * Generador de ventas demo (src/scripts/seed-sales.js) y su limpieza
 * (src/scripts/remove-demo-sales.js) contra la BD de test en memoria.
 */

const mongoose = require('mongoose');
const { describeIfDb, connectTestDb, closeTestDb } = require('../helpers/setup');
const { createTenant, createUser } = require('../helpers/fixtures');
const { seedDemoSales, buildPlan, MIN_PRODUCTS, MIN_CUSTOMERS } = require('../../src/scripts/seed-sales');
const { removeDemoSales } = require('../../src/scripts/remove-demo-sales');
const { DEMO_MARK } = require('../../src/scripts/lib/demo-sales-data');
const Product = require('../../src/modules/products/product.model');
const Customer = require('../../src/modules/customers/customer.model');
const SalesOrder = require('../../src/modules/sales-orders/sales_order.model');
const InventoryMovement = require('../../src/modules/inventory/inventory_movement.model');
const StockLevel = require('../../src/modules/inventory/stock_level.model');
const Income = require('../../src/modules/incomes/income.model');

const COUNT = 200;
const RFC_RE = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;

describeIfDb('Script seed-sales / remove-demo-sales (integración)', () => {
  let tenantA;
  let tenantB;
  let realProduct;
  let realCustomer;
  let snapshotB;

  /** Conteos y existencias de una empresa para comprobar que no cambian. */
  async function snapshot(companyId) {
    const [products, customers, orders, movements, stock] = await Promise.all([
      Product.countDocuments({ companyId }),
      Customer.countDocuments({ companyId }),
      SalesOrder.countDocuments({ companyId }),
      InventoryMovement.countDocuments({ companyId }),
      StockLevel.find({ companyId }).sort({ productId: 1 }).select('productId quantity -_id').lean(),
    ]);
    return { products, customers, orders, movements, stock: JSON.stringify(stock) };
  }

  beforeAll(async () => {
    await connectTestDb();
    tenantA = await createTenant({ name: 'Empresa Seed A' });
    tenantB = await createTenant({ name: 'Empresa Seed B' });
    await createUser({ company: tenantA.company, branch: tenantA.branch, role: tenantA.roles.administrador, email: 'admin-seed-a@test.local' });
    await createUser({ company: tenantB.company, branch: tenantB.branch, role: tenantB.roles.administrador, email: 'admin-seed-b@test.local' });

    // Empresa A ya tiene un producto real con 50 piezas y un cliente real.
    realProduct = await Product.create({ companyId: tenantA.company._id, sku: 'REAL-1', name: 'Producto real', salePrice: 100, costPrice: 60 });
    await StockLevel.create({ companyId: tenantA.company._id, warehouseId: tenantA.warehouse._id, productId: realProduct._id, quantity: 50 });
    realCustomer = await Customer.create({ companyId: tenantA.company._id, code: 'REAL-C1', name: 'Cliente real' });

    // Empresa B: datos propios que nunca deben cambiar.
    const productB = await Product.create({ companyId: tenantB.company._id, sku: 'B-1', name: 'Producto B', salePrice: 10 });
    await StockLevel.create({ companyId: tenantB.company._id, warehouseId: tenantB.warehouse._id, productId: productB._id, quantity: 7 });
    await Customer.create({ companyId: tenantB.company._id, code: 'B-C1', name: 'Cliente B' });
    snapshotB = await snapshot(tenantB.company._id);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  test('código de empresa inexistente ⇒ error y nada escrito', async () => {
    await expect(seedDemoSales({ joinCode: 'FAI-ZZZZZZ', count: 10 })).rejects.toThrow('No existe ninguna empresa con el código FAI-ZZZZZZ.');
  });

  test('--dry-run sólo resume: no escribe nada', async () => {
    const before = await snapshot(tenantA.company._id);
    const lines = [];
    const result = await seedDemoSales({ joinCode: tenantA.company.joinCode, count: COUNT, seed: 7, dryRun: true, log: (l) => lines.push(l) });
    expect(result.executed).toBe(false);
    expect(lines.join('\n')).toContain('Ventas:             200 (APPROVED 170 · DRAFT 20 · REJECTED 10)');
    expect(await snapshot(tenantA.company._id)).toEqual(before);
  });

  test('sin confirmación ("si") no escribe nada', async () => {
    const before = await snapshot(tenantA.company._id);
    const result = await seedDemoSales({ joinCode: tenantA.company.joinCode, count: COUNT, seed: 7, confirmFn: async () => false });
    expect(result.executed).toBe(false);
    expect(await snapshot(tenantA.company._id)).toEqual(before);
  });

  describe('generación de 200 ventas', () => {
    let result;
    const companyId = () => tenantA.company._id;

    beforeAll(async () => {
      result = await seedDemoSales({ joinCode: tenantA.company.joinCode.toLowerCase(), count: COUNT, seed: 42 });
    });

    test('crea los catálogos que faltan (30 productos y 120 clientes) con datos válidos', async () => {
      expect(result.executed).toBe(true);
      const products = await Product.find({ companyId: companyId(), status: 'active' }).lean();
      expect(products.length).toBe(MIN_PRODUCTS);
      for (const p of products.filter((x) => x.description?.startsWith(DEMO_MARK))) {
        expect(p.salePrice).toBeGreaterThanOrEqual(25);
        expect(p.salePrice).toBeLessThanOrEqual(8500);
        expect(p.costPrice / p.salePrice).toBeGreaterThanOrEqual(0.549);
        expect(p.costPrice / p.salePrice).toBeLessThanOrEqual(0.751);
        expect(p.minStock).toBeGreaterThan(0);
      }
      const customers = await Customer.find({ companyId: companyId() }).lean();
      expect(customers.length).toBe(MIN_CUSTOMERS);
      for (const c of customers.filter((x) => x.notes?.startsWith(DEMO_MARK))) expect(c.taxId).toMatch(RFC_RE);
    });

    test('200 órdenes con estados 85/10/5, totales correctos y folios consecutivos', async () => {
      const orders = await SalesOrder.find({ companyId: companyId(), notes: DEMO_MARK }).sort({ code: 1 }).lean();
      expect(orders).toHaveLength(COUNT);
      const byStatus = (s) => orders.filter((o) => o.status === s);
      expect(byStatus('APPROVED')).toHaveLength(170);
      expect(byStatus('DRAFT')).toHaveLength(20);
      expect(byStatus('REJECTED')).toHaveLength(10);

      orders.forEach((order, i) => {
        expect(order.code).toBe(`SO-${String(i + 1).padStart(6, '0')}`);
        expect(order.lines.length).toBeGreaterThanOrEqual(1);
        expect(order.lines.length).toBeLessThanOrEqual(6);
        for (const line of order.lines) {
          expect(line.quantity).toBeGreaterThanOrEqual(1);
          expect(line.quantity).toBeLessThanOrEqual(20);
        }
        const total = Math.round(order.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0) * 100) / 100;
        expect(order.total).toBeCloseTo(total, 2);
        if (i > 0) expect(order.createdAt.getTime()).toBeGreaterThanOrEqual(orders[i - 1].createdAt.getTime());
      });
      byStatus('APPROVED').forEach((o) => expect(o.approvedBy).toBeTruthy());
      byStatus('REJECTED').forEach((o) => expect(o.rejectionReason).toBeTruthy());

      const now = Date.now();
      orders.forEach((o) => {
        expect(o.createdAt.getTime()).toBeLessThanOrEqual(now);
        expect(o.createdAt.getTime()).toBeGreaterThan(now - 367 * 24 * 3600 * 1000);
      });
    });

    test('las salidas coinciden con las líneas aprobadas y las existencias con el kardex', async () => {
      const approved = await SalesOrder.find({ companyId: companyId(), notes: DEMO_MARK, status: 'APPROVED' }).lean();
      const sold = new Map();
      approved.forEach((o) => o.lines.forEach((l) => sold.set(String(l.productId), (sold.get(String(l.productId)) || 0) + l.quantity)));

      const movements = await InventoryMovement.find({ companyId: companyId() }).sort({ createdAt: 1, _id: 1 }).lean();
      const exits = new Map();
      const net = new Map();
      for (const mv of movements) {
        if (mv.type === 'EXIT') exits.set(String(mv.productId), (exits.get(String(mv.productId)) || 0) + mv.quantity);
        net.set(String(mv.productId), (net.get(String(mv.productId)) || 0) + mv.delta);
        expect(mv.quantityAfter).toBe(mv.quantityBefore + mv.delta);
        expect(mv.quantityAfter).toBeGreaterThanOrEqual(0);
      }
      expect(Object.fromEntries(exits)).toEqual(Object.fromEntries(sold));

      const levels = await StockLevel.find({ companyId: companyId() }).lean();
      for (const level of levels) {
        const initial = String(level.productId) === String(realProduct._id) ? 50 : 0;
        expect(level.quantity).toBe(initial + (net.get(String(level.productId)) || 0));
        expect(level.quantity).toBeGreaterThanOrEqual(0);
      }
      expect(await Income.countDocuments({ companyId: companyId() })).toBe(0);
    });

    test('NO toca otras empresas', async () => {
      expect(await snapshot(tenantB.company._id)).toEqual(snapshotB);
    });

    test('limpieza: borra sólo lo demo y restaura las existencias reales', async () => {
      const removal = await removeDemoSales({ joinCode: tenantA.company.joinCode });
      expect(removal.executed).toBe(true);

      expect(await SalesOrder.countDocuments({ companyId: companyId() })).toBe(0);
      expect(await InventoryMovement.countDocuments({ companyId: companyId() })).toBe(0);
      expect(await Product.find({ companyId: companyId() }).distinct('sku')).toEqual(['REAL-1']);
      expect(await Customer.find({ companyId: companyId() }).distinct('code')).toEqual([realCustomer.code]);
      const levels = await StockLevel.find({ companyId: companyId() }).lean();
      expect(levels).toHaveLength(1);
      expect(levels[0].quantity).toBe(50);
      expect(await snapshot(tenantB.company._id)).toEqual(snapshotB);
    });
  });

  test('temporada: más ventas en nov-dic que en enero y más en días hábiles', () => {
    const ctx = {
      companyId: new mongoose.Types.ObjectId(),
      warehouse: { _id: new mongoose.Types.ObjectId() },
      admin: { _id: new mongoose.Types.ObjectId() },
      products: [],
      customers: [],
    };
    const plan = buildPlan(ctx, { count: 6000, seed: 99, now: new Date('2026-10-05T18:00:00Z') });
    const mx = (d) => new Date(d.getTime() - 6 * 3600 * 1000);
    const month = (m) => plan.orders.filter((o) => mx(o.createdAt).getUTCMonth() === m).length;
    expect(month(11)).toBeGreaterThan(month(0) * 2);
    expect(month(10)).toBeGreaterThan(month(0) * 1.5);
    const weekend = plan.orders.filter((o) => [0, 6].includes(mx(o.createdAt).getUTCDay())).length;
    expect(weekend / plan.orders.length).toBeLessThan(0.15);
  });
});
