'use strict';

const ApiError = require('../../utils/ApiError');
const { ConflictError, ForbiddenError } = require('../../common/errors');
const logger = require('../../config/logger');
const { hashPassword } = require('../../utils/password');
const { searchFilterMulti } = require('../../utils/search');
const companyRequestRepository = require('./company_request.repository');
const companyService = require('../companies/company.service');
const companyRepository = require('../companies/company.repository');
const userRepository = require('../users/user.repository');
const { publish: publishEvent } = require('../events/event.bus');
const auditService = require('../audit/audit.service');
const {
  sendCompanyRequestReceived,
  sendNewCompanyRequestToPlatform,
  sendCompanyApproved,
  sendCompanyRejected,
} = require('../../services/email.service');

const DUPLICATE_EMAIL = 'Ya existe una cuenta o solicitud con este correo.';
const REQUEST_RECEIVED = 'Solicitud enviada. Te avisaremos por correo cuando tu empresa esté lista.';
const ADMIN_ROLE_CODE = 'administrador';

function dispatchEmail(send, context) {
  Promise.resolve()
    .then(send)
    .catch((error) => {
      logger.error({ err: error.message, ...context }, 'No se pudo completar el envío de correo.');
    });
}

function fullName({ name, lastName } = {}) {
  return `${name || ''} ${lastName || ''}`.trim();
}

function isDuplicateKey(error) {
  return error?.code === 11000;
}

/** Datos de empresa del formulario → documento de la solicitud. */
function toCompanyData({ companyName, legalName, taxId, industry, phone, city }) {
  return { name: companyName, legalName, taxId, industry, phone, city };
}

async function assertEmailAvailable(email) {
  const [user, pending] = await Promise.all([
    userRepository.findByEmail(email),
    companyRequestRepository.findPendingByEmail(email),
  ]);
  if (user || pending) throw new ConflictError(DUPLICATE_EMAIL);
}

async function assertCompanyNameAvailable(name) {
  if (await companyRepository.findOne({ name })) {
    throw new ConflictError('Ya existe una empresa registrada con ese nombre.');
  }
}

/** Revierte una empresa aprovisionada (usuario administrador incluido). */
async function rollbackProvisioning(provisioned) {
  if (provisioned.user) {
    await userRepository.deleteById(provisioned.user._id).catch((error) => {
      logger.error({ err: error.message }, 'No se pudo revertir el administrador creado');
    });
  }
  await companyService.rollbackCreate(provisioned);
}

/**
 * Crea la empresa (roles, sucursal, almacén, datos maestros y joinCode vía
 * companyService.create) y su usuario administrador con el hash recibido.
 * Si cualquier paso falla, revierte lo creado y propaga el error.
 */
async function provisionCompanyWithAdmin({ company, applicant }) {
  if (await userRepository.findByEmail(applicant.email)) {
    throw new ConflictError('Ya existe una cuenta con este correo.');
  }

  const settings = { industry: company.industry, ...(company.city ? { city: company.city } : {}) };
  const provisioned = await companyService.create({
    name: company.name,
    ...(company.legalName ? { legalName: company.legalName } : {}),
    ...(company.taxId ? { taxId: company.taxId } : {}),
    ...(company.phone ? { phone: company.phone } : {}),
    settings,
  });

  try {
    const adminRole = provisioned.roles.find((role) => role.code === ADMIN_ROLE_CODE);
    if (!adminRole) throw ApiError.internal('No se encontró el rol de administrador de la empresa.');

    provisioned.user = await userRepository.create({
      companyId: provisioned.company._id,
      branchId: provisioned.branch._id,
      roleId: adminRole._id,
      name: applicant.name,
      ...(applicant.lastName ? { lastName: applicant.lastName } : {}),
      email: applicant.email,
      passwordHash: applicant.passwordHash,
      status: 'active',
      isPlatformAdmin: false,
    });
    return provisioned;
  } catch (error) {
    logger.error(
      { err: error.message, companyId: String(provisioned.company._id) },
      'Alta del administrador falló; se revierte la empresa'
    );
    await rollbackProvisioning(provisioned);
    if (isDuplicateKey(error) && error?.keyPattern?.email) {
      throw new ConflictError('Ya existe una cuenta con este correo.');
    }
    throw error;
  }
}

function notifyCompanyReady(provisioned) {
  const { company, user } = provisioned;
  dispatchEmail(
    () =>
      sendCompanyApproved({
        email: user.email,
        name: fullName(user),
        companyName: company.name,
        joinCode: company.joinCode,
      }),
    { action: 'company_approved', companyId: String(company._id) }
  );
}

function companySummary({ company, user }) {
  return {
    _id: company._id,
    name: company.name,
    joinCode: company.joinCode,
    status: company.status,
    adminUserId: user._id,
    adminEmail: user.email,
  };
}

const companyRequestService = {
  /** Solicitud pública: sólo guarda la solicitud (sin empresa ni usuario). */
  async submit(data, meta = {}) {
    const company = toCompanyData(data);
    const applicant = { name: data.name, lastName: data.lastName, email: data.email };
    let request = null;

    try {
      if (process.env.ALLOW_PUBLIC_SIGNUP === 'false') {
        throw new ForbiddenError('El registro público está deshabilitado.');
      }
      await assertEmailAvailable(applicant.email);
      await assertCompanyNameAvailable(company.name);

      request = await companyRequestRepository.create({
        company,
        applicant: { ...applicant, passwordHash: await hashPassword(data.password) },
        status: 'pending',
      });
    } catch (error) {
      const failure = isDuplicateKey(error) ? new ConflictError(DUPLICATE_EMAIL) : error;
      await auditService.log({
        module: 'auth',
        action: 'REGISTER_COMPANY',
        resourceType: 'company_request',
        userEmail: applicant.email,
        result: 'FAILURE',
        message: failure.message,
        ...meta,
      });
      throw failure;
    }

    await auditService.log({
      module: 'auth',
      action: 'REGISTER_COMPANY',
      resourceType: 'company_request',
      resourceId: String(request._id),
      userEmail: applicant.email,
      after: { company, applicant },
      result: 'SUCCESS',
      ...meta,
    });

    dispatchEmail(
      () =>
        sendCompanyRequestReceived({
          email: applicant.email,
          name: fullName(applicant),
          companyName: company.name,
        }),
      { action: 'company_request_received', requestId: String(request._id) }
    );
    dispatchEmail(async () => {
      const admins = await userRepository.findActivePlatformAdmins();
      const recipients = admins.map((admin) => ({ email: admin.email, name: fullName(admin) }));
      const extra = (process.env.PLATFORM_NOTIFY_EMAIL || '').trim().toLowerCase();
      if (extra && !recipients.some((recipient) => recipient.email === extra)) {
        recipients.push({ email: extra });
      }
      return sendNewCompanyRequestToPlatform({
        recipients,
        companyName: company.name,
        industry: company.industry,
        city: company.city,
        applicantName: fullName(applicant),
        applicantEmail: applicant.email,
      });
    }, { action: 'company_request_platform_notification', requestId: String(request._id) });

    // Nueva solicitud: el panel de plataforma se refresca en vivo.
    publishEvent({ entity: 'company', id: request._id, action: 'created' });

    return { message: REQUEST_RECEIVED };
  },

  async list(query, { sort, skip, limit }) {
    const filter = searchFilterMulti(['company.name', 'applicant.email'], query.search);
    if (query.status) filter.status = query.status;
    return companyRequestRepository.find(filter, { sort, skip, limit });
  },

  async getById(id) {
    return companyRequestRepository.findById(id);
  },

  async approve(id, actor, meta = {}) {
    const request = await companyRequestRepository.findByIdWithPasswordHash(id);
    if (!request) throw ApiError.notFound('Recurso no encontrado.');
    if (request.status !== 'pending') throw new ConflictError('La solicitud ya fue revisada.');
    if (!request.applicant?.passwordHash) {
      throw ApiError.badRequest('La solicitud no tiene una contraseña válida.');
    }

    const provisioned = await provisionCompanyWithAdmin({
      company: request.company,
      applicant: request.applicant,
    });

    const updated = await companyRequestRepository.markReviewed(id, {
      status: 'approved',
      reviewedBy: actor.id,
      reviewedAt: new Date(),
      createdCompanyId: provisioned.company._id,
    });
    if (!updated) {
      // Otro Super Admin la revisó mientras se aprovisionaba: se deshace todo.
      await rollbackProvisioning(provisioned);
      throw new ConflictError('La solicitud ya fue revisada.');
    }

    await auditService.log({
      module: 'company-requests',
      action: 'APPROVE_COMPANY_REQUEST',
      resourceType: 'company_request',
      resourceId: String(id),
      userId: actor.id,
      userEmail: actor.email,
      before: { status: 'pending' },
      after: { status: 'approved', createdCompanyId: String(provisioned.company._id) },
      result: 'SUCCESS',
      ...meta,
    });
    notifyCompanyReady(provisioned);

    return { request: updated, company: companySummary(provisioned) };
  },

  async reject(id, { reason } = {}, actor, meta = {}) {
    const request = await companyRequestRepository.findById(id);
    if (!request) throw ApiError.notFound('Recurso no encontrado.');
    if (request.status !== 'pending') throw new ConflictError('La solicitud ya fue revisada.');

    const updated = await companyRequestRepository.markReviewed(id, {
      status: 'rejected',
      reviewedBy: actor.id,
      reviewedAt: new Date(),
      rejectionReason: reason || null,
    });
    if (!updated) throw new ConflictError('La solicitud ya fue revisada.');

    await auditService.log({
      module: 'company-requests',
      action: 'REJECT_COMPANY_REQUEST',
      resourceType: 'company_request',
      resourceId: String(id),
      userId: actor.id,
      userEmail: actor.email,
      before: { status: 'pending' },
      after: { status: 'rejected', rejectionReason: reason || null },
      result: 'SUCCESS',
      ...meta,
    });
    dispatchEmail(
      () =>
        sendCompanyRejected({
          email: updated.applicant.email,
          name: fullName(updated.applicant),
          companyName: updated.company.name,
          reason,
        }),
      { action: 'company_rejected', requestId: String(id) }
    );

    return updated;
  },

  /** Empresas con su número de usuarios activos (panel de plataforma). */
  async listCompanies(query, { sort, skip, limit }) {
    const filter = searchFilterMulti(['name', 'joinCode'], query.search);
    if (query.status) filter.status = query.status;
    const { items, total } = await companyService.list(filter, {
      sort,
      skip,
      limit,
      projection: 'name legalName taxId joinCode status settings createdAt',
    });
    const counts = await userRepository.countActiveByCompanies(items.map((company) => company._id));
    return {
      items: items.map((company) => ({
        _id: company._id,
        name: company.name,
        legalName: company.legalName,
        taxId: company.taxId,
        joinCode: company.joinCode,
        status: company.status,
        industry: company.settings?.industry || null,
        city: company.settings?.city || null,
        activeUsers: counts[String(company._id)] || 0,
        createdAt: company.createdAt,
      })),
      total,
    };
  },

  /** Alta directa por el Super Admin: misma lógica que aprobar una solicitud. */
  async createCompany(data, actor, meta = {}) {
    await assertEmailAvailable(data.email);
    const provisioned = await provisionCompanyWithAdmin({
      company: toCompanyData(data),
      applicant: {
        name: data.name,
        lastName: data.lastName,
        email: data.email,
        passwordHash: await hashPassword(data.password),
      },
    });

    await auditService.log({
      module: 'companies',
      action: 'CREATE_COMPANY_WITH_ADMIN',
      resourceType: 'company',
      resourceId: String(provisioned.company._id),
      userId: actor.id,
      userEmail: actor.email,
      after: { company: toCompanyData(data), adminEmail: data.email },
      result: 'SUCCESS',
      ...meta,
    });
    notifyCompanyReady(provisioned);

    return companySummary(provisioned);
  },

  async setCompanyStatus(id, status, actor, meta = {}) {
    const before = await companyRepository.findById(id);
    if (!before) throw ApiError.notFound('Recurso no encontrado.');
    const updated = await companyService.update(id, { status }, actor);

    await auditService.log({
      module: 'companies',
      action: status === 'suspended' ? 'SUSPEND_COMPANY' : 'REACTIVATE_COMPANY',
      resourceType: 'company',
      resourceId: String(id),
      userId: actor.id,
      userEmail: actor.email,
      before: { status: before.status },
      after: { status: updated.status },
      result: 'SUCCESS',
      ...meta,
    });
    return { _id: updated._id, name: updated.name, status: updated.status };
  },
};

module.exports = companyRequestService;
