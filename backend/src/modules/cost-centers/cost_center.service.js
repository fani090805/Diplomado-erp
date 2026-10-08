'use strict';

const repo = require('./cost_center.repository');
const projectService = require('../projects/project.service');
const ApiError = require('../../utils/ApiError');
const { parsePagination, buildMeta } = require('../../utils/pagination');
const { searchFilterMulti } = require('../../utils/search');

class CostCenterService {
  async list(companyId, query) {
    const { page, limit, skip, sort } = parsePagination(query);
    const filter = {
      companyId,
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...searchFilterMulti(['code', 'name'], query.search),
    };
    const { items, total } = await repo.find(filter, { sort, skip, limit });
    return { items, meta: buildMeta(page, limit, total) };
  }

  async getById(companyId, id) {
    const item = await repo.findById(id, { companyId });
    if (!item) throw ApiError.notFound('Centro de costo no encontrado.');
    return item;
  }

  async create(companyId, payload) {
    // La obra debe ser de la misma empresa (una ajena responde 404).
    await projectService.getById(companyId, payload.projectId);
    const existing = await repo.findByCode(companyId, payload.projectId, payload.code);
    if (existing) throw ApiError.conflict(`Ya existe un centro de costo con el código "${payload.code}" en esta obra.`);

    return repo.create({
      companyId,
      ...payload,
      code: payload.code.toUpperCase(),
    });
  }

  async update(companyId, id, payload) {
    const current = await this.getById(companyId, id);
    if (payload.projectId) await projectService.getById(companyId, payload.projectId);
    const targetProject = payload.projectId || current.projectId;
    if (payload.code && payload.code.toUpperCase() !== current.code) {
      const dup = await repo.findByCode(companyId, targetProject, payload.code);
      if (dup) throw ApiError.conflict(`Ya existe otro centro de costo con el código "${payload.code}" en esta obra.`);
    }

    const updated = await repo.updateById(
      id,
      { ...payload, ...(payload.code ? { code: payload.code.toUpperCase() } : {}) },
      { companyId },
    );
    if (!updated) throw ApiError.notFound('Centro de costo no encontrado.');
    return updated;
  }

  async remove(companyId, id) {
    await this.getById(companyId, id);
    return repo.deleteById(id, { companyId });
  }
}

module.exports = new CostCenterService();
