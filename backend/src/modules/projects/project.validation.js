'use strict';

const { z } = require('zod');
const { objectId, paginationQuery } = require('../../utils/validators');

const STATUS_ENUM = ['PLANEADA', 'EN_PROCESO', 'PAUSADA', 'FINALIZADA', 'CANCELADA'];

const createSchema = z
  .object({
    code: z.string().trim().min(2).max(30).regex(/^[A-Za-z0-9_-]+$/),
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(500).optional(),
    location: z.string().trim().max(200).optional(),
    customerId: objectId.optional().nullable(),
    budget: z.number().min(0).default(0),
    executedAmount: z.number().min(0).default(0),
    status: z.enum(STATUS_ENUM).optional().default('PLANEADA'),
    startDate: z.coerce.date().optional().nullable(),
    estimatedEndDate: z.coerce.date().optional().nullable(),
    actualEndDate: z.coerce.date().optional().nullable(),
    managerName: z.string().trim().max(100).optional(),
  })
  .strict();

const updateSchema = createSchema.partial().strict().refine((body) => Object.keys(body).length > 0, {
  message: 'Debe indicar al menos un campo a actualizar.',
});

const idParams = z.object({ id: objectId });

const listQuery = paginationQuery.extend({
  status: z.enum(STATUS_ENUM).optional(),
  search: z.string().trim().max(100).optional(),
});

module.exports = { createSchema, updateSchema, idParams, listQuery };
