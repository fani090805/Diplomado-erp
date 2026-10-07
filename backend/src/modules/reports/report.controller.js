'use strict';

const { ok } = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');
const ApiError = require('../../utils/ApiError');
const logger = require('../../config/logger');
const reportService = require('./report.service');
const salesExportService = require('./report.sales-export.service');
const { salesExportQuery } = require('./report.validation');

/** Rango {from,to} ya validado/coercido por zod (query). */
const range = (req) => ({ from: req.query.from, to: req.query.to });

const kpis = asyncHandler(async (req, res) => {
  const data = await reportService.kpis(req.user.companyId, range(req));
  return ok(res, data);
});

const sales = asyncHandler(async (req, res) => {
  const data = await reportService.salesReport(req.user.companyId, range(req), req.query.groupBy);
  return ok(res, data);
});

const purchases = asyncHandler(async (req, res) => {
  const data = await reportService.purchasesReport(req.user.companyId, range(req), req.query.groupBy);
  return ok(res, data);
});

const inventory = asyncHandler(async (req, res) => {
  const data = await reportService.inventoryReport(req.user.companyId);
  return ok(res, data);
});

const finance = asyncHandler(async (req, res) => {
  const data = await reportService.financeReport(req.user.companyId, {
    year: req.query.year,
    month: req.query.month,
    from: req.query.from,
    to: req.query.to,
  });
  return ok(res, data);
});

const budgets = asyncHandler(async (req, res) => {
  const data = await reportService.budgetsReport(req.user.companyId, {
    year: req.query.year,
    month: req.query.month,
  });
  return ok(res, data);
});

const exportCsv = asyncHandler(async (req, res) => {
  const { filename, csv } = await reportService.financeExportCsv(req.user.companyId, range(req));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(csv);
});

/**
 * Ventas a PDF / Excel en streaming. Filtros inválidos ⇒ 400 (no 422): se
 * valida aquí para responder JSON antes de enviar las cabeceras del archivo.
 */
const exportSales = asyncHandler(async (req, res) => {
  const parsed = salesExportQuery.safeParse(req.query);
  if (!parsed.success) {
    throw ApiError.badRequest(
      'Los filtros del reporte no son válidos.',
      parsed.error.issues.map((i) => ({ field: i.path.join('.') || 'query', message: i.message }))
    );
  }
  const ctx = await salesExportService.prepare(req.user.companyId, parsed.data);

  res.status(200);
  res.setHeader('Content-Type', ctx.contentType);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${ctx.filename}"; filename*=UTF-8''${encodeURIComponent(ctx.filename)}`
  );
  // El navegador sólo deja leer Content-Disposition (nombre del archivo) si se expone.
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
  res.setHeader('Cache-Control', 'no-store');

  try {
    await salesExportService.write(ctx, res);
  } catch (err) {
    // Las cabeceras ya salieron: sólo queda cortar la descarga.
    logger.error({ err }, 'Falló la exportación de ventas');
    res.destroy(err);
  }
});

module.exports = { kpis, sales, purchases, inventory, finance, budgets, exportCsv, exportSales };
