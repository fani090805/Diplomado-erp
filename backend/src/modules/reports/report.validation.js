'use strict';

const { z } = require('zod');
const { objectId } = require('../../utils/validators');

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

/** "" o ausente ⇒ undefined (los formularios mandan el filtro vacío). */
const optionalId = z.preprocess((v) => (v === '' ? undefined : v), objectId.optional());
const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use el formato AAAA-MM-DD.');

/**
 * Exportación de ventas (PDF / Excel). from/to son DÍAS de calendario en
 * hora de México; el rango (≤ 24 meses, días completos) lo valida el servicio.
 */
const salesExportQuery = z
  .object({
    format: z.enum(['pdf', 'xlsx'], { errorMap: () => ({ message: 'format debe ser pdf o xlsx.' }) }),
    from: ymd,
    to: ymd,
    status: z
      .enum(['APPROVED', 'DRAFT', 'REJECTED', 'all'], {
        errorMap: () => ({ message: 'status debe ser APPROVED, DRAFT, REJECTED o all.' }),
      })
      .default('APPROVED'),
    customerId: optionalId,
    productId: optionalId,
  })
  .strict();

module.exports = { rangeQuery, seriesQuery, financeQuery, budgetsQuery, salesExportQuery };
