'use strict';

const BaseRepository = require('../../common/BaseRepository');
const CompanyRequest = require('./company_request.model');

/**
 * Repositorio de SOLICITUDES DE EMPRESA.
 * requireTenant=false: la solicitud es previa a la empresa (entidad de plataforma).
 * applicant.passwordHash tiene select:false: sólo se pide en login y aprobación.
 */
class CompanyRequestRepository extends BaseRepository {
  constructor() {
    super(CompanyRequest, { requireTenant: false });
  }

  async findPendingByEmail(email, { withPasswordHash = false } = {}) {
    const query = this.model.findOne({ 'applicant.email': email, status: 'pending' });
    if (withPasswordHash) query.select('+applicant.passwordHash');
    return query.lean().exec();
  }

  async findByIdWithPasswordHash(id) {
    return this.model.findById(id).select('+applicant.passwordHash').lean().exec();
  }

  /**
   * Cierra la revisión de forma atómica: sólo si sigue 'pending'.
   * Elimina el hash de la contraseña. Devuelve null si alguien la revisó antes.
   */
  async markReviewed(id, data) {
    return this.model
      .findOneAndUpdate(
        { _id: id, status: 'pending' },
        { $set: data, $unset: { 'applicant.passwordHash': 1 } },
        { new: true, runValidators: true }
      )
      .lean()
      .exec();
  }
}

module.exports = new CompanyRequestRepository();
