'use strict';

/** GET /api/v1/meta: configuración compartida web/Android. */

const request = require('supertest');
const { describeIfDb, connectTestDb, closeTestDb, app } = require('../helpers/setup');
const { createTenant, createUser, login, auth } = require('../helpers/fixtures');

describeIfDb('API /meta (integración)', () => {
  let token;

  beforeAll(async () => {
    await connectTestDb();
    const tenant = await createTenant({ name: 'Meta' });
    await createUser({ company: tenant.company, branch: tenant.branch, role: tenant.roles.ventas, email: 'ventas-meta@test.local' });
    token = await login('ventas-meta@test.local', 'Clave1234');
  });

  afterAll(async () => {
    await closeTestDb();
  });

  test('sin sesión ⇒ 401', async () => {
    expect((await request(app).get('/api/v1/meta')).status).toBe(401);
  });

  test('estados con etiqueta y tono, módulos en orden, moneda y versión mínima de Android', async () => {
    const res = await request(app).get('/api/v1/meta').set(auth(token));
    expect(res.status).toBe(200);
    const meta = res.body.data;

    expect(meta.currency).toBe('MXN');
    expect(meta.locale).toBe('es-MX');
    expect(Number.isInteger(meta.minAndroidVersionCode)).toBe(true);

    expect(meta.statuses['sales-order']).toEqual([
      { code: 'DRAFT', label: 'Borrador', tone: 'neutral' },
      { code: 'APPROVED', label: 'Aprobado', tone: 'positive' },
      { code: 'REJECTED', label: 'Rechazado', tone: 'negative' },
    ]);
    const tones = new Set(Object.values(meta.statuses).flat().map((st) => st.tone));
    expect([...tones].every((t) => ['positive', 'neutral', 'pending', 'negative'].includes(t))).toBe(true);

    expect(meta.modules[1]).toMatchObject({ id: 'dashboard', name: 'Dashboard', shortName: 'Inicio', icon: 'dashboard', permission: null });
    expect(meta.modules.find((m) => m.id === 'sales-orders')).toMatchObject({ permission: 'sales.orders.read', section: 'PRINCIPAL' });
    expect(meta.modules.find((m) => m.id === 'companies')).toMatchObject({ platformOnly: true });
    expect(new Set(meta.modules.map((m) => m.id)).size).toBe(meta.modules.length);
  });
});
