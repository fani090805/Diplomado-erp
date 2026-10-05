'use strict';

const { Router } = require('express');
const controller = require('./user.controller');
const { authenticate } = require('../../middlewares/authenticate');
const { authorize, requireTenant } = require('../../middlewares/authorize');
const validate = require('../../middlewares/validate');
const preventUnknownFields = require('../../middlewares/preventUnknownFields');
const schemas = require('./user.validation');

const router = Router();

/**
 * Usuarios (dentro de una empresa).
 *
 * GET    /api/v1/users      — listado (users.read; scope = token)
 * POST   /api/v1/users      — crear (users.create; Super Admin puede indicar companyId)
 * GET    /api/v1/users/:id  — detalle (users.read)
 * PATCH  /api/v1/users/:id  — editar (users.update; auto-protección + anti-escalada)
 * PATCH  /api/v1/users/:id/deactivate — baja lógica + revoca sesiones (users.update)
 * PATCH  /api/v1/users/:id/reactivate — reactiva un inactivo (users.update)
 * DELETE /api/v1/users/:id/permanent  — borrado físico de inactivos sin historial (users.delete)
 * DELETE /api/v1/users/:id  — legado: igual que deactivate (users.delete)
 */

router.get(
  '/',
  authenticate,
  authorize('users.read'),
  validate({ query: schemas.listQuery }),
  controller.list
);

router.patch(
  '/:id/approve',
  authenticate,
  requireTenant,
  authorize('users.update'),
  validate({ params: schemas.idParams, body: schemas.approveSchema }),
  controller.approve
);

router.post(
  '/:id/reject',
  authenticate,
  requireTenant,
  authorize('users.update'),
  validate({ params: schemas.idParams }),
  controller.reject
);

router.post(
  '/',
  authenticate,
  authorize('users.create'),
  preventUnknownFields(schemas.CREATE_FIELDS),
  validate({ body: schemas.createSchema }),
  controller.create
);

router.get(
  '/:id',
  authenticate,
  authorize('users.read'),
  validate({ params: schemas.idParams }),
  controller.getById
);

router.patch(
  '/:id',
  authenticate,
  authorize('users.update'),
  preventUnknownFields(schemas.CREATE_FIELDS),
  validate({ params: schemas.idParams, body: schemas.updateSchema }),
  controller.update
);

router.patch(
  '/:id/deactivate',
  authenticate,
  authorize('users.update'),
  validate({ params: schemas.idParams }),
  controller.deactivate
);

router.patch(
  '/:id/reactivate',
  authenticate,
  authorize('users.update'),
  validate({ params: schemas.idParams }),
  controller.reactivate
);

router.delete(
  '/:id/permanent',
  authenticate,
  authorize('users.delete'),
  validate({ params: schemas.idParams }),
  controller.removePermanently
);

router.delete(
  '/:id',
  authenticate,
  authorize('users.delete'),
  validate({ params: schemas.idParams }),
  controller.remove
);

module.exports = router;
