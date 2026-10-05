'use strict';

const request = require('supertest');
const { describeIfDb, connectTestDb, closeTestDb, app } = require('../helpers/setup');
const { createTenant, createUser, login, auth } = require('../helpers/fixtures');
const Company = require('../../src/modules/companies/company.model');
const companyRepository = require('../../src/modules/companies/company.repository');
const User = require('../../src/modules/users/user.model');

describeIfDb('API /auth (integración)', () => {
  let tenant;
  let tenantB;
  let legacyTenant;
  let suspendedTenant;
  let admin;
  let joinedUser;
  let legacyAdmin;

  beforeAll(async () => {
    await connectTestDb();
    tenant = await createTenant({ name: 'Empresa Auth' });
    tenantB = await createTenant({ name: 'Empresa Auth Secundaria' });
    legacyTenant = await createTenant({ name: 'Empresa Auth Sin Código' });
    suspendedTenant = await createTenant({ name: 'Empresa Auth Suspendida' });
    await Company.collection.updateOne(
      { _id: legacyTenant.company._id },
      { $unset: { joinCode: '' } }
    );
    await companyRepository.updateById(suspendedTenant.company._id, { status: 'suspended' });
    admin = await createUser({
      company: tenant.company,
      role: tenant.roles.administrador,
      email: 'admin-auth@test.local',
      name: 'Admin',
      password: 'Clave1234',
    });
    await createUser({
      company: tenant.company,
      role: tenant.roles.ventas,
      email: 'lockme@test.local',
      password: 'Clave1234',
      name: 'Lock',
    });
    await createUser({
      company: tenant.company,
      role: tenant.roles.ventas,
      email: 'session@test.local',
      password: 'Clave1234',
      name: 'Session',
    });
    await createUser({
      company: tenant.company,
      role: tenant.roles.ventas,
      email: 'changepw@test.local',
      password: 'Clave1234',
      name: 'Change',
    });
    legacyAdmin = await createUser({
      company: legacyTenant.company,
      role: legacyTenant.roles.administrador,
      email: 'admin-legacy-code@test.local',
      password: 'Clave1234',
      name: 'Legacy Admin',
    });
  });

  afterAll(async () => {
    await closeTestDb();
  });

  test('login válido → tokens y usuario sin hash', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin-auth@test.local', password: 'Clave1234' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.email).toBe('admin-auth@test.local');
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.body.data.user.tokenVersion).toBe(0);
  });

  test('cada empresa tiene código y las empresas existentes lo generan al consultarlo', async () => {
    expect(tenant.company.joinCode).toMatch(/^FAI-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/);

    const token = await login('admin-legacy-code@test.local', 'Clave1234');
    const res = await request(app).get('/api/v1/companies/me/join-code').set(auth(token));

    expect(res.status).toBe(200);
    expect(res.body.data.joinCode).toMatch(/^FAI-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/);
    expect(res.body.data.joinCode.slice(4)).not.toMatch(/[0O1IL]/);
    expect(await Company.findById(legacyTenant.company._id).lean()).toHaveProperty(
      'joinCode',
      res.body.data.joinCode
    );
  });

  test('un administrador regenera el código y el anterior deja de servir', async () => {
    const token = await login('admin-auth@test.local', 'Clave1234');
    const originalCode = tenant.company.joinCode;
    const regenerated = await request(app)
      .post('/api/v1/companies/me/join-code/regenerate')
      .set(auth(token));

    expect(regenerated.status).toBe(200);
    expect(regenerated.body.data.joinCode).toMatch(/^FAI-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/);
    expect(regenerated.body.data.joinCode).not.toBe(originalCode);
    tenant.company.joinCode = regenerated.body.data.joinCode;

    const oldCode = await request(app).post('/api/v1/auth/register').send({
      name: 'Código anterior',
      companyCode: originalCode,
      email: 'old-company-code@test.local',
      password: 'Registro123',
    });
    expect(oldCode.status).toBe(400);
    expect(oldCode.body.error.message).toBe('El código de empresa no es válido.');
  });

  test('registro con código válido crea usuario pendiente sin rol ni tokens', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Nuevo',
      lastName: 'Integrante',
      companyCode: tenant.company.joinCode.toLowerCase(),
      email: 'nuevo-registro@test.local',
      password: 'Registro123',
    });

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({
      message: 'Cuenta creada. Un administrador debe aprobar tu acceso.',
    });

    joinedUser = await User.findOne({ email: 'nuevo-registro@test.local' }).lean();
    expect(String(joinedUser.companyId)).toBe(String(tenant.company._id));
    expect(joinedUser.status).toBe('pending');
    expect(joinedUser.roleId).toBeUndefined();
    expect(joinedUser.isPlatformAdmin).toBe(false);
  });

  test('código inexistente o empresa suspendida → 400 con mensaje uniforme', async () => {
    const invalid = await request(app).post('/api/v1/auth/register').send({
      name: 'Inválido',
      companyCode: 'FAI-OOOOOO',
      email: 'codigo-invalido@test.local',
      password: 'Registro123',
    });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.message).toBe('El código de empresa no es válido.');

    const suspended = await request(app).post('/api/v1/auth/register').send({
      name: 'Suspendido',
      companyCode: suspendedTenant.company.joinCode,
      email: 'empresa-suspendida@test.local',
      password: 'Registro123',
    });
    expect(suspended.status).toBe(400);
    expect(suspended.body.error.message).toBe('El código de empresa no es válido.');
  });

  test('registro con correo duplicado → 409', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Nuevo',
      companyCode: tenant.company.joinCode,
      email: 'admin-auth@test.local',
      password: 'Registro123',
    });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe('Ya existe una cuenta con este correo.');
  });

  test('registro con contraseña débil → error de validación', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Nuevo',
      companyCode: tenant.company.joinCode,
      email: 'debil@test.local',
      password: '12345678',
    });

    expect(res.status).toBe(422);
    expect(res.body.error.details.body[0].field).toBe('password');
  });

  test('registro deshabilitado → 403', async () => {
    const previousValue = process.env.ALLOW_PUBLIC_SIGNUP;
    process.env.ALLOW_PUBLIC_SIGNUP = 'false';
    try {
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Nuevo',
        companyCode: tenant.company.joinCode,
        email: 'cerrado@test.local',
        password: 'Registro123',
      });
      expect(res.status).toBe(403);
      expect(res.body.error.message).toBe('El registro público está deshabilitado.');
    } finally {
      if (previousValue === undefined) delete process.env.ALLOW_PUBLIC_SIGNUP;
      else process.env.ALLOW_PUBLIC_SIGNUP = previousValue;
    }
  });

  test('login pendiente → 403 sin incrementar intentos fallidos', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nuevo-registro@test.local', password: 'Registro123' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_PENDING');
    expect(res.body.error.message).toBe(
      'Tu cuenta está pendiente de aprobación por el administrador.'
    );
    const user = await User.findById(joinedUser._id).lean();
    expect(user.failedLoginAttempts).toBe(0);
  });

  test('el administrador lista y aprueba solicitudes; el usuario ya puede iniciar sesión', async () => {
    const token = await login('admin-auth@test.local', 'Clave1234');
    const pending = await request(app).get('/api/v1/users?status=pending').set(auth(token));
    expect(pending.status).toBe(200);
    expect(pending.body.data.map((user) => user.email)).toContain('nuevo-registro@test.local');

    const approved = await request(app)
      .patch(`/api/v1/users/${joinedUser._id}/approve`)
      .set(auth(token))
      .send({ roleId: tenant.roles.ventas._id });
    expect(approved.status).toBe(200);
    expect(approved.body.data.status).toBe('active');
    expect(String(approved.body.data.roleId)).toBe(String(tenant.roles.ventas._id));
    expect(String(approved.body.data.branchId)).toBe(String(tenant.branch._id));

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nuevo-registro@test.local', password: 'Registro123' });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.accessToken).toBeDefined();
  });

  test('el administrador puede rechazar y eliminar una solicitud pendiente', async () => {
    const registered = await request(app).post('/api/v1/auth/register').send({
      name: 'Rechazado',
      companyCode: tenant.company.joinCode,
      email: 'rechazado@test.local',
      password: 'Registro123',
    });
    expect(registered.status).toBe(201);
    const user = await User.findOne({ email: 'rechazado@test.local' }).lean();
    const token = await login('admin-auth@test.local', 'Clave1234');
    const rejected = await request(app)
      .post(`/api/v1/users/${user._id}/reject`)
      .set(auth(token));

    expect(rejected.status).toBe(200);
    expect(rejected.body.data.status).toBe('rejected');
    expect(await User.findById(user._id)).toBeNull();
  });

  test('un administrador no puede listar ni aprobar pendientes de otra empresa', async () => {
    const registered = await request(app).post('/api/v1/auth/register').send({
      name: 'Otra empresa',
      companyCode: tenantB.company.joinCode,
      email: 'otra-empresa-pendiente@test.local',
      password: 'Registro123',
    });
    expect(registered.status).toBe(201);
    const otherUser = await User.findOne({ email: 'otra-empresa-pendiente@test.local' }).lean();
    const token = await login('admin-auth@test.local', 'Clave1234');

    const approval = await request(app)
      .patch(`/api/v1/users/${otherUser._id}/approve`)
      .set(auth(token))
      .send({ roleId: tenant.roles.ventas._id });
    expect(approval.status).toBe(404);

    const pending = await request(app).get('/api/v1/users?status=pending').set(auth(token));
    expect(pending.status).toBe(200);
    expect(pending.body.data.map((user) => user.email)).not.toContain(
      'otra-empresa-pendiente@test.local'
    );
  });

  test('contraseña incorrecta → 401 con mensaje genérico (anti-enumeración)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin-auth@test.local', password: 'incorrecta1' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(res.body.error.message).toBe('Correo o contraseña incorrectos.');
  });

  test('email inexistente → EXACTAMENTE el mismo mensaje', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nadie-existe@test.local', password: 'incorrecta1' });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Correo o contraseña incorrectos.');
  });

  test('body inválido → 422 y campo faltante detallado', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'x@example.com' });
    expect(res.status).toBe(422);
    expect(res.body.error.message).toBe('Los datos enviados no son válidos.');
    expect(res.body.error.details.body[0].field).toBe('password');
  });

  test('campo desconocido en body → rechazado (strict)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin-auth@test.local', password: 'Clave1234', role: 'super_admin' });
    expect(res.status).toBe(422);
  });

  test('5 intentos fallidos bloquean la cuenta; ni la clave correcta entra', async () => {
    const email = 'lockme@test.local';

    for (let i = 1; i <= 4; i++) {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: 'incorrecta1' });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    }

    const fifth = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'incorrecta1' });
    expect(fifth.status).toBe(401);
    expect(fifth.body.error.code).toBe('ACCOUNT_LOCKED');

    const withReal = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'Clave1234' });
    expect(withReal.status).toBe(401);
    expect(withReal.body.error.code).toBe('ACCOUNT_LOCKED');
  });

  test('/auth/me devuelve usuario, rol y empresa', async () => {
    const token = await login('admin-auth@test.local', 'Clave1234');
    const res = await request(app).get('/api/v1/auth/me').set(auth(token));

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('admin-auth@test.local');
    expect(res.body.data.role.code).toBe('administrador');
    expect(res.body.data.role.permissions).toContain('users.create');
    expect(res.body.data.company.name).toBe('Empresa Auth');
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  test('/auth/me sin token → 401', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('refresh emite nuevos tokens; logout los invalida globalmente', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'session@test.local', password: 'Clave1234' });
    const { accessToken, refreshToken } = loginRes.body.data;

    const refreshed = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.accessToken).toBeDefined();
    expect(refreshed.body.data.refreshToken).toBeDefined();

    // El refresh consumido no puede volver a utilizarse.
    const replay = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
    expect(replay.status).toBe(401);
    expect(replay.body.error.code).toBe('SESSION_REVOKED');

    const logout = await request(app).post('/api/v1/auth/logout').set(auth(accessToken));
    expect(logout.status).toBe(200);
    expect(logout.body.data.loggedOut).toBe(true);

    // El refresh anterior queda invalidado (tokenVersion++).
    const refreshKo = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
    expect(refreshKo.status).toBe(401);
    expect(refreshKo.body.error.code).toBe('TOKEN_REVOKED');

    // El access anterior también.
    const meKo = await request(app).get('/api/v1/auth/me').set(auth(accessToken));
    expect(meKo.status).toBe(401);

    // Volver a entrar funciona.
    const again = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'session@test.local', password: 'Clave1234' });
    expect(again.status).toBe(200);
  });

  test('refresh token manipulado o de otro tipo → 401', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'changepw@test.local', password: 'Clave1234' });
    const { accessToken } = loginRes.body.data;

    const res = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: accessToken });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('REFRESH_INVALID');
  });

  test('cambio de contraseña: valida la actual y cierra las sesiones', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'changepw@test.local', password: 'Clave1234' });
    const { accessToken } = loginRes.body.data;

    // Contraseña actual incorrecta.
    const wrong = await request(app)
      .post('/api/v1/auth/change-password')
      .set(auth(accessToken))
      .send({ currentPassword: 'otra-cosa99', newPassword: 'NuevaClave1' });
    expect(wrong.status).toBe(401);
    expect(wrong.body.error.code).toBe('INVALID_PASSWORD');

    // Contraseña nueva débil → 422.
    const weak = await request(app)
      .post('/api/v1/auth/change-password')
      .set(auth(accessToken))
      .send({ currentPassword: 'Clave1234', newPassword: '12345678' });
    expect(weak.status).toBe(422);

    // Correcta.
    const okRes = await request(app)
      .post('/api/v1/auth/change-password')
      .set(auth(accessToken))
      .send({ currentPassword: 'Clave1234', newPassword: 'NuevaClave1' });
    expect(okRes.status).toBe(200);
    expect(okRes.body.data.mustRelogin).toBe(true);

    // La sesión anterior quedó invalidada.
    const meKo = await request(app).get('/api/v1/auth/me').set(auth(accessToken));
    expect(meKo.status).toBe(401);

    // Login con la clave vieja falla; con la nueva, funciona.
    const oldPw = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'changepw@test.local', password: 'Clave1234' });
    expect(oldPw.status).toBe(401);

    const newPw = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'changepw@test.local', password: 'NuevaClave1' });
    expect(newPw.status).toBe(200);
  });

  test('todo login (éxito y fallo) queda en la auditoría', async () => {
    const token = await login('admin-auth@test.local', 'Clave1234');
    const res = await request(app).get('/api/v1/audit?limit=100').set(auth(token));

    expect(res.status).toBe(200);
    const logins = res.body.data.filter((e) => e.module === 'auth' && e.action === 'LOGIN');
    expect(logins.length).toBeGreaterThan(0);
    expect(logins.some((e) => e.result === 'SUCCESS')).toBe(true);
    expect(logins.some((e) => e.result === 'FAILURE')).toBe(true);
    // Nunca se persisten contraseñas.
    for (const entry of logins) {
      expect(JSON.stringify(entry)).not.toContain('Clave1234');
      expect(JSON.stringify(entry)).not.toContain('incorrecta1');
    }
  });
});
