'use strict';

const ApiError = require('../../utils/ApiError');
const productRepository = require('./product.repository');
const stockLevelRepository = require('../inventory/stock_level.repository');
const inventoryMovementRepository = require('../inventory/inventory_movement.repository');
const masterDataRepository = require('../master-data/master_data.repository');
const inventoryTraceRepository = require('../inventory/inventory_trace.repository');
const salesOrderService = require('../sales-orders/sales_order.service');
const purchaseOrderService = require('../purchase-orders/purchase_order.service');

const PRODUCT_HISTORY_MESSAGE =
  'Este producto tiene historial (existencias, movimientos o ventas). Desactívalo para que ya no se use; su historial se conserva.';

async function getHistoryFlags(productId, companyId) {
  const [hasStock, hasMovements, hasTraces, hasSales, hasPurchases] = await Promise.all([
    stockLevelRepository.hasStockForProduct(companyId, productId),
    inventoryMovementRepository.exists({ companyId, productId }),
    inventoryTraceRepository.hasRecords(companyId, productId),
    salesOrderService.hasProductHistory(productId, companyId),
    purchaseOrderService.hasProductHistory(productId, companyId),
  ]);
  return { hasStock: Boolean(hasStock), hasMovements: Boolean(hasMovements), hasTraces, hasSales, hasPurchases };
}

async function withHistory(items, companyId) {
  return Promise.all(items.map(async (item) => {
    const history = await getHistoryFlags(String(item._id), companyId);
    return { ...item, hasHistory: Object.values(history).some(Boolean) };
  }));
}

const MASTER_REFERENCES = [
  ['categoryId', 'category', 'category', 'name'],
  ['brandId', 'brand', 'brand', 'name'],
  ['unitId', 'unit', 'unit', 'symbol'],
  ['taxId', 'tax', 'taxRate', 'rate'],
];

async function resolveMasterReferences(data, companyId) {
  const result = { ...data };
  for (const [idField, type, snapshotField, masterField] of MASTER_REFERENCES) {
    if (!Object.hasOwn(data, idField)) continue;
    const master = await masterDataRepository.findById(data[idField], { companyId });
    if (!master || master.type !== type) throw ApiError.notFound('Recurso no encontrado.');
    if (master.status !== 'active') {
      throw ApiError.conflict('No se puede asignar un dato maestro inactivo.');
    }
    result[snapshotField] = master[masterField];
  }
  return result;
}

/**
 * Servicio de productos — multiempresa estricto: companyId SIEMPRE del token.
 * Un ID ajeno en la URL/body => 404 (nunca 403).
 */
const productService = {
  async list(filter, options) {
    const result = await productRepository.find(filter, options);
    return { ...result, items: await withHistory(result.items, filter.companyId) };
  },

  async getById(id, companyId) {
    return productRepository.findById(id, { companyId });
  },

  async create(data, companyId) {
    if (data.maxStock != null && data.maxStock < (data.minStock ?? 0)) {
      throw ApiError.unprocessable('Stock máximo debe ser mayor o igual al stock mínimo.');
    }
    data = await resolveMasterReferences(data, companyId);
    const sku = String(data.sku).toUpperCase();
    const existing = await productRepository.findBySku(companyId, sku);
    if (existing) {
      throw ApiError.conflict('Ya existe un registro con ese valor en: sku.', { fields: ['sku'] });
    }
    return productRepository.create({ ...data, sku, companyId });
  },

  async update(id, data, companyId) {
    const product = await productRepository.findById(id, { companyId });
    if (!product) throw ApiError.notFound('Recurso no encontrado.');

    const patch = await resolveMasterReferences(data, companyId);
    if (patch.trackingMode && patch.trackingMode !== (product.trackingMode || 'none')) {
      const [hasStock, hasMovements, hasTraces] = await Promise.all([
        stockLevelRepository.hasStockForProduct(companyId, id),
        inventoryMovementRepository.exists({ companyId, productId: id }),
        inventoryTraceRepository.hasRecords(companyId, id),
      ]);
      if (hasStock || hasMovements || hasTraces) {
        throw ApiError.conflict('No se puede cambiar la trazabilidad de un producto con historial o existencias.');
      }
    }
    const minStock = patch.minStock ?? product.minStock ?? 0;
    const maxStock = Object.hasOwn(patch, 'maxStock') ? patch.maxStock : product.maxStock;
    if (maxStock != null && maxStock < minStock) {
      throw ApiError.unprocessable('Stock máximo debe ser mayor o igual al stock mínimo.');
    }
    if (patch.sku) {
      const sku = String(patch.sku).toUpperCase();
      const existing = await productRepository.findBySku(companyId, sku);
      if (existing && String(existing._id) !== id) {
        throw ApiError.conflict('Ya existe un registro con ese valor en: sku.', { fields: ['sku'] });
      }
      patch.sku = sku;
    }

    return productRepository.updateById(id, patch, { companyId });
  },

  async deactivate(id, companyId) {
    const product = await productRepository.findById(id, { companyId });
    if (!product) throw ApiError.notFound('Recurso no encontrado.');
    return productRepository.updateById(id, { status: 'inactive' }, { companyId });
  },

  async reactivate(id, companyId) {
    const product = await productRepository.findById(id, { companyId });
    if (!product) throw ApiError.notFound('Recurso no encontrado.');
    return productRepository.updateById(id, { status: 'active' }, { companyId });
  },

  /**
   * Borrado físico sólo si el producto nunca tuvo existencias ni movimientos.
   * Si no: 409 con mensaje de acción (desactivar en su lugar).
   */
  async remove(id, companyId) {
    const product = await productRepository.findById(id, { companyId });
    if (!product) throw ApiError.notFound('Recurso no encontrado.');

    const history = await getHistoryFlags(id, companyId);
    if (Object.values(history).some(Boolean)) throw ApiError.conflict(PRODUCT_HISTORY_MESSAGE);

    return productRepository.deleteById(id, { companyId });
  },

  PRODUCT_HISTORY_MESSAGE,
};

module.exports = productService;
