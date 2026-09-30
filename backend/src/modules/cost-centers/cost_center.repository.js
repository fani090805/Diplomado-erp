'use strict';

const BaseRepository = require('../../common/base.repository');
const CostCenter = require('./cost_center.model');

class CostCenterRepository extends BaseRepository {
  constructor() {
    super(CostCenter, { requireTenant: true });
  }

  async findByCode(companyId, projectId, code) {
    if (!companyId) throw new Error('CostCenterRepository.findByCode requiere companyId.');
    return this.model.findOne({ companyId, projectId, code: code.toUpperCase() }).lean();
  }
}

module.exports = new CostCenterRepository();
