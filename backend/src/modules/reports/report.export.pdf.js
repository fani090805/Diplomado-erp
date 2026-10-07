'use strict';

const PDFDocument = require('pdfkit');
const { BRAND, STATUS_LABELS, dmy, monthLabel, money, int, moneyShort } = require('./report.export.util');

/**
 * PDF de ventas (pdfkit), tamaño carta y márgenes de 40.
 *
 * Contenido: encabezado FAI, KPIs, gráfica de barras por mes, top 10
 * clientes / productos y tabla de órdenes (máx. `pdfMaxOrders`, las más
 * recientes, leídas con cursor). `bufferPages` permite escribir al final el
 * pie "Página X de Y" (el PDF queda acotado a unas ~60 páginas).
 */
const MARGIN = 40;
const PAGE = { width: 612, height: 792 };
const LEFT = MARGIN;
const WIDTH = PAGE.width - MARGIN * 2;
const BOTTOM = PAGE.height - MARGIN - 14; // deja espacio al pie
const ROW_H = 16;
const HEAD_H = 18;

/** Recorta el texto con "…" para que quepa en `width`. */
function fit(doc, text, width) {
  let s = String(text ?? '');
  if (doc.widthOfString(s) <= width) return s;
  while (s.length > 1 && doc.widthOfString(`${s}…`) > width) s = s.slice(0, -1);
  return `${s}…`;
}

function ensureSpace(doc, height) {
  if (doc.y + height > BOTTOM) {
    doc.addPage();
    doc.y = MARGIN;
  }
}

function sectionTitle(doc, text) {
  ensureSpace(doc, 40);
  doc.moveDown(0.6);
  doc.font('Helvetica-Bold').fontSize(12).fillColor(BRAND.olive).text(text, LEFT, doc.y);
  doc.moveDown(0.3);
}

function drawHeader(doc, ctx) {
  doc.font('Helvetica-Bold').fontSize(10).fillColor(BRAND.olive).text('FAI · SOLUTION ERP', LEFT, MARGIN, { characterSpacing: 1 });
  doc.font('Helvetica-Bold').fontSize(16).fillColor(BRAND.text).text(ctx.meta.companyName, LEFT, doc.y + 6, { width: WIDTH });
  doc.font('Helvetica-Bold').fontSize(20).fillColor(BRAND.olive).text('Reporte de ventas', LEFT, doc.y + 2);
  doc.font('Helvetica').fontSize(9).fillColor(BRAND.muted);
  doc.text(ctx.meta.rangeLabel, LEFT, doc.y + 4);
  const filters = ctx.meta.filterLabels.map(([k, v]) => `${k}: ${v}`).join('   ·   ');
  doc.text(filters, { width: WIDTH });
  doc.text(`Generado el ${ctx.meta.generatedAt} (hora del centro de México)`);
  const y = doc.y + 8;
  doc.moveTo(LEFT, y).lineTo(LEFT + WIDTH, y).lineWidth(1.5).strokeColor(BRAND.olive).stroke();
  doc.y = y + 12;
}

function drawKpis(doc, ctx) {
  const s = ctx.summary;
  const cards = [
    ['Total vendido', money(s.total)],
    ['Órdenes', int(s.orders)],
    ['Ticket promedio', money(s.average)],
    ['Unidades', int(s.units)],
  ];
  const gap = 10;
  const w = (WIDTH - gap * (cards.length - 1)) / cards.length;
  const h = 54;
  const y = doc.y;
  cards.forEach(([label, value], i) => {
    const x = LEFT + i * (w + gap);
    doc.roundedRect(x, y, w, h, 6).fillAndStroke(BRAND.creamRow, BRAND.border);
    doc.rect(x, y, 4, h).fill(BRAND.olive);
    doc.font('Helvetica').fontSize(8).fillColor(BRAND.muted).text(label.toUpperCase(), x + 12, y + 10, { width: w - 18 });
    doc.font('Helvetica-Bold').fontSize(13).fillColor(BRAND.text).text(fit(doc, value, w - 18), x + 12, y + 26, { width: w - 18, lineBreak: false });
  });
  doc.y = y + h + 6;
}

function drawMonthChart(doc, months) {
  sectionTitle(doc, 'Ventas por mes');
  if (!months.length) {
    doc.font('Helvetica').fontSize(9).fillColor(BRAND.muted).text('Sin ventas en el rango.', LEFT);
    return;
  }
  const chartH = 150;
  const axisW = 46;
  ensureSpace(doc, chartH + 30);
  const top = doc.y + 6;
  const baseY = top + chartH;
  const x0 = LEFT + axisW;
  const chartW = WIDTH - axisW;
  const max = Math.max(...months.map((m) => m.total), 1);

  doc.font('Helvetica').fontSize(7).fillColor(BRAND.muted);
  for (let i = 0; i <= 4; i += 1) {
    const value = (max * i) / 4;
    const y = baseY - (chartH * i) / 4;
    doc.moveTo(x0, y).lineTo(x0 + chartW, y).lineWidth(0.5).strokeColor(BRAND.border).stroke();
    doc.text(moneyShort(value), LEFT, y - 4, { width: axisW - 6, align: 'right', lineBreak: false });
  }

  const slot = chartW / months.length;
  const barW = Math.min(28, slot * 0.62);
  const labelEvery = months.length > 16 ? 2 : 1;
  months.forEach((m, i) => {
    const h = Math.max((m.total / max) * chartH, m.total > 0 ? 1 : 0);
    const x = x0 + i * slot + (slot - barW) / 2;
    doc.rect(x, baseY - h, barW, h).fill(BRAND.olive);
    doc.font('Helvetica').fontSize(6.5).fillColor(BRAND.muted);
    if (months.length <= 13) {
      doc.text(moneyShort(m.total), x0 + i * slot, baseY - h - 9, { width: slot, align: 'center', lineBreak: false });
    }
    if (i % labelEvery === 0) {
      doc.text(monthLabel(m.month), x0 + i * slot, baseY + 4, { width: slot, align: 'center', lineBreak: false });
    }
  });
  doc.y = baseY + 18;
}

/**
 * Tabla con encabezado olivo, filas alternadas crema y salto de página
 * (repite el encabezado). `columns` = [{ label, width, align, value(row) }].
 */
function createTable(doc, columns) {
  const drawHead = () => {
    const y = doc.y;
    doc.rect(LEFT, y, WIDTH, HEAD_H).fill(BRAND.olive);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(BRAND.cream);
    let x = LEFT;
    for (const c of columns) {
      doc.text(c.label, x + 5, y + 5, { width: c.width - 10, align: c.align || 'left', lineBreak: false });
      x += c.width;
    }
    doc.y = y + HEAD_H;
  };
  let index = 0;
  drawHead();
  return {
    row(data) {
      if (doc.y + ROW_H > BOTTOM) {
        doc.addPage();
        doc.y = MARGIN;
        drawHead();
      }
      const y = doc.y;
      if (index % 2 === 1) doc.rect(LEFT, y, WIDTH, ROW_H).fill(BRAND.creamRow);
      doc.font('Helvetica').fontSize(8).fillColor(BRAND.text);
      let x = LEFT;
      for (const c of columns) {
        doc.text(fit(doc, c.value(data), c.width - 10), x + 5, y + 4, { width: c.width - 10, align: c.align || 'left', lineBreak: false });
        x += c.width;
      }
      index += 1;
      doc.y = y + ROW_H;
    },
    empty(text) {
      doc.font('Helvetica').fontSize(8).fillColor(BRAND.muted).text(text, LEFT + 5, doc.y + 4);
      doc.y += 4;
    },
  };
}

function drawTops(doc, ctx) {
  sectionTitle(doc, 'Top 10 clientes');
  const customers = createTable(doc, [
    { label: '#', width: 30, value: (r) => r.rank },
    { label: 'Cliente', width: 252, value: (r) => r.name || '—' },
    { label: 'RFC', width: 100, value: (r) => r.taxId || '—' },
    { label: 'Órdenes', width: 60, align: 'right', value: (r) => int(r.orders) },
    { label: 'Total', width: 90, align: 'right', value: (r) => money(r.total) },
  ]);
  if (!ctx.topCustomers.length) customers.empty('Sin ventas en el rango.');
  ctx.topCustomers.forEach((c, i) => customers.row({ ...c, rank: i + 1 }));

  sectionTitle(doc, 'Top 10 productos');
  const products = createTable(doc, [
    { label: '#', width: 30, value: (r) => r.rank },
    { label: 'Producto', width: 232, value: (r) => r.name || '—' },
    { label: 'SKU', width: 90, value: (r) => r.sku || '—' },
    { label: 'Unidades', width: 80, align: 'right', value: (r) => int(r.units) },
    { label: 'Importe', width: 100, align: 'right', value: (r) => money(r.amount) },
  ]);
  if (!ctx.topProducts.length) products.empty('Sin ventas en el rango.');
  ctx.topProducts.forEach((p, i) => products.row({ ...p, rank: i + 1 }));
}

async function drawOrders(doc, ctx, ordersCursor) {
  doc.addPage();
  doc.y = MARGIN;
  doc.font('Helvetica-Bold').fontSize(12).fillColor(BRAND.olive).text('Órdenes', LEFT, doc.y);
  const total = ctx.summary.orders;
  if (total > ctx.pdfMaxOrders) {
    doc.font('Helvetica').fontSize(9).fillColor(BRAND.muted).text(
      `Se muestran las ${int(ctx.pdfMaxOrders)} órdenes más recientes de ${int(total)}. ` +
        'Para el detalle completo descarga el Excel.',
      LEFT,
      doc.y + 2,
      { width: WIDTH }
    );
  }
  doc.y += 6;
  const table = createTable(doc, [
    { label: 'Folio', width: 80, value: (r) => r.code },
    { label: 'Fecha', width: 70, value: (r) => dmy(r.localDate) },
    { label: 'Cliente', width: 222, value: (r) => ctx.names.customer(r.customerId).name || '—' },
    { label: 'Estado', width: 70, value: (r) => STATUS_LABELS[r.status] || r.status },
    { label: 'Total', width: 90, align: 'right', value: (r) => money(r.total) },
  ]);
  if (!total) table.empty('Sin órdenes en el rango.');
  const cursor = ordersCursor();
  try {
    for await (const order of cursor) table.row(order);
  } finally {
    await cursor.close().catch(() => {});
  }
}

function drawFooters(doc) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    const bottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0; // escribir dentro del margen sin crear otra página
    const y = PAGE.height - MARGIN + 8;
    doc.moveTo(LEFT, y - 6).lineTo(LEFT + WIDTH, y - 6).lineWidth(0.5).strokeColor(BRAND.border).stroke();
    doc.font('Helvetica').fontSize(8).fillColor(BRAND.muted).text(
      `FAI Solution ERP · Página ${i - range.start + 1} de ${range.count}`,
      LEFT,
      y,
      { width: WIDTH, align: 'center', lineBreak: false }
    );
    doc.page.margins.bottom = bottom;
  }
}

async function writePdf(ctx, stream, { ordersCursor }) {
  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
    bufferPages: true,
    info: { Title: `Reporte de ventas · ${ctx.meta.companyName}`, Author: 'FAI Solution ERP' },
  });
  const done = new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
    doc.on('error', reject);
  });
  doc.pipe(stream);

  drawHeader(doc, ctx);
  drawKpis(doc, ctx);
  drawMonthChart(doc, ctx.byMonth);
  drawTops(doc, ctx);
  await drawOrders(doc, ctx, ordersCursor);
  drawFooters(doc);

  doc.end();
  return done;
}

module.exports = writePdf;
