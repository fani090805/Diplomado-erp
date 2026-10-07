'use strict';

const ApiError = require('../../utils/ApiError');
const logger = require('../../config/logger');
const { nextSequence, formatCode } = require('../../common/sequence');
const incomeRepository = require('./income.repository');
const accountService = require('../accounts/account.service');
const customerRepository = require('../customers/customer.repository');

/**
 * Servicio de INGRESOS (FASE 5) — multiempresa estricto, APPEND-ONLY.
 *
 * Reglas (ADR-011):
 *  - Crear / leer / ANULAR; sin edición ni borrado. `code` secuencial (ADR-009).
 *  - Crear: primero el documento y después sumar el saldo de la cuenta; si el
 *    saldo falla (carrera/cuenta desactivada) se ELIMINA el documento creado
 *    (compensación, mejor esfuerzo con log).
 *  - Anular: primero el marcado condicional POSTED→VOID (evita doble anulación
 *    en carrera) y después invertir el saldo; si invertir falla se revierte el
 *    marcado (compensación, mejor esfuerzo con log).
 */
const CODE_KEY = 'incomes';
const CODE_PREFIX = 'INC';

/** Categoría de los ingresos que genera una venta aprobada. */
const SALES_CATEGORY = 'Ventas';

/**
 * Datos del ingreso de una venta aprobada: total, fecha de la venta, cliente
 * y folio. También los usa el generador demo (seed-finance) para que el
 * ingreso demo sea idéntico al real.
 */
function saleIncomeFields(order, accountId) {
  return {
    amount: order.total,
    date: order.createdAt,
    category: SALES_CATEGORY,
    method: 'transfer',
    accountId,
    customerId: order.customerId,
    salesOrderId: order._id,
    reference: order.code,
    description: `Venta ${order.code}`,
  };
}

const incomeService = {
  async list(filter, options) {
    return incomeRepository.find(filter, options);
  },

  async getById(id, companyId) {
    return incomeRepository.findById(id, { companyId });
  },

  async create(data, companyId, userId) {
    const account = await accountService.loadActiveAccount(data.accountId, companyId);
    if (data.customerId) {
      const customer = await customerRepository.findById(data.customerId, { companyId });
      if (!customer) throw ApiError.notFound('Recurso no encontrado.');
    }

    const seq = await nextSequence(companyId, CODE_KEY);
    const income = await incomeRepository.create({
      companyId,
      code: formatCode(CODE_PREFIX, seq),
      amount: data.amount,
      date: data.date || new Date(),
      category: data.category,
      method: data.method || 'transfer',
      accountId: account._id,
      customerId: data.customerId || null,
      // Sólo lo envían recordSale (servidor); el body HTTP es .strict() y no lo admite.
      salesOrderId: data.salesOrderId || null,
      reference: data.reference || null,
      description: data.description || null,
      status: 'POSTED',
      createdBy: userId || null,
    });

    try {
      await accountService.applyMovement(companyId, account._id, data.amount);
    } catch (err) {
      await incomeRepository
        .deleteById(income._id, { companyId })
        .catch((delErr) =>
          logger.error({ err: delErr.message }, 'Compensación de creación de ingreso falló')
        );
      throw err;
    }

    return income;
  },

  async void(id, data, companyId, userId) {
    const income = await incomeRepository.findById(id, { companyId });
    if (!income) throw ApiError.notFound('Recurso no encontrado.');
    if (income.status === 'VOID') throw ApiError.conflict('El registro ya fue anulado.');

    // 1) Marcar VOID sólo si sigue POSTED (la carrera la pierde el segundo).
    const voided = await incomeRepository.markVoided(
      id,
      { companyId },
      { voidedBy: userId || null, voidedAt: new Date(), voidReason: data.reason }
    );
    if (!voided) throw ApiError.conflict('El registro ya fue anulado.');

    // 2) Invertir el saldo (aunque la cuenta esté inactiva: corrección contable).
    try {
      await accountService.applyMovement(companyId, income.accountId, -income.amount, {
        allowInactive: true,
      });
    } catch (err) {
      await incomeRepository
        .updateById(
          id,
          { status: 'POSTED', voidedBy: null, voidedAt: null, voidReason: null },
          { companyId }
        )
        .catch((revErr) =>
          logger.error({ err: revErr.message }, 'Reversión de anulación de ingreso falló')
        );
      throw err;
    }

    return incomeRepository.getByIdSafe(id, companyId);
  },

  /**
   * Ingreso de una venta APROBADA (cuenta VENTAS, categoría "Ventas").
   * Idempotente: si la venta ya tiene un ingreso vigente lo devuelve sin crear
   * otro; el índice único cubre además dos aprobaciones simultáneas.
   * Una venta con total 0 no genera ingreso (null).
   */
  async recordSale(order, companyId, userId) {
    if (!(order.total > 0)) return null;
    const existing = await incomeRepository.findPostedBySalesOrder(companyId, order._id);
    if (existing) return existing;
    const account = await accountService.ensureSalesAccount(companyId);
    return this.create(saleIncomeFields(order, account._id), companyId, userId);
  },

  /** Anula (y revierte en la cuenta) el ingreso vigente de una venta; null si no tiene. */
  async voidSale(salesOrderId, reason, companyId, userId) {
    const income = await incomeRepository.findPostedBySalesOrder(companyId, salesOrderId);
    if (!income) return null;
    return this.void(income._id, { reason }, companyId, userId);
  },
};

module.exports = incomeService;
module.exports.saleIncomeFields = saleIncomeFields;
module.exports.SALES_CATEGORY = SALES_CATEGORY;
