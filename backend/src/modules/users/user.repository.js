'use strict';

const mongoose = require('mongoose');
const BaseRepository = require('../../common/BaseRepository');
const User = require('./user.model');

/** Campos que identifican a un usuario como autor o responsable aunque no declaren ref. */
const USER_REFERENCE_FIELDS = new Set([
  'createdBy',
  'updatedBy',
  'userId',
  'approvedBy',
  'rejectedBy',
  'requestedBy',
  'performedBy',
  'assignedTo',
  'postedBy',
  'releasedBy',
  'doneBy',
  'cancelledBy',
  'voidedBy',
]);

/**
 * Colecciones que no son documentos de negocio: el propio usuario, sus sesiones
 * y la auditoría (que se evalúa aparte, filtrando por módulo).
 */
const IGNORED_MODELS = new Set(['User', 'Session', 'AuditLog']);

/**
 * Módulos de auditoría que NO cuentan como historial de negocio: autenticación
 * (LOGIN, LOGOUT, REGISTER, FORGOT/RESET/CHANGE_PASSWORD, refresh) y la gestión
 * de cuentas y configuración (alta, aprobación, rechazo, desactivación,
 * reactivación y cambios de perfil viven en "users"). Cualquier otro módulo
 * (ventas, compras, inventario, finanzas, producción, CRM, obras, RRHH…) sí cuenta.
 */
const NON_BUSINESS_AUDIT_MODULES = [
  'auth',
  'users',
  'roles',
  'companies',
  'branches',
  'master-data',
  'audit',
  'reports',
  'unknown',
];

/** Rutas (incluidas las anidadas) de un esquema que apuntan a un usuario. */
function userReferencePaths(schema, prefix = '') {
  const paths = [];
  schema.eachPath((path, type) => {
    const fullPath = `${prefix}${path}`;
    if (type.schema) {
      paths.push(...userReferencePaths(type.schema, `${fullPath}.`));
      return;
    }
    const target = type.caster || type;
    const isObjectId = target.instance === 'ObjectId';
    const leaf = path.split('.').pop();
    if (target.options?.ref === 'User' || (isObjectId && USER_REFERENCE_FIELDS.has(leaf))) {
      paths.push(fullPath);
    }
  });
  return paths;
}

/**
 * Repositorio de USUARIOS.
 * requireTenant=false porque authenticate() busca por _id partiendo de un
 * token YA verificado (el Super Admin de plataforma tiene companyId null).
 * El SCOPE por empresa se impone SIEMPRE en el service a partir del token
 * (nunca del request del cliente).
 *
 * passwordHash tiene select:false: sólo se pide explícitamente en login.
 */
class UserRepository extends BaseRepository {
  constructor() {
    super(User, { requireTenant: false });
  }

  /** Login: único punto donde se solicita el hash. */
  async findByEmail(email) {
    return this.model.findOne({ email }).select('+passwordHash').lean();
  }

  async findByResetTokenHash(resetPasswordTokenHash) {
    return this.model
      .findOne({ resetPasswordTokenHash })
      .select('+resetPasswordTokenHash +resetPasswordExpiresAt')
      .lean()
      .exec();
  }

  async findActiveByRoleIds(companyId, roleIds) {
    if (!companyId || roleIds.length === 0) return [];
    return this.model
      .find({ companyId, status: 'active', roleId: { $in: roleIds } })
      .select('email name lastName')
      .lean()
      .exec();
  }

  async resetPasswordByTokenHash(resetPasswordTokenHash, passwordHash, now) {
    return this.model
      .findOneAndUpdate(
        {
          resetPasswordTokenHash,
          resetPasswordExpiresAt: { $gt: now },
          status: { $in: ['active', 'locked'] },
        },
        {
          $set: {
            passwordHash,
            status: 'active',
            failedLoginAttempts: 0,
            resetPasswordTokenHash: null,
            resetPasswordExpiresAt: null,
          },
          $inc: { tokenVersion: 1 },
        },
        { new: true, runValidators: true }
      )
      .select('email name lastName companyId')
      .lean()
      .exec();
  }

  async countByBranch(branchId) {
    return this.model.countDocuments({ branchId });
  }

  async countByRole(roleId) {
    return this.model.countDocuments({ roleId });
  }

  async approvePending(id, companyId, data) {
    return this.model
      .findOneAndUpdate(
        { _id: id, companyId, status: 'pending' },
        { $set: data, $inc: { tokenVersion: 1 } },
        { new: true, runValidators: true }
      )
      .lean()
      .exec();
  }

  async deletePending(id, companyId) {
    return this.model
      .findOneAndDelete({ _id: id, companyId, status: 'pending' })
      .lean()
      .exec();
  }

  async reactivateInactive(id, companyId) {
    return this.model
      .findOneAndUpdate(
        { _id: id, companyId, status: 'inactive' },
        { $set: { status: 'active', failedLoginAttempts: 0 } },
        { new: true, runValidators: true }
      )
      .lean()
      .exec();
  }

  /**
   * ¿El usuario es autor/responsable de documentos de negocio o actor de acciones
   * exitosas sobre ellos? Los eventos de sesión y de su propia cuenta no cuentan.
   * Recorre todos los modelos registrados para no depender de una lista fija.
   */
  async hasRelatedRecords(userId) {
    const id = new mongoose.Types.ObjectId(String(userId));
    const AuditLog = mongoose.models.AuditLog;
    if (
      AuditLog &&
      (await AuditLog.exists({
        userId: id,
        result: 'SUCCESS',
        module: { $nin: NON_BUSINESS_AUDIT_MODULES },
      }))
    ) {
      return true;
    }
    for (const name of mongoose.modelNames()) {
      if (IGNORED_MODELS.has(name)) continue;
      const model = mongoose.model(name);
      const paths = userReferencePaths(model.schema);
      if (paths.length === 0) continue;
      const found = await model.exists({ $or: paths.map((path) => ({ [path]: id })) });
      if (found) return true;
    }
    return false;
  }

  async deleteInactive(id, companyId) {
    const deleted = await this.model
      .findOneAndDelete({ _id: id, companyId, status: 'inactive' })
      .lean()
      .exec();
    if (deleted && mongoose.models.Session) {
      await mongoose.models.Session.deleteMany({ userId: deleted._id }).exec();
    }
    return deleted;
  }

  /** Usuarios activos con alguno de los roles administrativos indicados. */
  async countActiveAdmins(companyId, adminRoleIds) {
    if (!companyId) return 0;
    return this.model.countDocuments({
      companyId,
      status: 'active',
      roleId: { $in: adminRoleIds },
    });
  }

  /** Control de fuerza bruta: incrementa intentos fallidos de login. */
  async bumpFailedAttempts(id) {
    return this.model.updateOne({ _id: id }, { $inc: { failedLoginAttempts: 1 } }).exec();
  }

  /** Login correcto: limpia contadores y marca último acceso. */
  async resetLoginFailures(id) {
    return this.model
      .updateOne({ _id: id }, { $set: { failedLoginAttempts: 0, lastLoginAt: new Date() } })
      .exec();
  }

  /** Logout global / revocación: invalida todos los refresh tokens emitidos. */
  async bumpTokenVersion(id) {
    return this.model.updateOne({ _id: id }, { $inc: { tokenVersion: 1 } }).exec();
  }
}

module.exports = new UserRepository();
