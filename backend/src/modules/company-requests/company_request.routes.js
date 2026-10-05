'use strict';

const { Router } = require('express');
const controller = require('./company_request.controller');
const { authenticate } = require('../../middlewares/authenticate');
const { platformOnly } = require('../../middlewares/authorize');
const validate = require('../../middlewares/validate');
const schemas = require('./company_request.validation');

const router = Router();

/**
 * Panel de PLATAFORMA (montado en /api/v1/platform). Sólo Super Admin.
 *
 * GET   /company-requests?status=pending|approved|rejected  — solicitudes (paginado)
 * POST  /company-requests/:id/approve                       — crea empresa + administrador
 * POST  /company-requests/:id/reject                        — rechaza con motivo opcional
 * GET   /companies                                          — empresas + usuarios activos
 * POST  /companies                                          — alta directa con administrador
 * PATCH /companies/:id/status                               — suspender / reactivar
 *
 * La solicitud pública vive en POST /api/v1/auth/register-company.
 */
router.use(authenticate, platformOnly);

router.get(
  '/company-requests',
  validate({ query: schemas.listRequestsQuery }),
  controller.listRequests
);

router.post(
  '/company-requests/:id/approve',
  validate({ params: schemas.idParams }),
  controller.approveRequest
);

router.post(
  '/company-requests/:id/reject',
  validate({ params: schemas.idParams, body: schemas.rejectSchema }),
  controller.rejectRequest
);

router.get('/companies', validate({ query: schemas.listCompaniesQuery }), controller.listCompanies);

router.post(
  '/companies',
  validate({ body: schemas.companyWithAdminSchema }),
  controller.createCompany
);

router.patch(
  '/companies/:id/status',
  validate({ params: schemas.idParams, body: schemas.companyStatusSchema }),
  controller.updateCompanyStatus
);

module.exports = router;
