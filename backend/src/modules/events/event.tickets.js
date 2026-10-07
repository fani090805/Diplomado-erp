'use strict';

const crypto = require('crypto');

/**
 * Boletos de UN SOLO USO para abrir el stream SSE.
 *
 * EventSource (navegador) no puede mandar el header Authorization, y el JWT no
 * debe viajar en la URL (queda en logs). Por eso: POST /events/ticket con el
 * JWT normal devuelve un boleto aleatorio válido 60 s, y GET /events/stream?ticket=
 * lo canjea una vez. Guarda una COPIA del contexto del usuario (empresa,
 * permisos) para filtrar los eventos de esa conexión.
 */
const TTL_MS = 60 * 1000;
const tickets = new Map();

function purgeExpired(now = Date.now()) {
  for (const [key, value] of tickets) if (value.expiresAt <= now) tickets.delete(key);
}

function issue(user) {
  purgeExpired();
  const ticket = crypto.randomBytes(24).toString('hex');
  tickets.set(ticket, {
    expiresAt: Date.now() + TTL_MS,
    user: {
      id: String(user.id),
      companyId: user.companyId ? String(user.companyId) : null,
      permissions: [...(user.permissions || [])],
      isPlatformAdmin: Boolean(user.isPlatformAdmin),
    },
  });
  return { ticket, expiresInSeconds: TTL_MS / 1000 };
}

/** Canjea el boleto: devuelve el usuario o null (inexistente, usado o vencido). */
function redeem(ticket) {
  if (typeof ticket !== 'string' || !ticket) return null;
  const entry = tickets.get(ticket);
  tickets.delete(ticket); // un solo uso, aunque esté vencido
  if (!entry || entry.expiresAt <= Date.now()) return null;
  return entry.user;
}

module.exports = { issue, redeem, TTL_MS, _tickets: tickets };
