'use strict';

const { ok } = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');
const ApiError = require('../../utils/ApiError');
const tickets = require('./event.tickets');
const bus = require('./event.bus');

/** Cada cuánto se manda un comentario SSE para que Render no corte la conexión. */
const settings = { heartbeatMs: 25 * 1000 };

/** POST /events/ticket — con el JWT normal; devuelve un boleto de 60 s y un solo uso. */
const ticket = asyncHandler(async (req, res) => ok(res, tickets.issue(req.user)));

/**
 * GET /events/stream?ticket=… — Server-Sent Events.
 * Sólo entrega eventos de la empresa del usuario (o de plataforma si es Super
 * Admin) para los que su rol tiene permiso de lectura.
 */
function stream(req, res, next) {
  const user = tickets.redeem(req.query.ticket);
  if (!user) return next(ApiError.unauthorized('El boleto del canal en vivo no es válido o ya venció.', 'INVALID_TICKET'));

  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // sin buffer en proxies
  res.flushHeaders?.();
  req.socket?.setTimeout?.(0);

  let seq = 0;
  // `retry`: espera sugerida al navegador antes de reconectar.
  res.write(`retry: 5000\n: conectado\n\n`);

  const unsubscribe = bus.subscribe((event) => {
    if (!bus.canReceive(user, event)) return;
    seq += 1;
    res.write(`id: ${seq}\ndata: ${JSON.stringify(event.payload)}\n\n`);
  });
  const heartbeat = setInterval(() => res.write(`: ping ${Date.now()}\n\n`), settings.heartbeatMs);

  const cleanup = () => {
    clearInterval(heartbeat);
    unsubscribe();
  };
  req.on('close', cleanup);
  res.on('error', cleanup);
  return undefined;
}

module.exports = { ticket, stream, settings };
