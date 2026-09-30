'use strict';

const { z } = require('zod');
const { objectId, paginationQuery } = require('../../utils/validators');

const CATEGORIES = ['MATERIALES', 'MANO_DE_OBRA', 'MAQUINARIA', 'FLETES', 'SUBCONTRATOS', 'INDIRECTOS'];

const createSchema = z
  .object({
    projectId: objectId,
    code: z.string().trim().min(2).max(30).regex(/^[A-Za-z0-9_-]+$/),
    name: z.string().trim().min(2).max(120),
    category: z.enum(CATEGORIES).optional().default('MATERIALES'),
    budget: z.number().min(0).default(0),
    executedAmount: z.number().min(0).default(0),
    status: z.enum(['active', 'inactive']).optional().default('active'),
  })
  .strict();

const updateSchema = createSchema.partial().strict().refine((body) => Object.keys(body).length > 0, {
  message: 'Debe indicar al menos un campo a actualizar.',
});

const idParams = z.object({ id: objectId });

const listQuery = paginationQuery.extend({
  projectId: objectId.optional(),
  category: z.enum(CATEGORIES).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  search: z.string().trim().max(100).optional(),
});

module.exports = { createSchema, updateSchema, idParams, listQuery };
