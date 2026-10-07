'use strict';

/**
 * Listas de pedidos de venta y órdenes de compra:
 *  - Cada documento trae el nombre de su cliente/proveedor (customerName /
 *    supplierName) aunque la empresa tenga más de 100 clientes.
 *  - Orden: fecha de creación descendente y, en empate, folio descendente.
 *  - Una referencia de otra empresa nunca muestra su nombre.
 */

const mongoose = require('mongoose');
const request = require('supertest');
const { describeIfDb, connectTestDb, closeTestDb, app } = require('../helpers/setup');
const { createTenant, createUser, login, auth } = require('../helpers/fixtures');
const SalesOrder = require('../../src/modules/sales-orders/sales_order.model');
const PurchaseOrder = require('../../src/modules/purchase-orders/purchase_order.model');
const Customer = require('../../src/modules/customers/customer.model');
const Supplier = require('../../src/modules/suppliers/supplier.model');

describeIfDb('Listas de ventas y compras: nombres y orden (integración)', () => {
  let tenant;
  let other;
  let token;
  let customers;
  let suppliers;
  let foreignCustomer;
  const SAME = new Date('2026-10-06T15:25:26.376Z'); // varias órdenes con la misma fecha exacta

  const doc = (Model, code, ref, refField, createdAt) => ({
    companyId: tenant.company._id,
    code,
    [refField]: ref,
    warehouseId: tenant.warehouse._id,
    status: 'APPROVED',
    lines: [{ productId: new mongoose.Types.ObjectId(), quantity: 1, [Model === SalesOrder ? 'unitPrice' : 'unitCost']: 10 }],
    total: 10,
    createdAt,
    updatedAt: createdAt,
  });

  beforeAll(async () => {
    await connectTestDb();
    tenant = await createTenant({ name: 'Nombres y Orden' });
    other = await createTenant({ name: 'Nombres Otra' });
    await createUser({ company: tenant.company, branch: tenant.branch, role: tenant.roles.administrador, email: 'admin-names@test.local' });
    token = await login('admin-names@test.local', 'Clave1234');

    // 120 clientes (más de una página de 100) y 15 proveedores.
    customers = await Customer.insertMany(
      Array.from({ length: 120 }, (_, i) => ({ companyId: tenant.company._id, code: `C-${String(i).padStart(3, '0')}`, name: `Cliente ${i}` }))
    );
    suppliers = await Supplier.insertMany(
      Array.from({ length: 15 }, (_, i) => ({ companyId: tenant.company._id, code: `P-${i}`, name: `Proveedor ${i}` }))
    );
    foreignCustomer = await Customer.create({ companyId: other.company._id, code: 'AJENO', name: 'Cliente de otra empresa' });

    await SalesOrder.collection.insertMany([
      doc(SalesOrder, 'SO-009992', customers[119]._id, 'customerId', new Date(SAME.getTime() - 3 * 60000)),
      doc(SalesOrder, 'SO-009994', customers[50]._id, 'customerId', SAME),
      doc(SalesOrder, 'SO-009996', customers[110]._id, 'customerId', SAME),
      doc(SalesOrder, 'SO-009995', customers[105]._id, 'customerId', SAME),
      doc(SalesOrder, 'SO-009997', foreignCustomer._id, 'customerId', new Date(SAME.getTime() + 60000)),
    ]);
    await PurchaseOrder.collection.insertMany([
      doc(PurchaseOrder, 'PO-000010', suppliers[3]._id, 'supplierId', SAME),
      doc(PurchaseOrder, 'PO-000012', suppliers[14]._id, 'supplierId', SAME),
      doc(PurchaseOrder, 'PO-000011', suppliers[7]._id, 'supplierId', SAME),
    ]);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  const get = (path) => request(app).get(path).set(auth(token));

  test('ventas: nombre de cliente aunque esté después del cliente 100', async () => {
    const res = await get('/api/v1/sales-orders?limit=20');
    expect(res.status).toBe(200);
    const byCode = Object.fromEntries(res.body.data.map((o) => [o.code, o.customerName]));
    expect(byCode['SO-009996']).toBe('Cliente 110');
    expect(byCode['SO-009992']).toBe('Cliente 119');
    expect(byCode['SO-009995']).toBe('Cliente 105');
    expect(byCode['SO-009994']).toBe('Cliente 50');
    // El id del cliente se conserva (lo usan editar y filtros).
    expect(res.body.data.every((o) => typeof o.customerId === 'string')).toBe(true);
  });

  test('ventas: fecha descendente y, en empate, folio descendente', async () => {
    const res = await get('/api/v1/sales-orders?limit=20');
    expect(res.body.data.map((o) => o.code)).toEqual(['SO-009997', 'SO-009996', 'SO-009995', 'SO-009994', 'SO-009992']);
    // Estable entre páginas: la página 2 de tamaño 2 continúa sin repetir ni saltar.
    const p1 = await get('/api/v1/sales-orders?limit=2&page=1');
    const p2 = await get('/api/v1/sales-orders?limit=2&page=2');
    expect([...p1.body.data, ...p2.body.data].map((o) => o.code)).toEqual(['SO-009997', 'SO-009996', 'SO-009995', 'SO-009994']);
  });

  test('ventas: un cliente de otra empresa nunca muestra su nombre', async () => {
    const res = await get('/api/v1/sales-orders?limit=20');
    const foreign = res.body.data.find((o) => o.code === 'SO-009997');
    expect(foreign.customerName).toBeNull();
  });

  test('ventas: el detalle por id también trae el nombre', async () => {
    const order = await SalesOrder.findOne({ companyId: tenant.company._id, code: 'SO-009996' }).lean();
    const res = await get(`/api/v1/sales-orders/${order._id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.customerName).toBe('Cliente 110');
  });

  test('compras: nombre del proveedor y orden por folio en empates', async () => {
    const res = await get('/api/v1/purchase-orders?limit=20');
    expect(res.status).toBe(200);
    expect(res.body.data.map((o) => [o.code, o.supplierName])).toEqual([
      ['PO-000012', 'Proveedor 14'],
      ['PO-000011', 'Proveedor 7'],
      ['PO-000010', 'Proveedor 3'],
    ]);
    const one = await get(`/api/v1/purchase-orders/${res.body.data[0]._id}`);
    expect(one.body.data.supplierName).toBe('Proveedor 14');
  });

  test('un orden explícito (sortBy) se respeta', async () => {
    const res = await get('/api/v1/sales-orders?limit=20&sortBy=code&sortDir=asc');
    expect(res.body.data.map((o) => o.code)[0]).toBe('SO-009992');
  });
});
