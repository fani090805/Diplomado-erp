'use strict';

const { publish } = require('./event.bus');
const { entityForPath, actionFor } = require('./event.catalog');
const env = require('../../config/env');

/**
 * Emite eventos en vivo tras cada ESCRITURA EXITOSA (POST/PUT/PATCH/DELETE con
 * respuesta < 400) de las entidades del catálogo. Se monta una sola vez sobre
 * /api/v1 (igual que la auditoría), así ningún servicio tiene que acordarse
 * de emitir. companyId sale del token (req.user), nunca del cliente.
 */
const OBJECT_ID = /^[a-f0-9]{24}$/i;

function relativePath(req) {
  const url = (req.originalUrl || req.url || '').split('?')[0];
  return url.startsWith(env.apiPrefix) ? url.slice(env.apiPrefix.length) : url;
}

function eventsMiddleware(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const path = relativePath(req);
  const match = entityForPath(path);
  if (!match) return next();

  const originalJson = res.json.bind(res);
  res.json = (payload) => {
    if (res.statusCode < 400) {
      const rest = path.slice(match.prefix.length);
      const firstSegment = rest.split('/')[1] || '';
      const id = OBJECT_ID.test(firstSegment) ? firstSegment : payload?.data?._id || payload?.data?.id || null;
      try {
        publish({ companyId: req.user?.companyId || null, entity: match.entity, id, action: actionFor(req.method, rest) });
      } catch (err) {
        req.log?.warn({ err: err.message }, 'No se pudo publicar el evento en vivo');
      }
    }
    return originalJson(payload);
  };
  return next();
}

module.exports = eventsMiddleware;
