'use strict';

const { z } = require('zod');

/**
 * Consultas de reportes (FASE 5). Sólo lectura: sin body, sin id.
 * `from`/`to` son fechas coercibles; `year`/`month` acotan reportes financieros.
 */
const rangeQuery = z
  .object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .strict()
  .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: 'El rango de fechas es inválido: from debe ser anterior o igual a to.',
  });

/** Series de ventas/compras: rango + agrupación (día, semana ISO o mes). */
const seriesQuery = z
  .object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    groupBy: z
      .enum(['day', 'week', 'month'], {
        errorMap: () => ({ message: 'groupBy debe ser day, week o month.' }),
      })
      .default('month'),
  })
  .strict()
  .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: 'El rango de fechas es inválido: from debe ser anterior o igual a to.',
  });

const financeQuery = z
  .object({
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .strict()
  .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: 'El rango de fechas es inválido: from debe ser anterior o igual a to.',
  });

const budgetsQuery = z
  .object({
    year: z.coerce.number().int().min(2000).max(2100),
    month: z.coerce.number().int().min(1).max(12).optional(),
  })
  .strict();

module.exports = { rangeQuery, seriesQuery, financeQuery, budgetsQuery };
