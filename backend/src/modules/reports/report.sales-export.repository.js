'use strict';

const mongoose = require('mongoose');
const SalesOrder = require('../sales-orders/sales_order.model');
const Company = require('../companies/company.model');
const Customer = require('../customers/customer.model');
const Product = require('../products/product.model');
const Warehouse = require('../warehouses/warehouse.model');
const { REPORT_TIMEZONE } = require('./report.export.util');

/**
 * Repositorio de la EXPORTACIÓN DE VENTAS (PDF / Excel).
 *
 * Todo sale de agregaciones de MongoDB con `companyId` en el primer $match
 * (multiempresa estricto). Los resúmenes devuelven pocos documentos; las
 * órdenes y las líneas se leen con CURSOR para no cargar 10,000+ ventas en memoria.
 * Los cursores NO hacen $lookup por fila (lento en Atlas con 25,000+ líneas):
 * devuelven ids y el servicio los resuelve con los catálogos de byCustomer,
 * byProduct y warehouseNames.
 *
 * `filters` = { companyId, start, end, status, customerId?, productId? }
 *  - start/end: [start, end) en UTC (días completos en hora de México).
 *  - status: 'APPROVED' | 'DRAFT' | 'REJECTED' | 'all'.
 *  - productId: órdenes que contienen el producto; las métricas por línea
 *    (unidades, detalle, por producto) consideran sólo ese producto.
 */
const oid = (v) => new mongoose.Types.ObjectId(String(v));
// Lotes grandes = menos viajes de red a Atlas (cada documento pesa ~200 bytes).
const CURSOR_BATCH = 2000;

function orderMatch({ companyId, start, end, status, customerId, productId }) {
  const match = { companyId: oid(companyId), createdAt: { $gte: start, $lt: end } };
  if (status && status !== 'all') match.status = status;
  if (customerId) match.customerId = oid(customerId);
  if (productId) match['lines.productId'] = oid(productId);
  return match;
}

/** Líneas que cuentan para las métricas por línea (todas o sólo las del producto filtrado). */
function linesExpr(productId) {
  if (!productId) return '$lines';
  return { $filter: { input: '$lines', as: 'l', cond: { $eq: ['$$l.productId', oid(productId)] } } };
}

/** Fecha local de México como texto ISO sin zona: "2026-10-05T14:30:00". */
const localDate = { $dateToString: { format: '%Y-%m-%dT%H:%M:%S', date: '$createdAt', timezone: REPORT_TIMEZONE } };

const lookupOne = (from, localField, as, fields) => [
  {
    $lookup: {
      from,
      localField,
      foreignField: '_id',
      as,
      pipeline: [{ $project: Object.fromEntries(fields.map((f) => [f, 1])) }],
    },
  },
  { $set: { [as]: { $first: `$${as}` } } },
];

const salesExportRepository = {
  /** Nombres de los almacenes de la empresa (catálogo pequeño). */
  async warehouseNames(companyId) {
    const rows = await Warehouse.find({ companyId: oid(companyId) }).select('name').lean();
    return new Map(rows.map((w) => [String(w._id), w.name]));
  },

  async company(companyId) {
    return Company.findById(oid(companyId)).select('name legalName joinCode').lean();
  },

  /** Nombre del cliente / producto filtrado, siempre dentro de la empresa. */
  async customerName(companyId, customerId) {
    const c = await Customer.findOne({ _id: oid(customerId), companyId: oid(companyId) }).select('name').lean();
    return c ? c.name : null;
  },

  async productName(companyId, productId) {
    const p = await Product.findOne({ _id: oid(productId), companyId: oid(companyId) }).select('name sku').lean();
    return p ? `${p.name}${p.sku ? ` (${p.sku})` : ''}` : null;
  },

  /** Totales: órdenes, monto, unidades. */
  async summary(filters) {
    const rows = await SalesOrder.aggregate([
      { $match: orderMatch(filters) },
      { $project: { total: 1, units: { $sum: { $map: { input: linesExpr(filters.productId), as: 'l', in: '$$l.quantity' } } } } },
      { $group: { _id: null, orders: { $sum: 1 }, total: { $sum: '$total' }, units: { $sum: '$units' } } },
    ]).allowDiskUse(true);
    const r = rows[0] || { orders: 0, total: 0, units: 0 };
    return { orders: r.orders, total: r.total, units: r.units };
  },

  /** Ventas por mes (hora de México): [{ month: '2026-10', orders, total, units }]. */
  async byMonth(filters) {
    return SalesOrder.aggregate([
      { $match: orderMatch(filters) },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: REPORT_TIMEZONE } },
          orders: { $sum: 1 },
          total: { $sum: '$total' },
          units: { $sum: { $sum: { $map: { input: linesExpr(filters.productId), as: 'l', in: '$$l.quantity' } } } },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, month: '$_id', orders: 1, total: 1, units: 1 } },
    ]).allowDiskUse(true);
  },

  /** Totales por cliente, de mayor a menor. */
  async byCustomer(filters) {
    const pipeline = [
      { $match: orderMatch(filters) },
      { $group: { _id: '$customerId', orders: { $sum: 1 }, total: { $sum: '$total' } } },
      { $sort: { total: -1, _id: 1 } },
    ];
    pipeline.push(...lookupOne('customers', '_id', 'customer', ['name', 'taxId', 'code']), {
      $project: { _id: 0, customerId: '$_id', name: '$customer.name', taxId: '$customer.taxId', code: '$customer.code', orders: 1, total: 1 },
    });
    return SalesOrder.aggregate(pipeline).allowDiskUse(true);
  },

  /** Totales por producto (unidades e importe de línea), de mayor a menor. */
  async byProduct(filters) {
    const pipeline = [
      { $match: orderMatch(filters) },
      { $unwind: '$lines' },
    ];
    if (filters.productId) pipeline.push({ $match: { 'lines.productId': oid(filters.productId) } });
    pipeline.push(
      {
        $group: {
          _id: '$lines.productId',
          orders: { $sum: 1 },
          units: { $sum: '$lines.quantity' },
          amount: { $sum: { $multiply: ['$lines.quantity', '$lines.unitPrice'] } },
        },
      },
      { $sort: { amount: -1, _id: 1 } },
      ...lookupOne('products', '_id', 'product', ['name', 'sku']),
      {
        $project: { _id: 0, productId: '$_id', name: '$product.name', sku: '$product.sku', orders: 1, units: 1, amount: 1 },
      }
    );
    return SalesOrder.aggregate(pipeline).allowDiskUse(true);
  },

  /**
   * Cursor de órdenes (ids de cliente y almacén). `sort` 1 = más antiguas
   * primero, -1 = más recientes primero; `limit` opcional (PDF).
   */
  ordersCursor(filters, { sort = 1, limit } = {}) {
    const pipeline = [{ $match: orderMatch(filters) }, { $sort: { createdAt: sort, _id: sort } }];
    if (limit) pipeline.push({ $limit: limit });
    pipeline.push({
      $project: {
        _id: 0,
        code: 1,
        status: 1,
        total: 1,
        localDate,
        customerId: 1,
        warehouseId: 1,
        lineCount: { $size: '$lines' },
        subtotal: { $sum: { $map: { input: '$lines', as: 'l', in: { $multiply: ['$$l.quantity', '$$l.unitPrice'] } } } },
      },
    });
    return SalesOrder.aggregate(pipeline).allowDiskUse(true).cursor({ batchSize: CURSOR_BATCH });
  },

  /** Cursor de líneas (una fila por línea de cada orden), más antiguas primero. */
  linesCursor(filters) {
    const pipeline = [
      { $match: orderMatch(filters) },
      { $sort: { createdAt: 1, _id: 1 } },
      { $unwind: '$lines' },
    ];
    if (filters.productId) pipeline.push({ $match: { 'lines.productId': oid(filters.productId) } });
    pipeline.push({
      $project: {
        _id: 0,
        code: 1,
        localDate,
        customerId: 1,
        productId: '$lines.productId',
        quantity: '$lines.quantity',
        unitPrice: '$lines.unitPrice',
        amount: { $multiply: ['$lines.quantity', '$lines.unitPrice'] },
      },
    });
    return SalesOrder.aggregate(pipeline).allowDiskUse(true).cursor({ batchSize: CURSOR_BATCH });
  },
};

module.exports = salesExportRepository;
