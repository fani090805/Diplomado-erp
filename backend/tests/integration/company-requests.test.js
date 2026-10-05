'use strict';

jest.mock('../../src/services/email.service', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
  sendRegistrationReceived: jest.fn().mockResolvedValue({ success: true }),
  sendNewPendingUserToAdmins: jest.fn().mockResolvedValue({ success: true }),
  sendWelcomeEmail: jest.fn().mockResolvedValue({ success: true }),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ success: true }),
  sendPasswordChangedEmail: jest.fn().mockResolvedValue({ success: true }),
  sendLoginNotification: jest.fn().mockResolvedValue({ success: true }),
  sendCompanyRequestReceived: jest.fn().mockResolvedValue({ success: true }),
  sendNewCompanyRequestToPlatform: jest.fn().mockResolvedValue({ success: true }),
  sendCompanyApproved: jest.fn().mockResolvedValue({ success: true }),
  sendCompanyRejected: jest.fn().mockResolvedValue({ success: true }),
}));

const request = require('supertest');
const emailService = require('../../src/services/email.service');
const { describeIfDb, connectTestDb, closeTestDb, app } = require('../helpers/setup');
const {
  createTenant,
  createUser,
  createPlatformSuperAdmin,
  login,
  auth,
} = require('../helpers/fixtures');
const Company = require('../../src/modules/companies/company.model');
const Role = require('../../src/modules/roles/role.model');
const Branch = require('../../src/modules/branches/branch.model');
const User = require('../../src/modules/users/user.model');
const CompanyRequest = require('../../src/modules/company-requests/company_request.model');
const userRepository = require('../../src/modules/users/user.repository');

const PASSWORD = 'Clave1234';
const IN_REVIEW = 'Tu empresa está en revisión. Te avisaremos por correo cuando esté lista.';
const INVALID_CREDENTIALS = 'Correo o contraseña incorrectos.';
const SUSPENDED = 'Tu empresa está suspendida. Contacta al soporte.';

function companyPayload(overrides = {}) {
  return {
    companyName: 'Ferretería Nueva',
    legalName: 'Ferretería Nueva SA de CV',
    taxId: 'FNU010101AB1',
    industry: 'comercio',
    phone: '5512345678',
    city: 'Puebla',
    name: 'Laura',
    lastName: 'Méndez',
    email: 'laura@ferreteria.test',
    password: PASSWORD,
    ...overrides,
  };
}

function submitRequest(body) {
  return request(app).post('/api/v1/auth/register-company').send(body);
}

/** Las notificaciones son fire-and-forget: se reintenta hasta que se despachen. */
async function waitFor(assertion, { timeoutMs = 3000, intervalMs = 25 } = {}) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      assertion();
      return;
    } catch (error) {
      if (Date.now() > deadline) throw error;
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
}

describeIfDb('Solicitudes de alta de empresa y panel de plataforma (integración)', () => {
  let superToken;
  let tenant;
  let companyAdminToken;
  let regularUserToken;

  beforeAll(async () => {
    await connectTestDb();
    await createPlatformSuperAdmin('root@plataforma.test');
    superToken = await login('root@plataforma.test', PASSWORD);

    tenant = await createTenant({ name: 'Empresa Existente' });
    await createUser({
      company: tenant.company,
      role: tenant.roles.administrador,
      email: 'admin@existente.test',
    });
    await createUser({
      company: tenant.company,
      role: tenant.roles.ventas,
      email: 'ventas@existente.test',
    });
    companyAdminToken = await login('admin@existente.test', PASSWORD);
    regularUserToken = await login('ventas@existente.test', PASSWORD);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register-company', () => {
    test('solicitud válida → 201, queda pendiente y NO crea empresa ni usuario', async () => {
      const companiesBefore = await Company.countDocuments();

      const res = await submitRequest(companyPayload());

      expect(res.status).toBe(201);
      expect(res.body.data.message).toBe(
        'Solicitud enviada. Te avisaremos por correo cuando tu empresa esté lista.'
      );
      expect(await Company.countDocuments()).toBe(companiesBefore);
      expect(await User.exists({ email: 'laura@ferreteria.test' })).toBeNull();

      const saved = await CompanyRequest.findOne({ 'applicant.email': 'laura@ferreteria.test' })
        .select('+applicant.passwordHash')
        .lean();
      expect(saved.status).toBe('pending');
      expect(saved.company).toMatchObject({ name: 'Ferretería Nueva', industry: 'comercio', city: 'Puebla' });
      expect(saved.applicant.passwordHash).toMatch(/^\$2[aby]\$/);
      expect(saved.applicant.passwordHash).not.toBe(PASSWORD);

      await waitFor(() => {
        expect(emailService.sendCompanyRequestReceived).toHaveBeenCalledWith(
          expect.objectContaining({ email: 'laura@ferreteria.test', companyName: 'Ferretería Nueva' })
        );
        expect(emailService.sendNewCompanyRequestToPlatform).toHaveBeenCalledWith(
          expect.objectContaining({
            companyName: 'Ferretería Nueva',
            recipients: expect.arrayContaining([
              expect.objectContaining({ email: 'root@plataforma.test' }),
            ]),
          })
        );
      });
    });

    test('correo ya usado por una solicitud pendiente o por un usuario → 409', async () => {
      const pending = await submitRequest(companyPayload({ companyName: 'Otra Empresa' }));
      expect(pending.status).toBe(409);
      expect(pending.body.error.message).toBe('Ya existe una cuenta o solicitud con este correo.');

      const existingUser = await submitRequest(
        companyPayload({ companyName: 'Otra Empresa', email: 'ventas@existente.test' })
      );
      expect(existingUser.status).toBe(409);
      expect(existingUser.body.error.message).toBe(
        'Ya existe una cuenta o solicitud con este correo.'
      );
    });

    test('validación en español: giro inválido y contraseña débil → 422', async () => {
      const res = await submitRequest(
        companyPayload({ email: 'invalido@test.local', industry: 'mineria', password: 'abcdefgh' })
      );
      expect(res.status).toBe(422);
      const messages = res.body.error.details.body.map((d) => d.message);
      expect(messages).toContain('Selecciona un giro válido.');
      expect(messages).toContain('La contraseña debe incluir al menos una letra y un número.');
    });

    test('ALLOW_PUBLIC_SIGNUP=false → 403', async () => {
      process.env.ALLOW_PUBLIC_SIGNUP = 'false';
      try {
        const res = await submitRequest(companyPayload({ email: 'cerrado@test.local' }));
        expect(res.status).toBe(403);
      } finally {
        delete process.env.ALLOW_PUBLIC_SIGNUP;
      }
    });
  });

  describe('login del solicitante', () => {
    test('con la solicitud en revisión → 403 "Tu empresa está en revisión…"', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'laura@ferreteria.test', password: PASSWORD });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('COMPANY_IN_REVIEW');
      expect(res.body.error.message).toBe(IN_REVIEW);
    });

    test('con contraseña incorrecta no revela que hay una solicitud', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'laura@ferreteria.test', password: 'Otra12345' });
      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe(INVALID_CREDENTIALS);
    });
  });

  describe('acceso a /platform', () => {
    test.each([
      ['usuario normal', () => regularUserToken],
      ['administrador de empresa', () => companyAdminToken],
    ])('un %s recibe 403 en todos los endpoints', async (_label, token) => {
      const headers = auth(token());
      const fakeId = '0123456789abcdef01234567';
      const responses = await Promise.all([
        request(app).get('/api/v1/platform/company-requests').set(headers),
        request(app).post(`/api/v1/platform/company-requests/${fakeId}/approve`).set(headers),
        request(app).post(`/api/v1/platform/company-requests/${fakeId}/reject`).set(headers).send({}),
        request(app).get('/api/v1/platform/companies').set(headers),
        request(app).post('/api/v1/platform/companies').set(headers).send(companyPayload()),
        request(app)
          .patch(`/api/v1/platform/companies/${tenant.company._id}/status`)
          .set(headers)
          .send({ status: 'suspended' }),
      ]);
      responses.forEach((res) => expect(res.status).toBe(403));
    });

    test('sin token → 401', async () => {
      const res = await request(app).get('/api/v1/platform/company-requests');
      expect(res.status).toBe(401);
    });
  });

  describe('revisión por el Super Admin', () => {
    let requestId;

    test('lista las solicitudes pendientes sin exponer la contraseña', async () => {
      const res = await request(app)
        .get('/api/v1/platform/company-requests?status=pending')
        .set(auth(superToken));
      expect(res.status).toBe(200);
      expect(res.body.meta.total).toBe(1);
      const [item] = res.body.data;
      expect(item.company.name).toBe('Ferretería Nueva');
      expect(item.applicant.passwordHash).toBeUndefined();
      requestId = item._id;
    });

    test('aprobar crea empresa, roles, sucursal y administrador que puede iniciar sesión', async () => {
      const res = await request(app)
        .post(`/api/v1/platform/company-requests/${requestId}/approve`)
        .set(auth(superToken));
      expect(res.status).toBe(200);
      expect(res.body.data.request.status).toBe('approved');
      const companyId = res.body.data.company._id;
      expect(res.body.data.company.joinCode).toMatch(/^FAI-/);

      const company = await Company.findById(companyId).lean();
      expect(company.status).toBe('active');
      expect(company.settings).toMatchObject({ industry: 'comercio', city: 'Puebla' });
      expect(await Role.countDocuments({ companyId })).toBeGreaterThan(0);
      const branch = await Branch.findOne({ companyId, isDefault: true }).lean();
      expect(branch).not.toBeNull();

      const admin = await User.findOne({ email: 'laura@ferreteria.test' }).lean();
      const adminRole = await Role.findById(admin.roleId).lean();
      expect(adminRole.code).toBe('administrador');
      expect(String(admin.companyId)).toBe(companyId);
      expect(String(admin.branchId)).toBe(String(branch._id));
      expect(admin.status).toBe('active');
      expect(admin.isPlatformAdmin).toBe(false);

      const reviewed = await CompanyRequest.findById(requestId)
        .select('+applicant.passwordHash')
        .lean();
      expect(reviewed.reviewedAt).toBeTruthy();
      expect(String(reviewed.reviewedBy)).toBeTruthy();
      expect(String(reviewed.createdCompanyId)).toBe(companyId);
      expect(reviewed.applicant.passwordHash).toBeUndefined();

      // Usa el hash de la solicitud: la contraseña original funciona.
      const token = await login('laura@ferreteria.test', PASSWORD);
      const me = await request(app).get('/api/v1/auth/me').set(auth(token));
      expect(me.status).toBe(200);
      expect(me.body.data.company.name).toBe('Ferretería Nueva');
      expect(me.body.data.role.code).toBe('administrador');

      await waitFor(() =>
        expect(emailService.sendCompanyApproved).toHaveBeenCalledWith(
          expect.objectContaining({ email: 'laura@ferreteria.test', joinCode: company.joinCode })
        )
      );
    });

    test('no se puede aprobar dos veces la misma solicitud → 409', async () => {
      const res = await request(app)
        .post(`/api/v1/platform/company-requests/${requestId}/approve`)
        .set(auth(superToken));
      expect(res.status).toBe(409);
    });

    test('si la empresa no puede crearse, la solicitud sigue pendiente y no queda nada a medias', async () => {
      // Nombre ya ocupado: se inserta la solicitud directamente para simular el choque.
      const conflicting = await CompanyRequest.create({
        company: { name: 'Empresa Existente', industry: 'servicios' },
        applicant: {
          name: 'Choque',
          email: 'choque@test.local',
          passwordHash: '$2a$12$abcdefghijklmnopqrstuuMZ8b1nJ4rQx2u1O3y0C7Qz1C2Y3Z4a5',
        },
      });
      const usersBefore = await User.countDocuments();

      const res = await request(app)
        .post(`/api/v1/platform/company-requests/${conflicting._id}/approve`)
        .set(auth(superToken));

      expect(res.status).toBe(409);
      expect((await CompanyRequest.findById(conflicting._id).lean()).status).toBe('pending');
      expect(await User.countDocuments()).toBe(usersBefore);
      expect(await Company.countDocuments({ name: 'Empresa Existente' })).toBe(1);
    });

    test('si falla el alta del administrador, se revierte la empresa y la solicitud sigue pendiente', async () => {
      const submit = await submitRequest(
        companyPayload({ companyName: 'Panadería Revertida', email: 'revertir@test.local' })
      );
      expect(submit.status).toBe(201);
      const pending = await CompanyRequest.findOne({ 'applicant.email': 'revertir@test.local' }).lean();
      const spy = jest
        .spyOn(userRepository, 'create')
        .mockRejectedValueOnce(new Error('Fallo simulado al crear el usuario'));

      try {
        const res = await request(app)
          .post(`/api/v1/platform/company-requests/${pending._id}/approve`)
          .set(auth(superToken));
        expect(res.status).toBe(500);
      } finally {
        spy.mockRestore();
      }

      expect((await CompanyRequest.findById(pending._id).lean()).status).toBe('pending');
      expect(await Company.exists({ name: 'Panadería Revertida' })).toBeNull();
      expect(await User.exists({ email: 'revertir@test.local' })).toBeNull();

      // Tras el fallo, la misma solicitud se puede aprobar normalmente.
      const retry = await request(app)
        .post(`/api/v1/platform/company-requests/${pending._id}/approve`)
        .set(auth(superToken));
      expect(retry.status).toBe(200);
      const companyId = retry.body.data.company._id;
      expect(await Role.countDocuments({ companyId })).toBeGreaterThan(0);
    });

    test('rechazar marca la solicitud, borra el hash y el login da credenciales incorrectas', async () => {
      const submit = await submitRequest(
        companyPayload({ companyName: 'Taller Rechazado', email: 'rechazo@test.local' })
      );
      expect(submit.status).toBe(201);
      const pending = await CompanyRequest.findOne({ 'applicant.email': 'rechazo@test.local' }).lean();

      const res = await request(app)
        .post(`/api/v1/platform/company-requests/${pending._id}/reject`)
        .set(auth(superToken))
        .send({ reason: 'Datos fiscales incompletos.' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('rejected');
      expect(res.body.data.rejectionReason).toBe('Datos fiscales incompletos.');

      const saved = await CompanyRequest.findById(pending._id).select('+applicant.passwordHash').lean();
      expect(saved.applicant.passwordHash).toBeUndefined();
      expect(await Company.exists({ name: 'Taller Rechazado' })).toBeNull();

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'rechazo@test.local', password: PASSWORD });
      expect(loginRes.status).toBe(401);
      expect(loginRes.body.error.message).toBe(INVALID_CREDENTIALS);

      await waitFor(() =>
        expect(emailService.sendCompanyRejected).toHaveBeenCalledWith(
          expect.objectContaining({ email: 'rechazo@test.local', reason: 'Datos fiscales incompletos.' })
        )
      );

      const history = await request(app)
        .get('/api/v1/platform/company-requests?status=rejected')
        .set(auth(superToken));
      expect(history.body.data.map((r) => r.applicant.email)).toContain('rechazo@test.local');
    });
  });

  describe('empresas de plataforma', () => {
    let directCompanyId;

    test('crear empresa directa con su administrador', async () => {
      const res = await request(app)
        .post('/api/v1/platform/companies')
        .set(auth(superToken))
        .send(
          companyPayload({
            companyName: 'Constructora Directa',
            taxId: undefined,
            industry: 'construccion',
            email: 'admin@directa.test',
          })
        );
      expect(res.status).toBe(201);
      directCompanyId = res.body.data._id;
      expect(res.body.data.joinCode).toMatch(/^FAI-/);

      await waitFor(() =>
        expect(emailService.sendCompanyApproved).toHaveBeenCalledWith(
          expect.objectContaining({ email: 'admin@directa.test', companyName: 'Constructora Directa' })
        )
      );
      await createUser({
        company: { _id: directCompanyId },
        role: await Role.findOne({ companyId: directCompanyId, code: 'ventas' }).lean(),
        email: 'ventas@directa.test',
      });
      expect(await login('admin@directa.test', PASSWORD)).toBeDefined();
    });

    test('listar empresas con usuarios activos y búsqueda', async () => {
      const res = await request(app)
        .get('/api/v1/platform/companies?search=directa')
        .set(auth(superToken));
      expect(res.status).toBe(200);
      expect(res.body.meta.total).toBe(1);
      expect(res.body.data[0]).toMatchObject({
        name: 'Constructora Directa',
        status: 'active',
        activeUsers: 2,
        industry: 'construccion',
      });
      expect(res.body.data[0].joinCode).toMatch(/^FAI-/);
      expect(res.body.data[0].createdAt).toBeTruthy();
    });

    test('suspender impide el login de sus usuarios y reactivar lo restablece', async () => {
      const suspend = await request(app)
        .patch(`/api/v1/platform/companies/${directCompanyId}/status`)
        .set(auth(superToken))
        .send({ status: 'suspended' });
      expect(suspend.status).toBe(200);
      expect(suspend.body.data.status).toBe('suspended');

      for (const email of ['admin@directa.test', 'ventas@directa.test']) {
        const res = await request(app).post('/api/v1/auth/login').send({ email, password: PASSWORD });
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('COMPANY_SUSPENDED');
        expect(res.body.error.message).toBe(SUSPENDED);
      }

      const reactivate = await request(app)
        .patch(`/api/v1/platform/companies/${directCompanyId}/status`)
        .set(auth(superToken))
        .send({ status: 'active' });
      expect(reactivate.status).toBe(200);
      expect(await login('ventas@directa.test', PASSWORD)).toBeDefined();
    });
  });
});
