'use strict';

const ApiError = require('../../utils/ApiError');
const repo = require('./report.sales-export.repository');
const writeXlsx = require('./report.export.xlsx');
const writePdf = require('./report.export.pdf');
const { mexicoDayRange, exportFilename, STATUS_LABELS, ymdToDmy, nowInMexico } = require('./report.export.util');

/** Máximo de órdenes en la tabla del PDF (las más recientes). */
const PDF_MAX_ORDERS = 2000;
const TOP_N = 10;

const CONTENT_TYPES = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

/**
 * Exportación de ventas a PDF / Excel.
 *
 * `prepare` valida el rango y reúne lo que cabe en memoria (resúmenes,
 * top, meses) ANTES de enviar cabeceras, para que cualquier error todavía
 * pueda responderse como JSON (400/404). `write` escribe el archivo en
 * streaming; las órdenes y líneas se leen con cursor.
 */
const salesExportService = {
  async prepare(companyId, query) {
    const range = mexicoDayRange(query.from, query.to);
    if (range.error) throw ApiError.badRequest(range.error);

    const filters = {
      companyId,
      start: range.start,
      end: range.end,
      status: query.status,
      customerId: query.customerId,
      productId: query.productId,
    };

    const company = await repo.company(companyId);
    if (!company) throw ApiError.notFound('Empresa no encontrada.');

    const [customerName, productName] = await Promise.all([
      query.customerId ? repo.customerName(companyId, query.customerId) : null,
      query.productId ? repo.productName(companyId, query.productId) : null,
    ]);
    if (query.customerId && !customerName) throw ApiError.badRequest('El cliente no existe en su empresa.');
    if (query.productId && !productName) throw ApiError.badRequest('El producto no existe en su empresa.');

    // byCustomer / byProduct traen TODOS los clientes y productos con ventas en
    // el filtro: sirven para las hojas y como catálogo de nombres de los cursores.
    const [summary, byMonth, customers, products, warehouses] = await Promise.all([
      repo.summary(filters),
      repo.byMonth(filters),
      repo.byCustomer(filters),
      repo.byProduct(filters),
      repo.warehouseNames(companyId),
    ]);
    const customerById = new Map(customers.map((c) => [String(c.customerId), c]));
    const productById = new Map(products.map((p) => [String(p.productId), p]));
    const names = {
      customer: (id) => customerById.get(String(id)) || {},
      product: (id) => productById.get(String(id)) || {},
      warehouse: (id) => warehouses.get(String(id)) || '',
    };

    const filterLabels = [
      ['Estado', STATUS_LABELS[query.status]],
      ['Cliente', customerName || 'Todos'],
      ['Producto', productName || 'Todos'],
    ];

    return {
      format: query.format,
      contentType: CONTENT_TYPES[query.format],
      filename: exportFilename(company.name, query.from, query.to, query.format),
      filters,
      meta: {
        companyName: company.name,
        rangeLabel: `Del ${ymdToDmy(query.from)} al ${ymdToDmy(query.to)}`,
        generatedAt: nowInMexico(),
        filterLabels,
      },
      summary: {
        ...summary,
        average: summary.orders ? summary.total / summary.orders : 0,
      },
      byMonth,
      customers,
      products,
      topCustomers: customers.slice(0, TOP_N),
      topProducts: products.slice(0, TOP_N),
      names,
      pdfMaxOrders: PDF_MAX_ORDERS,
    };
  },

  /** Escribe el archivo en `stream` (la respuesta HTTP). Resuelve al terminar. */
  async write(ctx, stream) {
    if (ctx.format === 'pdf') {
      return writePdf(ctx, stream, {
        ordersCursor: () => repo.ordersCursor(ctx.filters, { sort: -1, limit: ctx.pdfMaxOrders }),
      });
    }
    return writeXlsx(ctx, stream, {
      ordersCursor: () => repo.ordersCursor(ctx.filters, { sort: 1 }),
      linesCursor: () => repo.linesCursor(ctx.filters),
    });
  },
};

module.exports = salesExportService;
