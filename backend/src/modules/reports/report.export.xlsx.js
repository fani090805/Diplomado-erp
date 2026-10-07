'use strict';

const ExcelJS = require('exceljs');
const { PassThrough } = require('stream');
const { BRAND, LOGO_PATH, STATUS_LABELS, excelDate, monthLabel } = require('./report.export.util');
const { addLogoToXlsx } = require('./report.export.xlsx-logo');

/**
 * Excel de ventas en STREAMING (exceljs WorkbookWriter): cada fila se
 * confirma (`commit`) y se escribe a la respuesta; las hojas Ventas y Detalle
 * se alimentan de cursores, así 10,000+ ventas no se cargan en memoria.
 */
const MONEY_FMT = '"$"#,##0.00';
const DATE_FMT = 'dd/mm/yyyy';
const argb = (hex) => `FF${hex.replace('#', '').toUpperCase()}`;
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const HEADER_STYLE = {
  font: { bold: true, color: { argb: argb(BRAND.cream) } },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(BRAND.olive) } },
  alignment: { vertical: 'middle' },
};

/** Hoja tabular: encabezado olivo, primera fila congelada y filtros automáticos. */
function tableSheet(workbook, name, columns) {
  const sheet = workbook.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = columns.map((c) => ({ key: c.key, width: c.width, style: c.numFmt ? { numFmt: c.numFmt } : {} }));
  const header = sheet.addRow(columns.map((c) => c.header));
  header.height = 20;
  header.eachCell((cell) => Object.assign(cell, HEADER_STYLE));
  header.commit();
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  return sheet;
}

async function pipeCursor(cursor, onDoc) {
  try {
    for await (const doc of cursor) onDoc(doc);
  } finally {
    await cursor.close().catch(() => {});
  }
}

function writeSummarySheet(workbook, ctx) {
  const sheet = workbook.addWorksheet('Resumen');
  sheet.columns = [{ width: 24 }, { width: 22 }, { width: 14 }, { width: 20 }];
  const add = (values, style) => {
    const row = sheet.addRow(values);
    if (style) style(row);
    row.commit();
  };
  const bold = (row) => {
    row.getCell(1).font = { bold: true };
  };

  // A1: el logo (se inserta al final, ver addLogoToXlsx) y, con sangría, la marca.
  add(['FAI · SOLUTION ERP'], (r) => {
    r.height = 34;
    r.getCell(1).font = { bold: true, size: 14, color: { argb: argb(BRAND.olive) } };
    r.getCell(1).alignment = { vertical: 'middle', indent: 5 };
  });
  add(['Reporte de ventas'], (r) => {
    r.getCell(1).font = { bold: true, size: 12 };
  });
  add([]);
  add(['Empresa', ctx.meta.companyName], bold);
  add(['Rango', ctx.meta.rangeLabel], bold);
  for (const [label, value] of ctx.meta.filterLabels) add([label, value], bold);
  add(['Generado', ctx.meta.generatedAt], bold);
  add([]);

  // Con estado "Todos": desglose por estado y aclaración de que los totales son de aprobadas.
  if (ctx.meta.statusBreakdown) add([ctx.meta.statusBreakdown], bold);
  if (ctx.meta.totalsNote) {
    add([ctx.meta.totalsNote], (r) => {
      r.getCell(1).font = { italic: true, color: { argb: argb(BRAND.muted) } };
    });
  }
  if (ctx.meta.emptyNotice) {
    add([ctx.meta.emptyNotice], (r) => {
      r.getCell(1).font = { bold: true, color: { argb: argb(BRAND.terracotta) } };
    });
  }
  if (ctx.meta.statusBreakdown || ctx.meta.emptyNotice) add([]);

  const s = ctx.summary;
  add(['Total vendido', round2(s.total)], (r) => {
    bold(r);
    r.getCell(2).numFmt = MONEY_FMT;
  });
  add(['Número de órdenes', s.orders], bold);
  add(['Ticket promedio', round2(s.average)], (r) => {
    bold(r);
    r.getCell(2).numFmt = MONEY_FMT;
  });
  add(['Unidades', s.units], bold);
  add([]);

  add(['Ventas por mes'], (r) => {
    r.getCell(1).font = { bold: true, size: 12, color: { argb: argb(BRAND.olive) } };
  });
  add(['Mes', 'Órdenes', 'Unidades', 'Total'], (r) => r.eachCell((cell) => Object.assign(cell, HEADER_STYLE)));
  for (const m of ctx.byMonth) {
    add([monthLabel(m.month), m.orders, m.units, round2(m.total)], (r) => {
      r.getCell(4).numFmt = MONEY_FMT;
    });
  }
  sheet.commit();
}

/**
 * Genera el Excel en streaming a un búfer comprimido, le inserta el logo en
 * la hoja Resumen y lo envía a `stream`.
 */
async function writeXlsx(ctx, stream, cursors) {
  const chunks = [];
  const sink = new PassThrough();
  sink.on('data', (chunk) => chunks.push(chunk));
  const drained = new Promise((resolve, reject) => {
    sink.on('end', resolve);
    sink.on('error', reject);
  });
  await writeWorkbook(ctx, sink, cursors);
  await drained;
  const xlsx = await addLogoToXlsx(Buffer.concat(chunks), { logoPath: LOGO_PATH, sheet: 1, sizePx: 36 });
  await new Promise((resolve, reject) => {
    stream.on('error', reject);
    stream.end(xlsx, resolve);
  });
}

async function writeWorkbook(ctx, stream, { ordersCursor, linesCursor }) {
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream, useStyles: true, useSharedStrings: false });
  workbook.creator = 'FAI Solution ERP';
  workbook.created = new Date();

  writeSummarySheet(workbook, ctx);

  const sales = tableSheet(workbook, 'Ventas', [
    { key: 'code', header: 'Folio', width: 12 },
    { key: 'date', header: 'Fecha', width: 12, numFmt: DATE_FMT },
    { key: 'customer', header: 'Cliente', width: 32 },
    { key: 'taxId', header: 'RFC', width: 16 },
    { key: 'warehouse', header: 'Almacén', width: 20 },
    { key: 'status', header: 'Estado', width: 12 },
    { key: 'lineCount', header: 'Líneas', width: 8 },
    { key: 'subtotal', header: 'Subtotal', width: 16, numFmt: MONEY_FMT },
    { key: 'total', header: 'Total', width: 16, numFmt: MONEY_FMT },
  ]);
  const { names } = ctx;
  await pipeCursor(ordersCursor(), (o) => {
    const customer = names.customer(o.customerId);
    sales
      .addRow({
        code: o.code,
        date: excelDate(o.localDate),
        customer: customer.name || '',
        taxId: customer.taxId || '',
        warehouse: names.warehouse(o.warehouseId),
        status: STATUS_LABELS[o.status] || o.status,
        lineCount: o.lineCount,
        subtotal: round2(o.subtotal),
        total: round2(o.total),
      })
      .commit();
  });
  sales.commit();

  const detail = tableSheet(workbook, 'Detalle', [
    { key: 'code', header: 'Folio', width: 12 },
    { key: 'date', header: 'Fecha', width: 12, numFmt: DATE_FMT },
    { key: 'customer', header: 'Cliente', width: 32 },
    { key: 'product', header: 'Producto', width: 32 },
    { key: 'sku', header: 'SKU', width: 14 },
    { key: 'quantity', header: 'Cantidad', width: 10 },
    { key: 'unitPrice', header: 'Precio unitario', width: 16, numFmt: MONEY_FMT },
    { key: 'amount', header: 'Importe', width: 16, numFmt: MONEY_FMT },
  ]);
  await pipeCursor(linesCursor(), (l) => {
    const product = names.product(l.productId);
    detail
      .addRow({
        code: l.code,
        date: excelDate(l.localDate),
        customer: names.customer(l.customerId).name || '',
        product: product.name || '',
        sku: product.sku || '',
        quantity: l.quantity,
        unitPrice: round2(l.unitPrice),
        amount: round2(l.amount),
      })
      .commit();
  });
  detail.commit();

  const byCustomer = tableSheet(workbook, 'Por cliente', [
    { key: 'name', header: 'Cliente', width: 34 },
    { key: 'taxId', header: 'RFC', width: 16 },
    { key: 'orders', header: 'Órdenes', width: 10 },
    { key: 'total', header: 'Total', width: 18, numFmt: MONEY_FMT },
  ]);
  for (const c of ctx.customers) {
    byCustomer.addRow({ name: c.name || '', taxId: c.taxId || '', orders: c.orders, total: round2(c.total) }).commit();
  }
  byCustomer.commit();

  const byProduct = tableSheet(workbook, 'Por producto', [
    { key: 'name', header: 'Producto', width: 34 },
    { key: 'sku', header: 'SKU', width: 14 },
    { key: 'orders', header: 'Órdenes', width: 10 },
    { key: 'units', header: 'Unidades', width: 12 },
    { key: 'amount', header: 'Importe', width: 18, numFmt: MONEY_FMT },
  ]);
  for (const p of ctx.products) {
    byProduct.addRow({ name: p.name || '', sku: p.sku || '', orders: p.orders, units: p.units, amount: round2(p.amount) }).commit();
  }
  byProduct.commit();

  await workbook.commit();
}

module.exports = writeXlsx;
