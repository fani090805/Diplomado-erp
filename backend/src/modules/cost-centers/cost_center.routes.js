'use strict';

const { Router } = require('express');
const { authenticate } = require('../../middlewares/authenticate');
const { authorize, requireTenant } = require('../../middlewares/authorize');
const validate = require('../../middlewares/validate');
const controller = require('./cost_center.controller');
const schemas = require('./cost_center.validation');

const router = Router();

router.use(authenticate, requireTenant);

router.get('/', authorize('projects.read'), validate({ query: schemas.listQuery }), controller.list);
router.post('/', authorize('projects.create'), validate({ body: schemas.createSchema }), controller.create);
router.get('/:id', authorize('projects.read'), validate({ params: schemas.idParams }), controller.getById);
router.patch('/:id', authorize('projects.update'), validate({ params: schemas.idParams, body: schemas.updateSchema }), controller.update);
router.delete('/:id', authorize('projects.delete'), validate({ params: schemas.idParams }), controller.remove);

module.exports = router;
