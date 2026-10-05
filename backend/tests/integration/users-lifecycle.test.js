'use strict';

jest.mock('../../src/services/email.service', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
  sendRegistrationReceived: jest.fn().mockResolvedValue({ success: true }),
  sendNewPendingUserToAdmins: jest.fn().mockResolvedValue({ success: true }),
  sendWelcomeEmail: jest.fn().mockResolvedValue({ success: true }),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ success: true }),
  sendPasswordChangedEmail: jest.fn().mockResolvedValue({ success: true }),
  sendLoginNotification: jest.fn().mockResolvedValue({ success: true }),
}));

const request = require('supertest');
const { describeIfDb, connectTestDb, closeTestDb, app } = require('../helpers/setup');
const { createTenant, createUser, login, auth } = require('../helpers/fixtures');
const User = require('../../src/modules/users/user.model');
const roleRepository = require('../../src/modules/roles/role.repository');

const HAS_RECORDS =
  'Este usuario tiene registros en el sistema. Se conserva como inactivo para mantener el historial.';
const LAST_ADMIN = 'No es posible desactivar al último administrador activo de la empresa.';

describeIfDb('API /users ciclo de vida: desactivar, reactivar y eliminar (integración)', () => {
  let tenantA;
  let tenantB;
  let adminA;
  let adminToken;
  let userB;

  async function createInTenantA(email, extra = {}) {
    return createUser({
      company: tenantA.company,
      role: tenantA.roles.ventas,
      email,
      name: 'Usuario',
      ...extra,
    });
  }

  beforeAll(async () => {
    await connectTestDb();
    tenantA = await createTenant({ name: 'Empresa Ciclo A' });
    tenantB = await createTenant({ name: 'Empresa Ciclo B' });
    adminA = await createUser({
      company: tenantA.company,
      role: tenantA.roles.administrador,
      email: 'admin-ciclo-a@test.local',
      name: 'Admin',
    });
    userB = await createUser({
      company: tenantB.company,
      role: tenantB.roles.ventas,
      email: 'usuario-ciclo-b@test.local',
      name: 'Ajeno',
    });
    adminToken = await login('admin-ciclo-a@test.local', 'Clave1234');
  });

  afterAll(async () => {
    await closeTestDb();
  });

  test('desactivar → inactive, cierra sesiones y no puede iniciar sesión', async () => {
    const user = await createInTenantA('desactivar@test.local');
    const userToken = await login('desactivar@test.local', 'Clave1234');

    const res = await request(app)
      .patch(`/api/v1/users/${user._id}/deactivate`)
      .set(auth(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('inactive');
    const me = await request(app).get('/api/v1/auth/me').set(auth(userToken));
    expect(me.status).toBe(401);
    const relogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'desactivar@test.local', password: 'Clave1234' });
    expect(relogin.status).not.toBe(200);
  });

  test('listado: sin filtro solo active/locked; ?status=inactive lista los inactivos', async () => {
    const inactive = await createInTenantA('lista-inactivo@test.local');
    await User.updateOne({ _id: inactive._id }, { $set: { status: 'inactive' } });
    const locked = await createInTenantA('lista-bloqueado@test.local');
    await User.updateOne({ _id: locked._id }, { $set: { status: 'locked' } });
    const pending = await createInTenantA('lista-pendiente@test.local');
    await User.updateOne({ _id: pending._id }, { $set: { status: 'pending' } });

    const all = await request(app).get('/api/v1/users?limit=100').set(auth(adminToken));
    expect(all.status).toBe(200);
    const statuses = new Set(all.body.data.map((u) => u.status));
    expect([...statuses].every((s) => s === 'active' || s === 'locked')).toBe(true);
    const emails = all.body.data.map((u) => u.email);
    expect(emails).toContain('lista-bloqueado@test.local');
    expect(emails).not.toContain('lista-inactivo@test.local');
    expect(emails).not.toContain('lista-pendiente@test.local');

    const inactives = await request(app)
      .get('/api/v1/users?status=inactive&limit=100')
      .set(auth(adminToken));
    expect(inactives.status).toBe(200);
    expect(inactives.body.data.every((u) => u.status === 'inactive')).toBe(true);
    expect(inactives.body.data.map((u) => u.email)).toContain('lista-inactivo@test.local');
    expect(inactives.body.data.map((u) => u.email)).not.toContain('usuario-ciclo-b@test.local');
  });

  test('reactivar → active, reinicia intentos fallidos y vuelve a iniciar sesión', async () => {
    const user = await createInTenantA('reactivar@test.local');
    await User.updateOne(
      { _id: user._id },
      { $set: { status: 'inactive', failedLoginAttempts: 3 } }
    );

    const res = await request(app)
      .patch(`/api/v1/users/${user._id}/reactivate`)
      .set(auth(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('active');
    const stored = await User.findById(user._id).lean();
    expect(stored.failedLoginAttempts).toBe(0);
    await login('reactivar@test.local', 'Clave1234');
  });

  test('reactivar un usuario que no está inactivo → 400', async () => {
    const user = await createInTenantA('reactivar-activo@test.local');
    const res = await request(app)
      .patch(`/api/v1/users/${user._id}/reactivate`)
      .set(auth(adminToken));
    expect(res.status).toBe(400);
  });

  test('borrado permanente de un inactivo sin registros → 200 y desaparece', async () => {
    const user = await createInTenantA('sin-registros@test.local');
    const deactivated = await request(app)
      .patch(`/api/v1/users/${user._id}/deactivate`)
      .set(auth(adminToken));
    expect(deactivated.status).toBe(200);

    const res = await request(app)
      .delete(`/api/v1/users/${user._id}/permanent`)
      .set(auth(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.data.deleted).toBe(true);
    expect(await User.findById(user._id).lean()).toBeNull();
  });

  test('borrado permanente de un inactivo con registros → 409 y se conserva', async () => {
    const user = await createInTenantA('con-registros@test.local');
    // Su inicio de sesión queda en la auditoría como actor.
    await login('con-registros@test.local', 'Clave1234');
    await request(app).patch(`/api/v1/users/${user._id}/deactivate`).set(auth(adminToken));

    const res = await request(app)
      .delete(`/api/v1/users/${user._id}/permanent`)
      .set(auth(adminToken));

    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe(HAS_RECORDS);
    const stored = await User.findById(user._id).lean();
    expect(stored.status).toBe('inactive');
  });

  test('borrado permanente con registros como autor en otra colección → 409', async () => {
    const user = await createInTenantA('autor-lead@test.local');
    await User.updateOne({ _id: user._id }, { $set: { status: 'inactive' } });
    const Lead = require('../../src/modules/crm/lead.model');
    // Inserción directa: solo importa que la colección referencie al usuario como autor.
    await Lead.collection.insertOne({
      companyId: tenantA.company._id,
      name: 'Prospecto histórico',
      createdBy: user._id,
    });

    const res = await request(app)
      .delete(`/api/v1/users/${user._id}/permanent`)
      .set(auth(adminToken));

    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe(HAS_RECORDS);
  });

  test('borrado permanente de un usuario activo → 400', async () => {
    const user = await createInTenantA('permanente-activo@test.local');
    const res = await request(app)
      .delete(`/api/v1/users/${user._id}/permanent`)
      .set(auth(adminToken));
    expect(res.status).toBe(400);
    expect(await User.findById(user._id).lean()).not.toBeNull();
  });

  test('no puede desactivarse a sí mismo → 400 (también por DELETE legado)', async () => {
    const res = await request(app)
      .patch(`/api/v1/users/${adminA._id}/deactivate`)
      .set(auth(adminToken));
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('propia cuenta');

    const legacy = await request(app).delete(`/api/v1/users/${adminA._id}`).set(auth(adminToken));
    expect(legacy.status).toBe(400);
  });

  test('no se puede desactivar al último administrador activo → 400', async () => {
    const managerRole = await roleRepository.create({
      companyId: tenantA.company._id,
      code: 'gestor_usuarios',
      label: 'Gestor de usuarios',
      permissions: ['users.read', 'users.update'],
      status: 'active',
    });
    await createUser({
      company: tenantA.company,
      role: managerRole,
      email: 'gestor@test.local',
      name: 'Gestor',
    });
    const managerToken = await login('gestor@test.local', 'Clave1234');

    const res = await request(app)
      .patch(`/api/v1/users/${adminA._id}/deactivate`)
      .set(auth(managerToken));

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe(LAST_ADMIN);
    const stored = await User.findById(adminA._id).lean();
    expect(stored.status).toBe('active');
  });

  test('DELETE /users/:id (legado) desactiva igual que deactivate', async () => {
    const user = await createInTenantA('legado@test.local');
    const res = await request(app).delete(`/api/v1/users/${user._id}`).set(auth(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('inactive');
    expect(await User.findById(user._id).lean()).not.toBeNull();
  });

  test('no actúa sobre usuarios de otra empresa → 404 en las tres acciones', async () => {
    const deactivate = await request(app)
      .patch(`/api/v1/users/${userB._id}/deactivate`)
      .set(auth(adminToken));
    expect(deactivate.status).toBe(404);

    await User.updateOne({ _id: userB._id }, { $set: { status: 'inactive' } });
    const reactivate = await request(app)
      .patch(`/api/v1/users/${userB._id}/reactivate`)
      .set(auth(adminToken));
    expect(reactivate.status).toBe(404);

    const permanent = await request(app)
      .delete(`/api/v1/users/${userB._id}/permanent`)
      .set(auth(adminToken));
    expect(permanent.status).toBe(404);

    const stored = await User.findById(userB._id).lean();
    expect(stored).not.toBeNull();
    expect(stored.status).toBe('inactive');
  });

  test('las acciones quedan en la auditoría', async () => {
    const AuditLog = require('../../src/modules/audit/audit.model');
    const user = await createInTenantA('auditado@test.local');
    await request(app).patch(`/api/v1/users/${user._id}/deactivate`).set(auth(adminToken));
    await request(app).patch(`/api/v1/users/${user._id}/reactivate`).set(auth(adminToken));

    let logs = [];
    for (let i = 0; i < 50 && logs.length < 2; i += 1) {
      logs = await AuditLog.find({ resourceId: String(user._id), module: 'users' }).lean();
      if (logs.length < 2) await new Promise((resolve) => setTimeout(resolve, 20));
    }
    expect(logs.length).toBeGreaterThanOrEqual(2);
    expect(logs.every((log) => String(log.userId) === String(adminA._id))).toBe(true);
  });
});
