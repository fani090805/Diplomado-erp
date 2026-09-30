'use strict';

const repo = require('./cost_center.repository');
const { ConflictError, NotFoundError } = require('../../common/errors');
const { parsePagination, buildMeta } = require('../../common/pagination');

class CostCenterService {
  async list(companyId, query) {
    const { page, limit, skip, sortBy, sortDir } = parsePagination(query, {
      whitelist: ['code', 'name', 'category', 'budget', 'executedAmount', 'createdAt'],
      defaultSortBy: 'createdAt',
      defaultSortDir: 'desc',
    });

    const filter = { companyId };
    if (query.projectId) filter.projectId = query.projectId;
    if (query.category) filter.category = query.category;
    if (query.status) filter.status = query.status;
    if (query.search) {
      const reg = new RegExp(query.search, 'i');
      filter.$or = [{ code: reg }, { name: reg }];
    }

    const [items, total] = await Promise.all([
      repo.find(companyId, filter, { skip, limit, sort: { [sortBy]: sortDir === 'asc' ? 1 : -1 } }),
      repo.count(companyId, filter),
    ]);

    return { items, meta: buildMeta(total, page, limit) };
  }

  async getById(companyId, id) {
    const item = await repo.findById(companyId, id);
    if (!item) throw new NotFoundError('Centro de costo no encontrado.');
    return item;
  }

  async create(companyId, payload) {
    const existing = await repo.findByCode(companyId, payload.projectId, payload.code);
    if (existing) throw new ConflictError(`Ya existe un centro de costo con el código "${payload.code}" en esta obra.`);

    return repo.create({
      companyId,
      ...payload,
      code: payload.code.toUpperCase(),
    });
  }

  async update(companyId, id, payload) {
    const current = await this.getById(companyId, id);
    const targetProject = payload.projectId || current.projectId;
    if (payload.code && payload.code.toUpperCase() !== current.code) {
      const dup = await repo.findByCode(companyId, targetProject, payload.code);
      if (dup) throw new ConflictError(`Ya existe otro centro de costo con el código "${payload.code}" en esta obra.`);
    }

    const updated = await repo.updateById(companyId, id, {
      ...payload,
      ...(payload.code ? { code: payload.code.toUpperCase() } : {}),
    });
    if (!updated) throw new NotFoundError('Centro de costo no encontrado.');
    return updated;
  }

  async remove(companyId, id) {
    await this.getById(companyId, id);
    return repo.deleteById(companyId, id);
  }
}

module.exports = new CostCenterService();
