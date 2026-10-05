'use strict';

const companyRequestService = require('./company_request.service');
const { ok, created } = require('../../utils/response');
const { parsePagination, buildMeta } = require('../../utils/pagination');
const asyncHandler = require('../../utils/asyncHandler');

/**
 * Controlador del panel de PLATAFORMA (Super Admin): solicitudes de alta y
 * administración de empresas. Sin lógica de negocio.
 */

function auditMeta(req) {
  return { ip: req.ip, userAgent: req.headers['user-agent'] };
}

const listRequests = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = parsePagination(req.query);
  const { items, total } = await companyRequestService.list(req.query, { sort, skip, limit });
  return ok(res, items, buildMeta(page, limit, total));
});

const approveRequest = asyncHandler(async (req, res) => {
  const data = await companyRequestService.approve(req.params.id, req.user, auditMeta(req));
  req.auditResourceId = String(data.company._id);
  return ok(res, data);
});

const rejectRequest = asyncHandler(async (req, res) => {
  const data = await companyRequestService.reject(req.params.id, req.body, req.user, auditMeta(req));
  return ok(res, data);
});

const listCompanies = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = parsePagination(req.query);
  const { items, total } = await companyRequestService.listCompanies(req.query, {
    sort,
    skip,
    limit,
  });
  return ok(res, items, buildMeta(page, limit, total));
});

const createCompany = asyncHandler(async (req, res) => {
  const data = await companyRequestService.createCompany(req.body, req.user, auditMeta(req));
  req.auditResourceId = String(data._id);
  return created(res, data);
});

const updateCompanyStatus = asyncHandler(async (req, res) => {
  const data = await companyRequestService.setCompanyStatus(
    req.params.id,
    req.body.status,
    req.user,
    auditMeta(req)
  );
  return ok(res, data);
});

module.exports = {
  listRequests,
  approveRequest,
  rejectRequest,
  listCompanies,
  createCompany,
  updateCompanyStatus,
};
