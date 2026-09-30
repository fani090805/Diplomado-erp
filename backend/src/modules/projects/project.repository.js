'use strict';

const BaseRepository = require('../../common/base.repository');
const Project = require('./project.model');

class ProjectRepository extends BaseRepository {
  constructor() {
    super(Project, { requireTenant: true });
  }

  async findByCode(companyId, code) {
    if (!companyId) throw new Error('ProjectRepository.findByCode requiere companyId.');
    return this.model.findOne({ companyId, code: code.toUpperCase() }).lean();
  }
}

module.exports = new ProjectRepository();
