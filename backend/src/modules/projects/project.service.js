'use strict';

const repo = require('./project.repository');
const ApiError = require('../../utils/ApiError');
const { parsePagination, buildMeta } = require('../../utils/pagination');
const { searchFilterMulti } = require('../../utils/search');

class ProjectService {
  async list(companyId, query) {
    const { page, limit, skip, sort } = parsePagination(query);
    const filter = {
      companyId,
      ...(query.status ? { status: query.status } : {}),
      ...searchFilterMulti(['code', 'name', 'location', 'managerName'], query.search),
    };
    const { items, total } = await repo.find(filter, { sort, skip, limit });
    return { items, meta: buildMeta(page, limit, total) };
  }

  async getById(companyId, id) {
    const project = await repo.findById(id, { companyId });
    if (!project) throw ApiError.notFound('Obra no encontrada.');
    return project;
  }

  async create(companyId, payload) {
    const existing = await repo.findByCode(companyId, payload.code);
    if (existing) throw ApiError.conflict(`Ya existe una obra con el código "${payload.code}".`);

    return repo.create({
      companyId,
      ...payload,
      code: payload.code.toUpperCase(),
    });
  }

  async update(companyId, id, payload) {
    const current = await this.getById(companyId, id);
    if (payload.code && payload.code.toUpperCase() !== current.code) {
      const dup = await repo.findByCode(companyId, payload.code);
      if (dup) throw ApiError.conflict(`Ya existe otra obra con el código "${payload.code}".`);
    }

    const updated = await repo.updateById(
      id,
      { ...payload, ...(payload.code ? { code: payload.code.toUpperCase() } : {}) },
      { companyId },
    );
    if (!updated) throw ApiError.notFound('Obra no encontrada.');
    return updated;
  }

  async remove(companyId, id) {
    await this.getById(companyId, id);
    return repo.deleteById(id, { companyId });
  }
}

module.exports = new ProjectService();
