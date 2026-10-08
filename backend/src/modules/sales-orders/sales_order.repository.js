'use strict';

const BaseRepository = require('../../common/BaseRepository');
const SalesOrder = require('./sales_order.model');

/** Repositorio de pedidos de venta — tenant: companyId obligatorio. */
class SalesOrderRepository extends BaseRepository {
  constructor() {
    super(SalesOrder, { requireTenant: true });
  }

  async findByCode(companyId, code) {
    this._guard({ companyId });
    return this.model.findOne({ companyId, code }).lean();
  }

  async productIdsWithHistory(companyId, productIds) {
    this._guard({ companyId });
    if (!productIds.length) return [];
    return this.model.distinct('lines.productId', {
      companyId,
      'lines.productId': { $in: productIds },
    });
  }
}

module.exports = new SalesOrderRepository();
