'use strict';

const { Router } = require('express');
const { authenticate } = require('../../middlewares/authenticate');
const { ok } = require('../../utils/response');
const env = require('../../config/env');
const { STATUSES, MODULES } = require('./meta.catalog');

/**
 * GET /api/v1/meta — configuración compartida web/Android (autenticado).
 * Devuelve TODOS los módulos con su permiso: cada cliente filtra con los
 * permisos del usuario (la API sigue validando cada endpoint).
 */
const router = Router();

router.get('/', authenticate, (req, res) =>
  ok(res, {
    statuses: STATUSES,
    modules: MODULES,
    currency: 'MXN',
    locale: 'es-MX',
    minAndroidVersionCode: env.minAndroidVersionCode,
  })
);

module.exports = router;
