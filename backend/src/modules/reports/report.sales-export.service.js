'use strict';

const ApiError = require('../../utils/ApiError');
const repo = require('./report.sales-export.repository');
const writeXlsx = require('./report.export.xlsx');
const writePdf = require('./report.export.pdf');
const { mexicoDayRange, exportFilename, STATUS_LABELS, ymdToDmy, nowInMexico, int } = require('./report.export.util');

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

    // Con estado "Todos", los TOTALES (KPIs, meses, top, por cliente/producto)
    // cuentan sólo ventas APROBADAS; las listas de órdenes y líneas muestran todas.
    const approvedOnly = query.status === 'all';
    const totalsFilters = approvedOnly ? { ...filters, status: 'APPROVED' } : filters;

    const [summary, byMonth, customers, products, counts, warehouses, customerCatalog, productCatalog] = await Promise.all([
      repo.summary(totalsFilters),
      repo.byMonth(totalsFilters),
      repo.byCustomer(totalsFilters),
      repo.byProduct(totalsFilters),
      approvedOnly ? repo.statusCounts(filters) : null,
      repo.warehouseNames(companyId),
      repo.customerCatalog(companyId),
      repo.productCatalog(companyId),
    ]);
    // Nombres desde el catálogo: también para órdenes en borrador o rechazadas.
    const names = {
      customer: (id) => customerCatalog.get(String(id)) || {},
      product: (id) => productCatalog.get(String(id)) || {},
      warehouse: (id) => warehouses.get(String(id)) || '',
    };
    const showsApproved = query.status === 'all' || query.status === 'APPROVED';

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
        // Sólo con estado "Todos": desglose y aclaración de los totales.
        statusBreakdown: counts
          ? `Aprobadas: ${int(counts.APPROVED)} · Borrador: ${int(counts.DRAFT)} · Rechazadas: ${int(counts.REJECTED)}`
          : null,
        totalsNote: approvedOnly ? 'Totales calculados solo con ventas aprobadas' : null,
        // Totales en $0.00 con aviso (sin error) cuando no hay aprobadas en el rango.
        emptyNotice: showsApproved && summary.orders === 0 ? 'Sin ventas aprobadas en el periodo' : null,
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
