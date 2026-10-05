'use strict';

jest.mock('../../src/config/logger', () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn() }));
jest.mock('https', () => ({ request: jest.fn() }));

const https = require('https');
const logger = require('../../src/config/logger');
const emailService = require('../../src/services/email.service');

const ENV_KEYS = [
  'EMAIL_PROVIDER',
  'RESEND_API_KEY',
  'BREVO_API_KEY',
  'EMAIL_FROM',
  'EMAIL_FROM_NAME',
  'APP_URL',
  'LOGIN_NOTIFICATIONS',
];

/** Simula una respuesta HTTPS del proveedor y captura el cuerpo enviado. */
function mockProviderResponse(statusCode, body = '{}') {
  const sent = { options: null, payload: '' };
  https.request.mockImplementation((options, callback) => {
    sent.options = options;
    const handlers = {};
    const response = {
      statusCode,
      on: (event, handler) => {
        handlers[event] = handler;
      },
    };
    return {
      on: jest.fn(),
      write: (chunk) => {
        sent.payload += chunk;
      },
      end: () => {
        callback(response);
        handlers.data?.(body);
        handlers.end?.();
      },
    };
  });
  return sent;
}

describe('email.service', () => {
  const original = {};

  beforeAll(() => {
    ENV_KEYS.forEach((key) => {
      original[key] = process.env[key];
    });
  });

  afterEach(() => {
    ENV_KEYS.forEach((key) => {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    });
    jest.clearAllMocks();
  });

  test('sin clave ni remitente omite el envío sin lanzar error', async () => {
    ENV_KEYS.forEach((key) => delete process.env[key]);
    const result = await emailService.sendWelcomeEmail({ email: 'a@test.local', name: 'Ana' });
    expect(result).toEqual({ success: true, simulated: true });
    expect(https.request).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(expect.anything(), expect.stringContaining('omitiendo envío'));
  });

  test('brevo: usa api-key y escapa los datos del usuario', async () => {
    Object.assign(process.env, {
      EMAIL_PROVIDER: 'brevo',
      BREVO_API_KEY: 'clave-ficticia',
      EMAIL_FROM: 'no-reply@test.local',
      EMAIL_FROM_NAME: 'FAI Solution ERP',
    });
    const sent = mockProviderResponse(201);

    const result = await emailService.sendRegistrationReceived({
      email: 'a@test.local',
      name: '<script>x</script>',
      companyName: 'Acme & "Hijos"',
    });

    expect(result.success).toBe(true);
    expect(sent.options.hostname).toBe('api.brevo.com');
    expect(sent.options.headers['api-key']).toBe('clave-ficticia');
    const payload = JSON.parse(sent.payload);
    expect(payload.sender).toEqual({ name: 'FAI Solution ERP', email: 'no-reply@test.local' });
    expect(payload.htmlContent).not.toContain('<script>');
    expect(payload.htmlContent).toContain('&lt;script&gt;');
    expect(payload.htmlContent).toContain('Acme &amp; &quot;Hijos&quot;');
  });

  test('resend: Bearer y from "Nombre <correo>"; un fallo no lanza error', async () => {
    Object.assign(process.env, {
      EMAIL_PROVIDER: 'resend',
      RESEND_API_KEY: 'clave-ficticia',
      EMAIL_FROM: 'no-reply@test.local',
      EMAIL_FROM_NAME: 'FAI Solution ERP',
    });
    const sent = mockProviderResponse(422, '{"message":"invalid"}');

    const result = await emailService.sendPasswordChangedEmail({ email: 'a@test.local', name: 'Ana' });

    expect(result.success).toBe(false);
    expect(sent.options.hostname).toBe('api.resend.com');
    expect(sent.options.headers.Authorization).toBe('Bearer clave-ficticia');
    expect(JSON.parse(sent.payload).from).toBe('FAI Solution ERP <no-reply@test.local>');
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 422, response: '{"message":"invalid"}' }),
      expect.any(String)
    );
  });

  test('la notificación de inicio de sesión solo se envía con LOGIN_NOTIFICATIONS=true', async () => {
    Object.assign(process.env, {
      EMAIL_PROVIDER: 'resend',
      RESEND_API_KEY: 'clave-ficticia',
      EMAIL_FROM: 'no-reply@test.local',
    });
    delete process.env.LOGIN_NOTIFICATIONS;
    const skipped = await emailService.sendLoginNotification({ email: 'a@test.local' });
    expect(skipped.skipped).toBe(true);
    expect(https.request).not.toHaveBeenCalled();

    process.env.LOGIN_NOTIFICATIONS = 'true';
    mockProviderResponse(200);
    const sentResult = await emailService.sendLoginNotification({ email: 'a@test.local' });
    expect(sentResult.success).toBe(true);
    expect(https.request).toHaveBeenCalledTimes(1);
  });
});
