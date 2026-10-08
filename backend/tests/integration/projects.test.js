'use strict';

/**
 * Obras (/projects) y centros de costo (/cost-centers).
 *
 * Cubre: alta, lista paginada, detalle, edición, código duplicado (409),
 * aislamiento multiempresa (IDs ajenos ⇒ 404, listas separadas) y que un
 * centro de costo no pueda colgarse de una obra de otra empresa.
 */

const request = require('supertest');
const { describeIfDb, connectTestDb, closeTestDb, app } = require('../helpers/setup');
const { createTenant, createUser, login, auth } = require('../helpers/fixtures');

describeIfDb('API /projects y /cost-centers (integración)', () => {
  let tokenA;
  let tokenB;
  let projectId;
  let projectBId;

  beforeAll(async () => {
    await connectTestDb();
    const tenantA = await createTenant({ name: 'Obras A' });
    const tenantB = await createTenant({ name: 'Obras B' });
    await createUser({
      company: tenantA.company, branch: tenantA.branch, role: tenantA.roles.administrador, email: 'admin@obras-a.local',
    });
    await createUser({
      company: tenantB.company, branch: tenantB.branch, role: tenantB.roles.administrador, email: 'admin@obras-b.local',
    });
    tokenA = await login('admin@obras-a.local', 'Clave1234');
    tokenB = await login('admin@obras-b.local', 'Clave1234');
  });

  afterAll(async () => {
    await closeTestDb();
  });

  test('crea una obra y la lista con paginación correcta', async () => {
    const created = await request(app)
      .post('/api/v1/projects')
      .set(auth(tokenA))
      .send({ code: 'obr-1', name: 'Obra Centro', budget: 1000 });
    expect(created.status).toBe(201);
    expect(created.body.data.code).toBe('OBR-1');
    projectId = created.body.data._id;

    const list = await request(app).get('/api/v1/projects?search=centro').set(auth(tokenA));
    expect(list.status).toBe(200);
    expect(list.body.data.map((p) => p._id)).toEqual([projectId]);
    expect(list.body.meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
  });

  test('código duplicado ⇒ 409; búsqueda con caracteres especiales no rompe', async () => {
    const dup = await request(app).post('/api/v1/projects').set(auth(tokenA)).send({ code: 'OBR-1', name: 'Otra' });
    expect(dup.status).toBe(409);
    const odd = await request(app).get('/api/v1/projects?search=(%5B').set(auth(tokenA));
    expect(odd.status).toBe(200);
    expect(odd.body.data).toEqual([]);
  });

  test('detalle y edición de la obra propia', async () => {
    const detail = await request(app).get(`/api/v1/projects/${projectId}`).set(auth(tokenA));
    expect(detail.status).toBe(200);
    const updated = await request(app)
      .patch(`/api/v1/projects/${projectId}`)
      .set(auth(tokenA))
      .send({ status: 'EN_PROCESO' });
    expect(updated.status).toBe(200);
    expect(updated.body.data.status).toBe('EN_PROCESO');
  });

  test('multiempresa: la obra de A no existe para B', async () => {
    expect((await request(app).get(`/api/v1/projects/${projectId}`).set(auth(tokenB))).status).toBe(404);
    expect((await request(app).patch(`/api/v1/projects/${projectId}`).set(auth(tokenB)).send({ name: 'Ajena' })).status)
      .toBe(404);
    const listB = await request(app).get('/api/v1/projects').set(auth(tokenB));
    expect(listB.body.data).toEqual([]);

    const own = await request(app).post('/api/v1/projects').set(auth(tokenB)).send({ code: 'OBR-1', name: 'Obra B' });
    expect(own.status).toBe(201);
    projectBId = own.body.data._id;
  });

  test('centros de costo: alta en obra propia, filtro por obra y obra ajena ⇒ 404', async () => {
    const cc = await request(app)
      .post('/api/v1/cost-centers')
      .set(auth(tokenA))
      .send({ projectId, code: 'cc-1', name: 'Materiales', budget: 500 });
    expect(cc.status).toBe(201);
    expect(cc.body.data.code).toBe('CC-1');

    const list = await request(app).get(`/api/v1/cost-centers?projectId=${projectId}`).set(auth(tokenA));
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.meta.total).toBe(1);

    const foreign = await request(app)
      .post('/api/v1/cost-centers')
      .set(auth(tokenA))
      .send({ projectId: projectBId, code: 'CC-2', name: 'Ajeno' });
    expect(foreign.status).toBe(404);

    const ccB = await request(app).get(`/api/v1/cost-centers/${cc.body.data._id}`).set(auth(tokenB));
    expect(ccB.status).toBe(404);
  });
});
