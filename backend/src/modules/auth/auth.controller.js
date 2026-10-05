'use strict';

const authService = require('./auth.service');
const { ok, created } = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');

/** Metadatos de auditoría (IP y agente) comunes a todas las operaciones. */
function auditMeta(req) {
  return { ip: req.ip, userAgent: req.headers['user-agent'] };
}

const login = asyncHandler(async (req, res) => {
  const data = await authService.login(req.body, auditMeta(req));
  return ok(res, data);
});

const register = asyncHandler(async (req, res) => {
  const data = await authService.register(req.body, auditMeta(req));
  return created(res, data);
});

const forgotPassword = asyncHandler(async (req, res) => {
  const data = await authService.forgotPassword(req.body, auditMeta(req));
  return ok(res, data);
});

const resetPassword = asyncHandler(async (req, res) => {
  const data = await authService.resetPassword(req.body, auditMeta(req));
  return ok(res, data);
});

const refresh = asyncHandler(async (req, res) => {
  const data = await authService.refresh(req.body);
  return ok(res, data);
});

const logout = asyncHandler(async (req, res) => {
  const data = await authService.logout(req.user, auditMeta(req));
  return ok(res, data);
});

const me = asyncHandler(async (req, res) => {
  const data = await authService.me(req.user);
  return ok(res, data);
});

const changePassword = asyncHandler(async (req, res) => {
  const data = await authService.changePassword(req.user, req.body, auditMeta(req));
  return ok(res, data);
});

module.exports = {
  login,
  register,
  forgotPassword,
  resetPassword,
  refresh,
  logout,
  me,
  changePassword,
};
