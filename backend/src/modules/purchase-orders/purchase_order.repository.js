'use strict';

const BaseRepository = require('../../common/BaseRepository');
const PurchaseOrder = require('./purchase_order.model');

/** Repositorio de órdenes de compra — tenant: companyId obligatorio. */
class PurchaseOrderRepository extends BaseRepository {
  constructor() {
    super(PurchaseOrder, { requireTenant: true });
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

module.exports = new PurchaseOrderRepository();
