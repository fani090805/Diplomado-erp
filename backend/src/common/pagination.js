'use strict';

const { MAX_LIMIT } = require('../utils/pagination');

/** Analiza la paginación y limita los campos de ordenamiento permitidos. */
function parsePagination(query = {}, options = {}) {
  const {
    whitelist = [],
    defaultSortBy = 'createdAt',
    defaultSortDir = 'desc',
  } = options;

  const parsedPage = Number.parseInt(query.page, 10);
  const page = Math.max(1, Number.isNaN(parsedPage) ? 1 : parsedPage);
  const parsedLimit = Number.parseInt(query.limit, 10);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number.isNaN(parsedLimit) ? 20 : parsedLimit)
  );
  const skip = (page - 1) * limit;
  const sortBy = whitelist.includes(query.sortBy) ? query.sortBy : defaultSortBy;
  const sortDir = ['asc', 'desc'].includes(query.sortDir) ? query.sortDir : defaultSortDir;

  return { page, limit, skip, sortBy, sortDir };
}

/** Construye metadatos de paginación con al menos una página. */
function buildMeta(total, page, limit) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

module.exports = { parsePagination, buildMeta };