'use strict';

/**
 * Paginación consistente: ?page=1&limit=20  (limit máximo 100)
 */
const MAX_LIMIT = 100;

function parsePagination(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  // `|| 20` trataría limit='0' como ausente (0 es falsy): se separa NaN del resto.
  const parsedLimit = parseInt(query.limit, 10);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number.isNaN(parsedLimit) ? 20 : parsedLimit));
  const skip = (page - 1) * limit;

  const sort = {};
  if (query.sortBy) {
    const dir = query.sortDir === 'desc' ? -1 : 1;
    // Whitelist implícito: solo campos alfanuméricos/underscore.
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(query.sortBy)) sort[query.sortBy] = dir;
  }
  if (Object.keys(sort).length === 0) sort.createdAt = -1;

  return { page, limit, skip, sort };
}

/**
 * Desempate estable para documentos con folio: si el orden es sólo por
 * fecha, agrega `code` en la misma dirección (varias órdenes pueden tener la
 * misma fecha exacta y saldrían "revueltas").
 */
function withCodeTiebreak(sort = {}) {
  const keys = Object.keys(sort);
  if (keys.length === 1 && keys[0] === 'createdAt') return { createdAt: sort.createdAt, code: sort.createdAt };
  return sort;
}

function buildMeta(page, limit, total) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

module.exports = { parsePagination, buildMeta, withCodeTiebreak, MAX_LIMIT };
