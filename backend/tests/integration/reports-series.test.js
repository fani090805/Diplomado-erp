'use strict';

/**
 * Serie de ventas/compras agrupada (GET /reports/sales?groupBy=day|week|month).
 *
 * Las órdenes se insertan directo en la colección para fijar `createdAt`
 * (los timestamps de Mongoose lo sobrescribirían). México está en UTC-6 todo
 * el año, así que las fechas límite son deterministas:
 *  - 2026-10-05T05:30Z = domingo 4 oct 23:30 (MX) → semana 2026-W40
 *  - 2026-10-05T07:00Z = lunes 5 oct 01:00 (MX)   → semana 2026-W41
 *  - 2027-01-01T18:00Z = viernes 1 ene 2027 (MX)  → semana ISO 2026-W53
 *  - 2026-11-01T04:00Z = sábado 31 oct 22:00 (MX) → mes 2026-10
 */

const request = require('supertest');
const { describeIfDb, connectTestDb, closeTestDb, app } = require('../helpers/setup');
const { createTenant, createUser, login, auth } = require('../helpers/fixtures');
const SalesOrder = require('../../src/modules/sales-orders/sales_order.model');
const PurchaseOrder = require('../../src/modules/purchase-orders/purchase_order.model');

describeIfDb('API /reports/sales y /reports/purchases con groupBy (integración)', () => {
  let tenantA;
  let tenantB;
  let tokenA;

  let seq = 0;
  const order = (companyId, createdAt, total, status = 'APPROVED') => ({
    companyId,
    code: `SER-${(seq += 1)}`,
    status,
    total,
    createdAt: new Date(createdAt),
    updatedAt: new Date(createdAt),
  });

  beforeAll(async () => {
    await connectTestDb();
    tenantA = await createTenant({ name: 'Series A' });
    tenantB = await createTenant({ name: 'Series B' });
    await createUser({
      company: tenantA.company,
      branch: tenantA.branch,
      role: tenantA.roles.administrador,
      email: 'admin-series-a@test.local',
    });
    tokenA = await login('admin-series-a@test.local', 'Clave1234');

    const a = tenantA.company._id;
    await SalesOrder.collection.insertMany([
      order(a, '2026-10-05T03:00:00Z', 100), // dom 4 oct 21:00 MX
      order(a, '2026-10-05T05:30:00Z', 50), // dom 4 oct 23:30 MX
      order(a, '2026-10-05T07:00:00Z', 200), // lun 5 oct 01:00 MX
      order(a, '2026-10-06T16:00:00Z', 25.5), // mar 6 oct
      order(a, '2026-11-01T04:00:00Z', 10), // sáb 31 oct 22:00 MX
      order(a, '2027-01-01T18:00:00Z', 70), // vie 1 ene 2027 → 2026-W53
      order(a, '2026-10-05T18:00:00Z', 999, 'DRAFT'), // no aprobada: excluida
      order(tenantB.company._id, '2026-10-05T18:00:00Z', 5000), // otra empresa: excluida
    ]);
    await PurchaseOrder.collection.insertMany([
      order(a, '2026-10-05T05:30:00Z', 40), // W40
      order(a, '2026-10-05T07:00:00Z', 60), // W41
    ]);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  const get = (path) => request(app).get(path).set(auth(tokenA));

  test('groupBy=day agrupa por día en hora de México', async () => {
    const res = await get('/api/v1/reports/sales?groupBy=day&from=2026-10-01&to=2026-10-31T23:59:59Z');
    expect(res.status).toBe(200);
    expect(res.body.data.groupBy).toBe('day');
    const byPeriod = Object.fromEntries(res.body.data.series.map((r) => [r.period, r]));
    expect(byPeriod['2026-10-04']).toMatchObject({ count: 2, total: 150 });
    expect(byPeriod['2026-10-05']).toMatchObject({ count: 1, total: 200 });
    expect(byPeriod['2026-10-06']).toMatchObject({ count: 1, total: 25.5 });
  });

  test('groupBy=week usa semanas ISO (lunes) en hora de México', async () => {
    const res = await get('/api/v1/reports/sales?groupBy=week&from=2026-09-01&to=2026-10-31T23:59:59Z');
    expect(res.status).toBe(200);
    const series = res.body.data.series;
    expect(series.map((r) => r.period)).toEqual(['2026-W40', '2026-W41']);
    expect(series[0]).toMatchObject({ count: 2, total: 150 });
    expect(series[1]).toMatchObject({ count: 2, total: 225.5 });
    // Inicio de la semana W41: lunes 5 oct 00:00 en México = 06:00 UTC.
    expect(series[1].start).toBe('2026-10-05T06:00:00.000Z');
  });

  test('la semana ISO que cruza el año se etiqueta con el año ISO (2026-W53)', async () => {
    const res = await get('/api/v1/reports/sales?groupBy=week&from=2026-12-20&to=2027-01-10');
    expect(res.status).toBe(200);
    expect(res.body.data.series).toEqual([
      expect.objectContaining({ period: '2026-W53', count: 1, total: 70 }),
    ]);
  });

  test('groupBy=month usa la zona de México (31 oct 22:00 MX cuenta en octubre)', async () => {
    const res = await get('/api/v1/reports/sales?groupBy=month&from=2026-10-01&to=2026-11-30');
    expect(res.status).toBe(200);
    const byPeriod = Object.fromEntries(res.body.data.series.map((r) => [r.period, r]));
    expect(byPeriod['2026-10']).toMatchObject({ count: 5, total: 385.5 });
    expect(byPeriod['2026-11']).toBeUndefined();
  });

  test('sin groupBy: serie mensual por defecto y byMonth se conserva', async () => {
    const res = await get('/api/v1/reports/sales');
    expect(res.status).toBe(200);
    expect(res.body.data.groupBy).toBe('month');
    expect(Array.isArray(res.body.data.byMonth)).toBe(true);
    expect(res.body.data.series.length).toBeGreaterThanOrEqual(2);
  });

  test('excluye órdenes no aprobadas y las de otra empresa', async () => {
    const res = await get('/api/v1/reports/sales?groupBy=day&from=2026-10-05&to=2026-10-05T23:59:59Z');
    expect(res.status).toBe(200);
    const totals = res.body.data.series.map((r) => r.total);
    expect(totals).not.toContain(999);
    expect(totals).not.toContain(5000);
  });

  test('`to` con hora incluye las ventas de ese mismo día; sólo fecha corta a medianoche UTC', async () => {
    const withTime = await get('/api/v1/reports/sales?groupBy=day&from=2026-10-06&to=2026-10-06T23:59:59.999Z');
    expect(withTime.body.data.series.map((r) => r.period)).toEqual(['2026-10-06']);

    const dateOnly = await get('/api/v1/reports/sales?groupBy=day&from=2026-10-06&to=2026-10-06');
    expect(dateOnly.body.data.series).toEqual([]);
  });

  test('compras también acepta groupBy=week', async () => {
    const res = await get('/api/v1/reports/purchases?groupBy=week&from=2026-09-01&to=2026-10-31T23:59:59Z');
    expect(res.status).toBe(200);
    expect(res.body.data.series.map((r) => [r.period, r.total])).toEqual([
      ['2026-W40', 40],
      ['2026-W41', 60],
    ]);
  });

  test('groupBy inválido ⇒ 422 con mensaje en español', async () => {
    const res = await get('/api/v1/reports/sales?groupBy=year');
    expect(res.status).toBe(422);
    expect(res.body.error.details.query[0].message).toBe('groupBy debe ser day, week o month.');
  });
});
