'use strict';

const asyncHandler = require('../../utils/asyncHandler');
const service = require('./project.service');

// companyId SIEMPRE del token (req.user), nunca del body ni la query.
exports.list = asyncHandler(async (req, res) => {
  const result = await service.list(req.user.companyId, req.query);
  res.json({ success: true, data: result.items, meta: result.meta });
});

exports.getById = asyncHandler(async (req, res) => {
  const item = await service.getById(req.user.companyId, req.params.id);
  res.json({ success: true, data: item });
});

exports.create = asyncHandler(async (req, res) => {
  const created = await service.create(req.user.companyId, req.body);
  res.status(201).json({ success: true, data: created });
});

exports.update = asyncHandler(async (req, res) => {
  const updated = await service.update(req.user.companyId, req.params.id, req.body);
  res.json({ success: true, data: updated });
});

exports.remove = asyncHandler(async (req, res) => {
  await service.remove(req.user.companyId, req.params.id);
  res.json({ success: true, data: { message: 'Obra eliminada exitosamente.' } });
});
