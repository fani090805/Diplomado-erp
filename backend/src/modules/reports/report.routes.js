'use strict';

const { Router } = require('express');
const { authenticate } = require('../../middlewares/authenticate');
const { authorize, requireTenant } = require('../../middlewares/authorize');
const validate = require('../../middlewares/validate');
const controller = require('./report.controller');
const schemas = require('./report.validation');

const router = Router();

// Sólo lectura: todos exigen authenticate + tenant + reports.read.
// El export CSV exige además reports.export.

router.get(
  '/kpis',
  authenticate,
  requireTenant,
  authorize('reports.read'),
  validate({ query: schemas.rangeQuery }),
  controller.kpis
);

router.get(
  '/sales',
  authenticate,
  requireTenant,
  authorize('reports.read'),
  validate({ query: schemas.seriesQuery }),
  controller.sales
);

// Exportación de ventas (PDF / Excel). La query se valida en el controlador
// para responder 400 (no 422) con filtros inválidos.
router.get(
  '/sales/export',
  authenticate,
  requireTenant,
  authorize('reports.read'),
  controller.exportSales
);

router.get(
  '/purchases',
  authenticate,
  requireTenant,
  authorize('reports.read'),
  validate({ query: schemas.seriesQuery }),
  controller.purchases
);

router.get(
  '/inventory',
  authenticate,
  requireTenant,
  authorize('reports.read'),
  controller.inventory
);

router.get(
  '/finance/export',
  authenticate,
  requireTenant,
  authorize('reports.export'),
  validate({ query: schemas.rangeQuery }),
  controller.exportCsv
);

router.get(
  '/finance',
  authenticate,
  requireTenant,
  authorize('reports.read'),
  validate({ query: schemas.financeQuery }),
  controller.finance
);

router.get(
  '/budgets',
  authenticate,
  requireTenant,
  authorize('reports.read'),
  validate({ query: schemas.budgetsQuery }),
  controller.budgets
);

module.exports = router;
