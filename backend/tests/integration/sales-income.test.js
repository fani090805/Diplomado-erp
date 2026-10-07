'use strict';

/**
 * Venta aprobada → ingreso (cuenta VENTAS, categoría "Ventas").
 *
 * Al aprobar un pedido de venta se registra un ingreso por el total con el
 * folio, la fecha de la venta y el cliente; nunca dos ingresos vigentes para
 * la misma venta, y si la aprobación falla no queda ingreso.
 */

const request = require('supertest');
const { describeIfDb, connectTestDb, closeTestDb, app } = require('../helpers/setup');
const { createTenant, createUser, login, auth } = require('../helpers/fixtures');
const Income = require('../../src/modules/incomes/income.model');
const FinanceAccount = require('../../src/modules/accounts/account.model');
const SalesOrder = require('../../src/modules/sales-orders/sales_order.model');
const incomeService = require('../../src/modules/incomes/income.service');

describeIfDb('Venta aprobada genera su ingreso (integración)', () => {
  let tenant;
  let other;
  let token;
  let otherToken;
  let productId;
  let customerId;

  beforeAll(async () => {
    await connectTestDb();
    await Income.syncIndexes(); // el índice único debe existir antes de las carreras
    tenant = await createTenant({ name: 'Ingresos por Venta' });
    other = await createTenant({ name: 'Ingresos Otra' });
    await createUser({ company: tenant.company, branch: tenant.branch, role: tenant.roles.administrador, email: 'admin-si@test.local' });
    await createUser({ company: other.company, branch: other.branch, role: other.roles.administrador, email: 'admin-si-b@test.local' });
    token = await login('admin-si@test.local', 'Clave1234');
    otherToken = await login('admin-si-b@test.local', 'Clave1234');

    const product = await request(app).post('/api/v1/products').set(auth(token)).send({ sku: 'SI-1', name: 'Silla', unit: 'pza' });
    productId = product.body.data._id;
    const customer = await request(app).post('/api/v1/customers').set(auth(token)).send({ code: 'C-SI', name: 'Cliente Ingreso' });
    customerId = customer.body.data._id;
    const entry = await request(app)
      .post('/api/v1/inventory/entries')
      .set(auth(token))
      .send({ productId, warehouseId: String(tenant.warehouse._id), quantity: 100, reason: 'Inicial' });
    expect(entry.status).toBe(201);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  const createOrder = async (lines = [{ productId, quantity: 2, unitPrice: 150.25 }]) => {
    const res = await request(app).post('/api/v1/sales-orders').set(auth(token)).send({ customerId, lines });
    expect(res.status).toBe(201);
    return res.body.data;
  };
  const approve = (id, t = token) => request(app).post(`/api/v1/sales-orders/${id}/approve`).set(auth(t)).send({});
  const incomesOf = (orderId) => Income.find({ companyId: tenant.company._id, salesOrderId: orderId }).lean();

  test('aprobar crea el ingreso: total, folio, fecha de la venta, cliente, categoría Ventas y cuenta VENTAS', async () => {
    const order = await createOrder();
    const res = await approve(order._id);
    expect(res.status).toBe(200);

    const [income] = await incomesOf(order._id);
    expect(income).toMatchObject({
      amount: 300.5,
      category: 'Ventas',
      reference: order.code,
      description: `Venta ${order.code}`,
      status: 'POSTED',
      method: 'transfer',
    });
    expect(String(income.customerId)).toBe(customerId);
    expect(new Date(income.date).toISOString()).toBe(new Date(order.createdAt).toISOString());

    const account = await FinanceAccount.findById(income.accountId).lean();
    expect(account).toMatchObject({ code: 'VENTAS', currency: 'MXN', status: 'active', balance: 300.5 });
    expect(String(account.companyId)).toBe(String(tenant.company._id));

    // Visible en el módulo de ingresos como cualquier otro.
    const list = await request(app).get('/api/v1/finance/incomes').set(auth(token));
    expect(list.body.data.map((i) => i.reference)).toContain(order.code);
  });

  test('la segunda venta reutiliza la cuenta VENTAS y suma su saldo', async () => {
    const order = await createOrder([{ productId, quantity: 1, unitPrice: 99.5 }]);
    expect((await approve(order._id)).status).toBe(200);
    const accounts = await FinanceAccount.find({ companyId: tenant.company._id, code: 'VENTAS' }).lean();
    expect(accounts).toHaveLength(1);
    expect(accounts[0].balance).toBe(400);
  });

  test('sin duplicados: reaprobar ⇒ 409 y recordSale repetido devuelve el mismo ingreso', async () => {
    const order = await createOrder();
    expect((await approve(order._id)).status).toBe(200);
    expect((await approve(order._id)).status).toBe(409);

    const stored = await SalesOrder.findById(order._id).lean();
    const again = await incomeService.recordSale(stored, String(tenant.company._id), null);
    const incomes = await incomesOf(order._id);
    expect(incomes).toHaveLength(1);
    expect(String(again._id)).toBe(String(incomes[0]._id));
  });

  test('dos aprobaciones simultáneas: un solo ingreso y el stock se descuenta una vez', async () => {
    const order = await createOrder([{ productId, quantity: 3, unitPrice: 10 }]);
    const stockBefore = (await request(app).get('/api/v1/inventory/stock').set(auth(token))).body.data
      .find((s) => String(s.productId._id || s.productId) === productId).quantity;

    const results = await Promise.all([approve(order._id), approve(order._id)]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);

    expect(await incomesOf(order._id)).toHaveLength(1);
    const stockAfter = (await request(app).get('/api/v1/inventory/stock').set(auth(token))).body.data
      .find((s) => String(s.productId._id || s.productId) === productId).quantity;
    expect(stockAfter).toBe(stockBefore - 3);
  });

  test('si la aprobación falla por stock insuficiente no se crea ingreso', async () => {
    const order = await createOrder([{ productId, quantity: 100000, unitPrice: 1 }]);
    expect((await approve(order._id)).status).toBe(409);
    expect(await incomesOf(order._id)).toHaveLength(0);
    expect((await SalesOrder.findById(order._id).lean()).status).toBe('DRAFT');
  });

  test('cuenta VENTAS inactiva ⇒ 409 claro, la venta sigue en borrador y se repone el stock', async () => {
    await FinanceAccount.updateOne({ companyId: tenant.company._id, code: 'VENTAS' }, { $set: { status: 'inactive' } });
    try {
      const order = await createOrder([{ productId, quantity: 1, unitPrice: 5 }]);
      const stockBefore = (await request(app).get('/api/v1/inventory/stock').set(auth(token))).body.data
        .find((s) => String(s.productId._id || s.productId) === productId).quantity;
      const res = await approve(order._id);
      expect(res.status).toBe(409);
      expect(res.body.error.message).toContain('La cuenta VENTAS está inactiva');
      expect((await SalesOrder.findById(order._id).lean()).status).toBe('DRAFT');
      expect(await incomesOf(order._id)).toHaveLength(0);
      const stockAfter = (await request(app).get('/api/v1/inventory/stock').set(auth(token))).body.data
        .find((s) => String(s.productId._id || s.productId) === productId).quantity;
      expect(stockAfter).toBe(stockBefore);
    } finally {
      await FinanceAccount.updateOne({ companyId: tenant.company._id, code: 'VENTAS' }, { $set: { status: 'active' } });
    }
  });

  test('voidSale anula el ingreso, revierte el saldo y permite registrar uno nuevo', async () => {
    const order = await createOrder([{ productId, quantity: 1, unitPrice: 50 }]);
    expect((await approve(order._id)).status).toBe(200);
    const companyId = String(tenant.company._id);
    const before = (await FinanceAccount.findOne({ companyId, code: 'VENTAS' }).lean()).balance;

    const voided = await incomeService.voidSale(order._id, 'Venta cancelada', companyId, null);
    expect(voided.status).toBe('VOID');
    expect((await FinanceAccount.findOne({ companyId, code: 'VENTAS' }).lean()).balance).toBe(before - 50);
    expect(await incomeService.voidSale(order._id, 'otra vez', companyId, null)).toBeNull();

    // Anulado el anterior, la venta puede volver a tener un ingreso vigente (índice parcial).
    const stored = await SalesOrder.findById(order._id).lean();
    await incomeService.recordSale(stored, companyId, null);
    const incomes = await incomesOf(order._id);
    expect(incomes.map((i) => i.status).sort()).toEqual(['POSTED', 'VOID']);
  });

  test('el body HTTP no puede ligar un ingreso manual a una venta', async () => {
    const account = await FinanceAccount.findOne({ companyId: tenant.company._id, code: 'VENTAS' }).lean();
    const order = await SalesOrder.findOne({ companyId: tenant.company._id }).lean();
    const res = await request(app)
      .post('/api/v1/finance/incomes')
      .set(auth(token))
      .send({ amount: 10, category: 'Otros', accountId: String(account._id), salesOrderId: String(order._id) });
    expect(res.status).toBe(400); // campo desconocido en un body .strict()
    expect(await Income.countDocuments({ companyId: tenant.company._id, category: 'Otros' })).toBe(0);
  });

  test('aislamiento: los ingresos y la cuenta VENTAS son de cada empresa', async () => {
    const otherIncomes = await request(app).get('/api/v1/finance/incomes').set(auth(otherToken));
    expect(otherIncomes.status).toBe(200);
    expect(otherIncomes.body.data).toHaveLength(0);
    expect(await FinanceAccount.countDocuments({ companyId: other.company._id })).toBe(0);
  });
});
