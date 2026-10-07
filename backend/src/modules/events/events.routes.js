'use strict';

const { Router } = require('express');
const { authenticate } = require('../../middlewares/authenticate');
const controller = require('./events.controller');

/**
 * Canal de cambios en vivo.
 *  - POST /events/ticket: autenticado (JWT); también para el Super Admin, que
 *    no tiene empresa y recibe eventos de plataforma.
 *  - GET  /events/stream?ticket=…: el boleto ES la autenticación (EventSource
 *    no puede mandar headers); filtra por empresa y permisos.
 */
const router = Router();

router.post('/ticket', authenticate, controller.ticket);
router.get('/stream', controller.stream);

module.exports = router;
