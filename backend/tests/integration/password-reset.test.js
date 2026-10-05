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
const emailService = require('../../src/services/email.service');

const FORGOT_MESSAGE = 'Si el correo está registrado, te enviamos instrucciones.';
const INVALID_LINK = 'El enlace no es válido o ya venció.';

/** Espera a que terminen los envíos fire-and-forget. */
const flush = () => new Promise((resolve) => setImmediate(resolve));

/** Sondea hasta que un mock reciba llamadas (envíos con consultas previas a BD). */
async function waitForCall(mockFn, timeoutMs = 3000) {
  const start = Date.now();
  while (mockFn.mock.calls.length === 0 && Date.now() - start < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

async function requestResetToken(email) {
  emailService.sendPasswordResetEmail.mockClear();
  const res = await request(app).post('/api/v1/auth/forgot-password').send({ email });
  expect(res.status).toBe(200);
  await flush();
  const [[{ resetUrl }]] = emailService.sendPasswordResetEmail.mock.calls;
  return new URL(resetUrl, 'http://localhost').searchParams.get('reset');
}

describeIfDb('API /auth recuperación de contraseña (integración)', () => {
  let tenant;

  beforeAll(async () => {
    await connectTestDb();
    tenant = await createTenant({ name: 'Empresa Reset' });
    await createUser({
      company: tenant.company,
      role: tenant.roles.administrador,
      email: 'admin-reset@test.local',
      name: 'Admin',
    });
    await createUser({
      company: tenant.company,
      role: tenant.roles.ventas,
      email: 'reset@test.local',
      name: 'Reset',
    });
    await createUser({
      company: tenant.company,
      role: tenant.roles.ventas,
      email: 'expired@test.local',
      name: 'Expired',
    });
    await createUser({
      company: tenant.company,
      role: tenant.roles.ventas,
      email: 'locked@test.local',
      name: 'Locked',
    });
    await User.updateOne(
      { email: 'locked@test.local' },
      { $set: { status: 'locked', failedLoginAttempts: 5 } }
    );
    const pending = await createUser({
      company: tenant.company,
      role: tenant.roles.ventas,
      email: 'pending-reset@test.local',
      name: 'Pending',
    });
    await User.updateOne({ _id: pending._id }, { $set: { status: 'pending' } });
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('forgot con correo existente → 200, guarda solo el hash y envía el correo', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'Reset@Test.local' });

    expect(res.status).toBe(200);
    expect(res.body.data.message).toBe(FORGOT_MESSAGE);
    await flush();
    expect(emailService.sendPasswordResetEmail).toHaveBeenCalledTimes(1);

    const { resetUrl } = emailService.sendPasswordResetEmail.mock.calls[0][0];
    const token = new URL(resetUrl, 'http://localhost').searchParams.get('reset');
    expect(token).toMatch(/^[a-f0-9]{64}$/);

    const stored = await User.findOne({ email: 'reset@test.local' })
      .select('+resetPasswordTokenHash +resetPasswordExpiresAt')
      .lean();
    expect(stored.resetPasswordTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(stored.resetPasswordTokenHash).not.toBe(token);
    const ttl = stored.resetPasswordExpiresAt.getTime() - Date.now();
    expect(ttl).toBeGreaterThan(29 * 60 * 1000);
    expect(ttl).toBeLessThanOrEqual(30 * 60 * 1000);
  });

  test('forgot con correo inexistente → 200 con el mismo mensaje y sin correo', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'nadie@test.local' });

    expect(res.status).toBe(200);
    expect(res.body.data.message).toBe(FORGOT_MESSAGE);
    await flush();
    expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  test('forgot con usuario pending → 200 y no se envía nada', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'pending-reset@test.local' });

    expect(res.status).toBe(200);
    expect(res.body.data.message).toBe(FORGOT_MESSAGE);
    await flush();
    expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  test('forgot con correo mal formado → 422 en español', async () => {
    const res = await request(app).post('/api/v1/auth/forgot-password').send({ email: 'no-es-correo' });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(JSON.stringify(res.body)).toContain('Correo electrónico inválido.');
  });

  test('reset con token válido cambia la contraseña, cierra sesiones y permite iniciar sesión', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'reset@test.local', password: 'Clave1234' });
    expect(loginRes.status).toBe(200);
    const oldSession = loginRes.body.data;
    const token = await requestResetToken('reset@test.local');

    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token, password: 'NuevaClave99' });

    expect(res.status).toBe(200);
    await flush();
    expect(emailService.sendPasswordChangedEmail).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'reset@test.local' })
    );

    const stored = await User.findOne({ email: 'reset@test.local' })
      .select('+resetPasswordTokenHash +resetPasswordExpiresAt')
      .lean();
    expect(stored.resetPasswordTokenHash).toBeNull();
    expect(stored.resetPasswordExpiresAt).toBeNull();

    const oldPassword = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'reset@test.local', password: 'Clave1234' });
    expect(oldPassword.status).toBe(401);
    await User.updateOne({ email: 'reset@test.local' }, { $set: { failedLoginAttempts: 0 } });

    const newAccessToken = await login('reset@test.local', 'NuevaClave99');
    expect(newAccessToken).toBeDefined();

    const me = await request(app).get('/api/v1/auth/me').set(auth(oldSession.accessToken));
    expect(me.status).toBe(401);
    const refresh = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: oldSession.refreshToken });
    expect(refresh.status).toBe(401);
  });

  test('el token no se puede usar dos veces', async () => {
    const token = await requestResetToken('reset@test.local');
    const first = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token, password: 'OtraClave123' });
    expect(first.status).toBe(200);

    const second = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token, password: 'OtraClave456' });
    expect(second.status).toBe(400);
    expect(second.body.error.message).toBe(INVALID_LINK);

    await login('reset@test.local', 'OtraClave123');
  });

  test('token vencido → 400', async () => {
    const token = await requestResetToken('expired@test.local');
    await User.updateOne(
      { email: 'expired@test.local' },
      { $set: { resetPasswordExpiresAt: new Date(Date.now() - 1000) } }
    );

    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token, password: 'NuevaClave99' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe(INVALID_LINK);
    await login('expired@test.local', 'Clave1234');
  });

  test('token inválido → 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: 'a'.repeat(64), password: 'NuevaClave99' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe(INVALID_LINK);
  });

  test('contraseña débil → rechazada sin consumir el token', async () => {
    const token = await requestResetToken('expired@test.local');

    const weak = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token, password: 'corta' });
    expect(weak.status).toBeGreaterThanOrEqual(400);
    expect(weak.status).toBeLessThan(500);

    const ok = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token, password: 'ClaveFuerte77' });
    expect(ok.status).toBe(200);
  });

  test('reset desbloquea a un usuario locked', async () => {
    const token = await requestResetToken('locked@test.local');
    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token, password: 'Desbloqueo88' });
    expect(res.status).toBe(200);

    const stored = await User.findOne({ email: 'locked@test.local' }).lean();
    expect(stored.status).toBe('active');
    expect(stored.failedLoginAttempts).toBe(0);
    await login('locked@test.local', 'Desbloqueo88');
  });

  test('registro envía acuse al usuario y aviso a administradores con users.update', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Nueva',
      lastName: 'Persona',
      email: 'nueva-reset@test.local',
      password: 'Clave1234',
      companyCode: tenant.company.joinCode,
    });
    expect(res.status).toBe(201);
    await waitForCall(emailService.sendNewPendingUserToAdmins);

    expect(emailService.sendRegistrationReceived).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'nueva-reset@test.local', companyName: 'Empresa Reset' })
    );
    expect(emailService.sendNewPendingUserToAdmins).toHaveBeenCalledTimes(1);
    const { admins } = emailService.sendNewPendingUserToAdmins.mock.calls[0][0];
    const adminEmails = admins.map((admin) => admin.email);
    expect(adminEmails).toContain('admin-reset@test.local');
    expect(adminEmails).not.toContain('reset@test.local');
  });

  test('aprobar un usuario pendiente envía el correo de bienvenida con el rol', async () => {
    const adminToken = await login('admin-reset@test.local', 'Clave1234');
    const pending = await User.findOne({ email: 'nueva-reset@test.local' }).lean();

    const res = await request(app)
      .patch(`/api/v1/users/${pending._id}/approve`)
      .set(auth(adminToken))
      .send({ roleId: String(tenant.roles.ventas._id) });
    expect(res.status).toBe(200);
    await waitForCall(emailService.sendWelcomeEmail);

    expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'nueva-reset@test.local',
        companyName: 'Empresa Reset',
        roleName: tenant.roles.ventas.label,
      })
    );
  });
});
