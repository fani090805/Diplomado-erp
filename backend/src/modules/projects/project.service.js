'use strict';

const repo = require('./project.repository');
const ApiError = require('../../utils/ApiError');
const { parsePagination, buildMeta } = require('../../utils/pagination');

class ProjectService {
  async list(companyId, query) {
    const { page, limit, skip, sortBy, sortDir } = parsePagination(query, {
      whitelist: ['code', 'name', 'budget', 'status', 'createdAt'],
      defaultSortBy: 'createdAt',
      defaultSortDir: 'desc',
    });

    const filter = { companyId };
    if (query.status) filter.status = query.status;
    if (query.search) {
      const reg = new RegExp(query.search, 'i');
      filter.$or = [{ code: reg }, { name: reg }, { location: reg }, { managerName: reg }];
    }

    const [items, total] = await Promise.all([
      repo.find(companyId, filter, { skip, limit, sort: { [sortBy]: sortDir === 'asc' ? 1 : -1 } }),
      repo.count(companyId, filter),
    ]);

    return { items, meta: buildMeta(total, page, limit) };
  }

  async getById(companyId, id) {
    const project = await repo.findById(companyId, id);
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

    const updated = await repo.updateById(companyId, id, {
      ...payload,
      ...(payload.code ? { code: payload.code.toUpperCase() } : {}),
    });
    if (!updated) throw ApiError.notFound('Obra no encontrada.');
    return updated;
  }

  async remove(companyId, id) {
    await this.getById(companyId, id);
    return repo.deleteById(companyId, id);
  }
}

module.exports = new ProjectService();
