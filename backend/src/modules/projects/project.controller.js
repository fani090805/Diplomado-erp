'use strict';

const service = require('./project.service');

exports.list = async (req, res) => {
  const result = await service.list(req.companyId, req.query);
  res.json({ success: true, data: result.items, meta: result.meta });
};

exports.getById = async (req, res) => {
  const item = await service.getById(req.companyId, req.params.id);
  res.json({ success: true, data: item });
};

exports.create = async (req, res) => {
  const created = await service.create(req.companyId, req.body);
  res.status(201).json({ success: true, data: created });
};

exports.update = async (req, res) => {
  const updated = await service.update(req.companyId, req.params.id, req.body);
  res.json({ success: true, data: updated });
};

exports.remove = async (req, res) => {
  await service.remove(req.companyId, req.params.id);
  res.json({ success: true, data: { message: 'Obra eliminada exitosamente.' } });
};
