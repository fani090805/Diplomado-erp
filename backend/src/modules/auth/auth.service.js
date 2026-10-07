'use strict';

const ApiError = require('../../utils/ApiError');
const { ConflictError, ForbiddenError } = require('../../common/errors');
const logger = require('../../config/logger');
const { hashPassword, verifyPassword, isStrongPassword } = require('../../utils/password');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../../utils/tokens');
const { randomUUID, randomBytes, createHash } = require('crypto');
const jwt = require('jsonwebtoken');
const Session = require('./session.model');
const userRepository = require('../users/user.repository');
const roleRepository = require('../roles/role.repository');
const companyRepository = require('../companies/company.repository');
const branchRepository = require('../branches/branch.repository');
const companyRequestRepository = require('../company-requests/company_request.repository');
const auditService = require('../audit/audit.service');
const {
  sendLoginNotification,
  sendRegistrationReceived,
  sendNewPendingUserToAdmins,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
} = require('../../services/email.service');

const MAX_FAILED_ATTEMPTS = 5;
const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;
const PASSWORD_RESET_INVALID = 'El enlace no es válido o ya venció.';
const FORGOT_PASSWORD_MESSAGE = 'Si el correo está registrado, te enviamos instrucciones.';

function dispatchEmail(send, context) {
  Promise.resolve()
    .then(send)
    .catch((error) => {
      logger.error({ err: error.message, ...context }, 'No se pudo completar el envío de correo.');
    });
}

function hashSessionId(sessionId) {
  return createHash('sha256').update(sessionId).digest('hex');
}

async function issueRefreshToken(user) {
  const sessionId = randomUUID();
  const refreshToken = signRefreshToken(toTokenUser(user), sessionId);
  const { exp } = jwt.decode(refreshToken);
  await Session.create({
    userId: user._id,
    companyId: user.companyId || null,
    tokenVersion: user.tokenVersion ?? 0,
    refreshIdHash: hashSessionId(sessionId),
    expiresAt: new Date(exp * 1000),
  });
  return refreshToken;
}
const INVALID_CREDENTIALS = 'Correo o contraseña incorrectos.';
const COMPANY_IN_REVIEW = 'Tu empresa está en revisión. Te avisaremos por correo cuando esté lista.';
const COMPANY_SUSPENDED = 'Tu empresa está suspendida. Contacta al soporte.';

/**
 * Servicio de autenticación.
 *
 * Reglas de seguridad:
 *  - Mensaje ÚNICO para "usuario no existe" y "contraseña incorrecta"
 *    (anti-enumeración); el orden es: password → estado → empresa.
 *  - 5 intentos fallidos => cuenta bloqueada (status 'locked').
 *  - tokenVersion++ en logout/cambio de contraseña = cierre global de sesión.
 *  - Login/refresh verifican que la EMPRESA esté activa (no sólo el usuario).
 *  - Todo login (éxito o fallo) queda en la auditoría.
 */

/** Hash temporal para igualar tiempos cuando el email no existe. */
let dummyHashPromise = null;
function getDummyHash() {
  if (!dummyHashPromise) dummyHashPromise = hashPassword(`timing-equalizer-${Date.now()}`);
  return dummyHashPromise;
}

function toTokenUser(user) {
  return {
    id: String(user._id),
    companyId: user.companyId ? String(user.companyId) : null,
    branchId: user.branchId ? String(user.branchId) : null,
    roleId: String(user.roleId),
    tokenVersion: user.tokenVersion ?? 0,
  };
}

function stripSecrets(user) {
  const safe = { ...user };
  delete safe.passwordHash;
  delete safe.resetPasswordTokenHash;
  delete safe.resetPasswordExpiresAt;
  return safe;
}

const authService = {
  async register({ name, lastName, companyCode, email, password }, meta = {}) {
    let company = null;
    let user = null;

    try {
      if (process.env.ALLOW_PUBLIC_SIGNUP === 'false') {
        throw new ForbiddenError('El registro público está deshabilitado.');
      }

      if (await userRepository.findByEmail(email)) {
        throw new ConflictError('Ya existe una cuenta con este correo.');
      }

      company = await companyRepository.findByJoinCode(String(companyCode).trim().toUpperCase());
      if (!company || company.status !== 'active') {
        throw ApiError.badRequest('El código de empresa no es válido.');
      }

      user = await userRepository.create({
        companyId: company._id,
        name,
        ...(lastName ? { lastName } : {}),
        email,
        passwordHash: await hashPassword(password),
        status: 'pending',
        isPlatformAdmin: false,
      });

      await auditService.log({
        module: 'auth',
        action: 'REGISTER',
        resourceType: 'user',
        resourceId: String(user._id),
        companyId: user.companyId,
        userId: String(user._id),
        userEmail: user.email,
        result: 'SUCCESS',
        ...meta,
      });
      dispatchEmail(
        () =>
          sendRegistrationReceived({
            email: user.email,
            name: `${user.name || ''} ${user.lastName || ''}`.trim(),
            companyName: company.name,
          }),
        { action: 'registration_received', userId: String(user._id) }
      );
      dispatchEmail(async () => {
        const roles = await roleRepository.findAll({ companyId: company._id, status: 'active' });
        const adminRoleIds = roles
          .filter((role) => role.permissions?.includes('users.update'))
          .map((role) => role._id);
        const admins = await userRepository.findActiveByRoleIds(company._id, adminRoleIds);
        return sendNewPendingUserToAdmins({
          admins,
          userName: `${user.name || ''} ${user.lastName || ''}`.trim(),
          userEmail: user.email,
          companyName: company.name,
        });
      }, { action: 'pending_user_admin_notification', userId: String(user._id) });
      return { message: 'Cuenta creada. Un administrador debe aprobar tu acceso.' };
    } catch (error) {
      if (user) {
        const rollbackResults = await Promise.allSettled([userRepository.deleteById(user._id)]);
        if (rollbackResults.some((result) => result.status === 'rejected')) {
          logger.error(
            { userId: String(user._id) },
            'Rollback incompleto al registrar una solicitud de acceso'
          );
        }
      }
      const failure =
        error?.code === 11000 && error?.keyPattern?.email
          ? new ConflictError('Ya existe una cuenta con este correo.')
          : error;
      await auditService.log({
        module: 'auth',
        action: 'REGISTER',
        resourceType: 'user',
        resourceId: user ? String(user._id) : null,
        companyId: company?._id || null,
        userId: user ? String(user._id) : null,
        userEmail: email,
        result: 'FAILURE',
        message: failure.message,
        ...meta,
      });
      throw failure;
    }
  },

  async forgotPassword({ email }, meta = {}) {
    const user = await userRepository.findByEmail(email);
    if (user && (user.status === 'active' || user.status === 'locked')) {
      const token = randomBytes(32).toString('hex');
      const resetPasswordTokenHash = createHash('sha256').update(token).digest('hex');
      const resetPasswordExpiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
      await userRepository.updateById(user._id, {
        resetPasswordTokenHash,
        resetPasswordExpiresAt,
      });

      const appUrl = process.env.APP_URL || '';
      dispatchEmail(
        () =>
          sendPasswordResetEmail({
            email: user.email,
            name: `${user.name || ''} ${user.lastName || ''}`.trim(),
            resetUrl: `${appUrl}/?reset=${token}`,
          }),
        { action: 'password_reset_requested', userId: String(user._id) }
      );
    }

    await auditService.log({
      module: 'auth',
      action: 'FORGOT_PASSWORD',
      resourceType: 'user',
      resourceId: user ? String(user._id) : null,
      companyId: user?.companyId || null,
      userId: user ? String(user._id) : null,
      userEmail: email,
      result: 'SUCCESS',
      ...meta,
    });
    return { message: FORGOT_PASSWORD_MESSAGE };
  },

  async resetPassword({ token, password }, meta = {}) {
    if (!isStrongPassword(password)) {
      throw ApiError.badRequest('La contraseña debe tener al menos 8 caracteres, una letra y un número.');
    }
    const resetPasswordTokenHash = createHash('sha256').update(token).digest('hex');
    const passwordHash = await hashPassword(password);
    const user = await userRepository.resetPasswordByTokenHash(
      resetPasswordTokenHash,
      passwordHash,
      new Date()
    );

    if (!user) {
      await auditService.log({
        module: 'auth',
        action: 'RESET_PASSWORD',
        resourceType: 'user',
        result: 'FAILURE',
        message: PASSWORD_RESET_INVALID,
        ...meta,
      });
      throw ApiError.badRequest(PASSWORD_RESET_INVALID);
    }

    await Session.deleteMany({ userId: user._id }).exec();
    await auditService.log({
      module: 'auth',
      action: 'RESET_PASSWORD',
      resourceType: 'user',
      resourceId: String(user._id),
      companyId: user.companyId || null,
      userId: String(user._id),
      userEmail: user.email,
      result: 'SUCCESS',
      ...meta,
    });
    dispatchEmail(
      () =>
        sendPasswordChangedEmail({
          email: user.email,
          name: `${user.name || ''} ${user.lastName || ''}`.trim(),
        }),
      { action: 'password_changed', userId: String(user._id) }
    );
    return { message: 'Tu contraseña fue actualizada.' };
  },

  async login({ email, password }, meta = {}) {
    const user = await userRepository.findByEmail(email);

    const failLogin = async (message, target, code, statusCode = 401) => {
      await auditService.log({
        module: 'auth',
        action: 'LOGIN',
        resourceType: 'user',
        resourceId: target ? String(target._id) : null,
        companyId: target?.companyId || null,
        userId: target ? String(target._id) : null,
        userEmail: email,
        result: 'FAILURE',
        message,
        ...meta,
      });
      if (statusCode === 403) throw new ApiError(403, message, { code });
      throw ApiError.unauthorized(message, code);
    };

    if (!user) {
      // Solicitante de una empresa en revisión: sólo se informa con la contraseña correcta.
      const pendingRequest = await companyRequestRepository.findPendingByEmail(email, {
        withPasswordHash: true,
      });
      const hash = pendingRequest?.applicant?.passwordHash || (await getDummyHash());
      // Iguala el tiempo de respuesta con un login inexistente.
      const matchesRequest = await verifyPassword(password, hash);
      if (pendingRequest && matchesRequest) {
        return failLogin(COMPANY_IN_REVIEW, null, 'COMPANY_IN_REVIEW', 403);
      }
      return failLogin(INVALID_CREDENTIALS, null, 'INVALID_CREDENTIALS');
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      const attempts = (user.failedLoginAttempts || 0) + 1;
      const locked = attempts >= MAX_FAILED_ATTEMPTS;
      await userRepository.updateById(user._id, {
        failedLoginAttempts: attempts,
        ...(locked ? { status: 'locked' } : {}),
      });
      if (locked) {
        return failLogin(
          'La cuenta fue bloqueada por seguridad tras varios intentos.',
          user,
          'ACCOUNT_LOCKED'
        );
      }
      return failLogin(INVALID_CREDENTIALS, user, 'INVALID_CREDENTIALS');
    }

    // Contraseña correcta: ahora sí se informa el estado real.
    if (user.status === 'locked') {
      return failLogin(
        'La cuenta está bloqueada por seguridad. Contacte al administrador.',
        user,
        'ACCOUNT_LOCKED'
      );
    }
    if (user.status === 'pending') {
      return failLogin(
        'Tu cuenta está pendiente de aprobación por el administrador.',
        user,
        'ACCOUNT_PENDING',
        403
      );
    }
    if (user.status !== 'active') {
      return failLogin('La cuenta está inactiva.', user, 'ACCOUNT_INACTIVE');
    }

    if (user.companyId) {
      const company = await companyRepository.findById(user.companyId);
      if (!company) {
        return failLogin('La cuenta no pertenece a una empresa válida.', user, 'COMPANY_INVALID');
      }
      if (company.status !== 'active') {
        return failLogin(COMPANY_SUSPENDED, user, 'COMPANY_SUSPENDED');
      }
    }

    await userRepository.resetLoginFailures(user._id);

    const tokenUser = toTokenUser(user);
    const result = {
      user: stripSecrets({ ...user, failedLoginAttempts: 0, lastLoginAt: new Date() }),
      accessToken: signAccessToken(tokenUser),
      refreshToken: await issueRefreshToken(user),
    };

    // Envío de notificación de inicio de sesión por correo electrónico en segundo plano vía Resend (no bloqueante)
    sendLoginNotification({
      email: user.email,
      name: `${user.name || ''} ${user.lastName || ''}`.trim(),
      ip: meta.ip || meta.remoteAddress || '',
    }).catch(() => {});

    await auditService.log({
      module: 'auth',
      action: 'LOGIN',
      resourceType: 'user',
      resourceId: String(user._id),
      companyId: user.companyId || null,
      userId: String(user._id),
      userEmail: user.email,
      result: 'SUCCESS',
      ...meta,
    });

    return result;
  },

  async refresh({ refreshToken }) {
    const payload = verifyRefreshToken(refreshToken);
    if (typeof payload.jti !== 'string' || !payload.jti) {
      throw ApiError.unauthorized('Refresh token inválido o expirado.', 'REFRESH_INVALID');
    }

    const user = await userRepository.findById(payload.sub);
    if (!user) throw ApiError.unauthorized('Refresh token inválido o expirado.', 'REFRESH_INVALID');
    if (user.status !== 'active') {
      throw ApiError.unauthorized('La cuenta no está activa.', 'ACCOUNT_INACTIVE');
    }
    // tokenVersion distinto => logout global: el refresh ya fue invalidado.
    if ((user.tokenVersion ?? 0) !== (payload.tv ?? 0)) {
      throw ApiError.unauthorized('La sesión fue cerrada. Inicie sesión nuevamente.', 'TOKEN_REVOKED');
    }
    if (user.companyId) {
      const company = await companyRepository.findById(user.companyId);
      if (!company || company.status !== 'active') {
        throw ApiError.forbidden(COMPANY_SUSPENDED);
      }
    }

    // El consumo atómico impide reutilizar el refresh token, incluso en solicitudes concurrentes.
    const consumed = await Session.findOneAndUpdate(
      {
        userId: user._id,
        tokenVersion: payload.tv ?? 0,
        refreshIdHash: hashSessionId(payload.jti),
        consumedAt: null,
        expiresAt: { $gt: new Date() },
      },
      { $set: { consumedAt: new Date() } },
      { new: true }
    ).lean();
    if (!consumed) {
      throw ApiError.unauthorized('La sesión ya fue renovada o revocada.', 'SESSION_REVOKED');
    }
    const tokenUser = toTokenUser(user);
    return {
      accessToken: signAccessToken(tokenUser),
      refreshToken: await issueRefreshToken(user),
    };
  },

  /** Logout GLOBAL: incrementa tokenVersion y anula todos los refresh emitidos. */
  async logout(actor, meta = {}) {
    await userRepository.bumpTokenVersion(actor.id);
    await auditService.log({
      module: 'auth',
      action: 'LOGOUT',
      resourceType: 'session',
      resourceId: actor.id,
      companyId: actor.companyId || null,
      userId: actor.id,
      userEmail: actor.email,
      result: 'SUCCESS',
      ...meta,
    });
    return { loggedOut: true };
  },

  /** Contexto completo para el frontend tras /auth/me. */
  async me(actor) {
    const user = await userRepository.findById(actor.id);
    if (!user) throw ApiError.unauthorized('Usuario no encontrado.');

    const [role, company, branch] = await Promise.all([
      actor.roleId ? roleRepository.findById(actor.roleId) : Promise.resolve(null),
      actor.companyId
        ? companyRepository.findById(actor.companyId)
        : Promise.resolve(null),
      actor.branchId
        ? branchRepository.findById(actor.branchId, { companyId: actor.companyId })
        : Promise.resolve(null),
    ]);

    return {
      user: stripSecrets(user),
      role: role
        ? { _id: role._id, code: role.code, label: role.label, permissions: role.permissions }
        : null,
      company: company
        ? {
            _id: company._id,
            name: company.name,
            currency: company.currency,
            timezone: company.timezone,
            status: company.status,
          }
        : null,
      branch: branch ? { _id: branch._id, code: branch.code, name: branch.name } : null,
    };
  },

  async changePassword(actor, { currentPassword, newPassword }, meta = {}) {
    const user = await userRepository.findByEmail(actor.email);
    if (!user) throw ApiError.unauthorized('Usuario no encontrado.');

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      await auditService.log({
        module: 'auth',
        action: 'CHANGE_PASSWORD',
        resourceType: 'user',
        resourceId: actor.id,
        companyId: actor.companyId || null,
        userId: actor.id,
        userEmail: actor.email,
        result: 'FAILURE',
        message: 'Contraseña actual incorrecta.',
        ...meta,
      });
      throw ApiError.unauthorized('La contraseña actual es incorrecta.', 'INVALID_PASSWORD');
    }

    const passwordHash = await hashPassword(newPassword);
    await userRepository.updateById(user._id, {
      passwordHash,
      tokenVersion: (user.tokenVersion || 0) + 1, // cierra las demás sesiones
    });

    await auditService.log({
      module: 'auth',
      action: 'CHANGE_PASSWORD',
      resourceType: 'user',
      resourceId: actor.id,
      companyId: actor.companyId || null,
      userId: actor.id,
      userEmail: actor.email,
      result: 'SUCCESS',
      ...meta,
    });

    dispatchEmail(
      () =>
        sendPasswordChangedEmail({
          email: user.email,
          name: (user.name || '') + ' ' + (user.lastName || ''),
        }),
      { action: 'password_changed', userId: String(user._id) }
    );

    return { changed: true, mustRelogin: true };
  },
};

module.exports = authService;
