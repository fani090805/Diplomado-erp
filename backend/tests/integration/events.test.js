'use strict';

/**
 * Canal de cambios en vivo (SSE): boletos de un solo uso, filtrado por
 * empresa y por permisos, eventos de plataforma, efectos colaterales,
 * heartbeat y limpieza al desconectar.
 *
 * supertest espera el fin de la respuesta y un stream SSE no termina: aquí se
 * levanta el servidor en un puerto libre y se lee el stream con http.
 */

const http = require('http');
const request = require('supertest');
const { describeIfDb, connectTestDb, closeTestDb, app } = require('../helpers/setup');
const { createTenant, createUser, createPlatformSuperAdmin, login, auth } = require('../helpers/fixtures');
const bus = require('../../src/modules/events/event.bus');
const tickets = require('../../src/modules/events/event.tickets');
const eventsController = require('../../src/modules/events/events.controller');
const { actionFor, entityForPath } = require('../../src/modules/events/event.catalog');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describeIfDb('Canal en vivo /events (SSE)', () => {
  let server;
  let baseUrl;
  let tenantA;
  let tenantB;
  let adminA;
  let almacenA;
  let adminB;
  let superAdmin;
  const open = [];

  /** Abre el stream y acumula los eventos recibidos (y el texto crudo). */
  function connect(ticket) {
    return new Promise((resolve, reject) => {
      const req = http.get(`${baseUrl}/api/v1/events/stream?ticket=${ticket}`, (res) => {
        const conn = { status: res.statusCode, headers: res.headers, events: [], raw: '', close: () => req.destroy() };
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          conn.raw += chunk;
          for (const line of chunk.split('\n')) {
            if (line.startsWith('data: ')) conn.events.push(JSON.parse(line.slice(6)));
          }
        });
        open.push(conn);
        // La respuesta de error (401) sí termina: se espera su cuerpo.
        if (res.statusCode !== 200) res.on('end', () => resolve(conn));
        else setTimeout(() => resolve(conn), 50);
      });
      req.on('error', (err) => (err.code === 'ECONNRESET' ? undefined : reject(err)));
    });
  }

  async function ticketFor(token) {
    const res = await request(app).post('/api/v1/events/ticket').set(auth(token));
    expect(res.status).toBe(200);
    return res.body.data.ticket;
  }

  const stream = async (token) => connect(await ticketFor(token));

  beforeAll(async () => {
    await connectTestDb();
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    tenantA = await createTenant({ name: 'Eventos A' });
    tenantB = await createTenant({ name: 'Eventos B' });
    await createUser({ company: tenantA.company, branch: tenantA.branch, role: tenantA.roles.administrador, email: 'admin-ev-a@test.local' });
    await createUser({ company: tenantA.company, branch: tenantA.branch, role: tenantA.roles.almacen, email: 'almacen-ev-a@test.local' });
    await createUser({ company: tenantB.company, branch: tenantB.branch, role: tenantB.roles.administrador, email: 'admin-ev-b@test.local' });
    await createPlatformSuperAdmin('super-ev@test.local');
    adminA = await login('admin-ev-a@test.local', 'Clave1234');
    almacenA = await login('almacen-ev-a@test.local', 'Clave1234');
    adminB = await login('admin-ev-b@test.local', 'Clave1234');
    superAdmin = await login('super-ev@test.local', 'Clave1234');
  });

  afterEach(() => {
    while (open.length) open.pop().close();
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
    await closeTestDb();
  });

  test('pedir boleto exige sesión (401 sin token)', async () => {
    const res = await request(app).post('/api/v1/events/ticket');
    expect(res.status).toBe(401);
  });

  test('boleto inválido, reutilizado o vencido ⇒ 401', async () => {
    expect((await connect('no-existe')).status).toBe(401);

    const ticket = await ticketFor(adminA);
    const first = await connect(ticket);
    expect(first.status).toBe(200);
    expect(first.headers['content-type']).toMatch(/text\/event-stream/);
    expect((await connect(ticket)).status).toBe(401); // un solo uso

    const late = await ticketFor(adminA);
    tickets._tickets.get(late).expiresAt = Date.now() - 1;
    expect((await connect(late)).status).toBe(401);
  });

  test('sólo llegan eventos de la empresa del usuario, sin datos del documento', async () => {
    const a = await stream(adminA);
    const b = await stream(adminB);

    const created = await request(app).post('/api/v1/customers').set(auth(adminA)).send({ code: 'EV-1', name: 'Cliente en vivo' });
    expect(created.status).toBe(201);
    await wait(150);

    const event = a.events.find((e) => e.type === 'customer.created');
    expect(event).toBeTruthy();
    expect(Object.keys(event).sort()).toEqual(['action', 'at', 'entity', 'id', 'type']);
    expect(event).toMatchObject({ entity: 'customer', action: 'created', id: created.body.data._id });
    expect(b.events).toHaveLength(0);
  });

  test('actualizar y borrar emiten updated / deleted con el id', async () => {
    const a = await stream(adminA);
    const created = await request(app).post('/api/v1/suppliers').set(auth(adminA)).send({ code: 'EV-P1', name: 'Proveedor en vivo' });
    const id = created.body.data._id;
    await request(app).patch(`/api/v1/suppliers/${id}`).set(auth(adminA)).send({ name: 'Proveedor editado' });
    await request(app).delete(`/api/v1/suppliers/${id}`).set(auth(adminA));
    await wait(150);
    expect(a.events.filter((e) => e.entity === 'supplier').map((e) => [e.action, e.id])).toEqual([
      ['created', id],
      ['updated', id],
      ['deleted', id],
    ]);
  });

  test('una escritura fallida (422) no emite eventos', async () => {
    const a = await stream(adminA);
    const bad = await request(app).post('/api/v1/customers').set(auth(adminA)).send({ code: '' });
    expect(bad.status).toBeGreaterThanOrEqual(400);
    await wait(100);
    expect(a.events).toHaveLength(0);
  });

  test('permisos: sin sales.orders.read no llegan ventas; con inventory.read sí llega inventario', async () => {
    const admin = await stream(adminA);
    const almacen = await stream(almacenA);
    bus.publish({ companyId: tenantA.company._id, entity: 'sales-order', id: 'abc', action: 'approved' });
    await wait(100);

    expect(admin.events.map((e) => e.type)).toEqual(['sales-order.approved', 'inventory.updated', 'income.created']);
    // El rol almacén no ve ventas ni ingresos, pero sí el efecto en inventario.
    expect(almacen.events.map((e) => e.type)).toEqual(['inventory.updated']);
  });

  test('registro público de un usuario pendiente avisa al administrador de esa empresa', async () => {
    const a = await stream(adminA);
    const b = await stream(adminB);
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Pendiente',
      lastName: 'En Vivo',
      companyCode: tenantA.company.joinCode,
      email: 'pendiente-ev@test.local',
      password: 'Clave1234',
    });
    expect(res.status).toBeLessThan(300);
    await wait(150);
    expect(a.events.map((e) => e.type)).toContain('user.created');
    expect(b.events).toHaveLength(0);
  });

  test('eventos de plataforma (empresas) sólo para el Super Admin', async () => {
    const sa = await stream(superAdmin);
    const a = await stream(adminA);
    bus.publish({ entity: 'company', id: 'x1', action: 'created' });
    await wait(100);
    expect(sa.events.map((e) => e.type)).toEqual(['company.created']);
    expect(a.events).toHaveLength(0);
  });

  test('heartbeat periódico y limpieza de la suscripción al desconectar', async () => {
    const original = eventsController.settings.heartbeatMs;
    eventsController.settings.heartbeatMs = 40;
    try {
      // Las conexiones de pruebas anteriores se limpian de forma asíncrona.
      for (let i = 0; i < 20 && bus.listenerCount() > 0; i += 1) await wait(50);
      const before = bus.listenerCount();
      expect(before).toBe(0);
      const a = await stream(adminA);
      expect(bus.listenerCount()).toBe(before + 1);
      await wait(150);
      expect(a.raw).toMatch(/: ping \d+/);
      a.close();
      await wait(100);
      expect(bus.listenerCount()).toBe(before);
    } finally {
      eventsController.settings.heartbeatMs = original;
    }
  });

  test('catálogo: entidad por ruta y acción por método/sub-recurso', () => {
    expect(entityForPath('/sales-orders/abc/approve').entity).toBe('sales-order');
    expect(entityForPath('/finance/incomes').entity).toBe('income');
    expect(entityForPath('/platform/company-requests/1/approve').entity).toBe('company');
    expect(entityForPath('/reports/sales')).toBeNull();
    expect(actionFor('POST', '')).toBe('created');
    expect(actionFor('POST', '/abc/approve')).toBe('approved');
    expect(actionFor('POST', '/abc/reject')).toBe('rejected');
    expect(actionFor('POST', '/entries')).toBe('created');
    expect(actionFor('POST', '/abc/void')).toBe('updated');
    expect(actionFor('PATCH', '/abc')).toBe('updated');
    expect(actionFor('DELETE', '/abc')).toBe('deleted');
  });
});
