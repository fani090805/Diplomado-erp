'use strict';

/**
 * Planeación PURA (sin base de datos) de los datos demo de compras y
 * finanzas: proveedores, órdenes de compra por mes y gastos operativos.
 * Las fechas se agrupan por mes en hora de México (UTC-6 todo el año).
 */

const mongoose = require('mongoose');
const { DEMO_MARK, REJECTION_REASONS } = require('./demo-sales-data');

const MX_OFFSET_MS = 6 * 3600 * 1000;
const HOUR_MS = 3600 * 1000;
const DAY_MS = 24 * HOUR_MS;
const round2 = (n) => Math.round(n * 100) / 100;

const SUPPLIER_NAMES = [
  'Distribuidora Industrial del Bajío', 'Abastecedora Regiomontana', 'Comercial Ferretera de Occidente',
  'Importadora Pacífico Norte', 'Suministros Técnicos de Querétaro', 'Mayoreo El Sol Azteca',
  'Papelera y Empaques del Centro', 'Electrónica Mayorista Anáhuac', 'Grupo Proveedor La Huasteca',
  'Logística y Suministros del Golfo', 'Materiales Selectos de Puebla', 'Insumos Comerciales Valle Real',
  'Distribuciones Monte Alto', 'Almacenes Cumbres de Monterrey', 'Proveeduría Integral Mixteca',
  'Comercializadora Tres Hermanos', 'Surtidora del Norte', 'Equipos y Refacciones Quetzal',
];
const SUPPLIER_SUFFIXES = ['S.A. de C.V.', 'S. de R.L. de C.V.', 'S.A.P.I. de C.V.'];
const SUPPLIER_CITIES = ['Querétaro, Qro.', 'León, Gto.', 'Apodaca, N.L.', 'Zapopan, Jal.', 'Puebla, Pue.', 'Toluca, Edo. Méx.', 'Tlalnepantla, Edo. Méx.'];
const CONTACTS = ['Laura Méndez', 'Jorge Ramírez', 'Patricia Salinas', 'Ricardo Ochoa', 'Mónica Treviño', 'Héctor Villalobos'];

/**
 * Gastos operativos del mes: categoría, peso sobre el total y partidas
 * (concepto, día del mes). La suma de pesos es 1.
 */
const OPEX_PLAN = [
  { category: 'Nómina', weight: 0.46, items: [['Nómina 1a quincena', 15], ['Nómina 2a quincena', 31]] },
  { category: 'Renta', weight: 0.18, items: [['Renta del local y bodega', 3]] },
  { category: 'Servicios', weight: 0.08, items: [['Energía eléctrica', 10], ['Agua', 12], ['Internet y telefonía', 8]] },
  { category: 'Transporte', weight: 0.14, items: [['Fletes y combustible', 7], ['Fletes y combustible', 14], ['Fletes y combustible', 21], ['Fletes y combustible', 28]] },
  { category: 'Publicidad', weight: 0.14, items: [['Campaña en redes sociales', 5], ['Publicidad impresa y volanteo', 20]] },
];
const MARGIN_RANGE = [0.08, 0.2];
const PURCHASE_STATUS_MIX = { APPROVED: 0.9, REJECTED: 0.04 }; // el resto, DRAFT
const PO_LINE_COUNTS = [1, 1, 2, 2, 3, 4];

/** "2026-10" del instante dado, en hora de México. */
function monthOf(date) {
  const local = new Date(new Date(date).getTime() - MX_OFFSET_MS);
  return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Instante UTC del día `day` (1..) del mes "AAAA-MM" a la hora local `hour` (México). */
function mexicoTime(ym, day, hour = 10, minute = 0) {
  const [y, m] = ym.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return new Date(Date.UTC(y, m - 1, Math.min(day, last), hour, minute) + MX_OFFSET_MS);
}

/** Lo mantiene dentro del mes y nunca en el futuro. */
function clampToMonth(date, ym, now) {
  const start = mexicoTime(ym, 1, 0).getTime();
  return new Date(Math.max(start, Math.min(date.getTime(), now.getTime() - 5 * 60 * 1000)));
}

function fakeSupplier(rng, index) {
  const base = SUPPLIER_NAMES[(index - 1) % SUPPLIER_NAMES.length];
  const name = `${base} ${rng.pick(SUPPLIER_SUFFIXES)}`;
  const slug = base.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]+/g, '').slice(0, 16);
  return {
    code: `DEMO-P${String(index).padStart(3, '0')}`,
    name,
    contactName: rng.pick(CONTACTS),
    email: `ventas@${slug}.mx`,
    phone: `${rng.pick(['55', '33', '81', '442', '477'])}${rng.int(10000000, 99999999)}`.slice(0, 10),
    address: `Parque industrial, ${rng.pick(SUPPLIER_CITIES)}`,
    notes: DEMO_MARK,
    status: 'active',
  };
}

/** Proveedores demo que faltan para llegar a `min`. */
function planSuppliers(existing, rng, companyId, min = 15) {
  const taken = new Set(existing.map((s) => s.code));
  const created = [];
  for (let index = 1; existing.length + created.length < min; index += 1) {
    const supplier = fakeSupplier(rng, index);
    if (taken.has(supplier.code)) continue;
    created.push({ _id: new mongoose.Types.ObjectId(), companyId, ...supplier });
  }
  return created;
}

function shuffled(list, rng) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng.next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function statusesFor(count, rng) {
  const approved = Math.round(count * PURCHASE_STATUS_MIX.APPROVED);
  const rejected = Math.min(count - approved, Math.round(count * PURCHASE_STATUS_MIX.REJECTED));
  return shuffled(
    [...Array(approved).fill('APPROVED'), ...Array(rejected).fill('REJECTED'), ...Array(count - approved - rejected).fill('DRAFT')],
    rng
  );
}

/** Fecha hábil (lun–sáb, 8:00–17:59 MX) dentro del mes, nunca futura. */
function businessDate(ym, rng, now) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const date = mexicoTime(ym, rng.int(1, 31), rng.int(8, 17), rng.int(0, 59));
    const weekday = new Date(date.getTime() - MX_OFFSET_MS).getUTCDay();
    if (weekday !== 0 && date <= now) return date;
  }
  return clampToMonth(mexicoTime(ym, 1, 9), ym, now);
}

/**
 * Órdenes de compra repartidas por mes en proporción al COSTO de lo vendido
 * (`cogsByMonth`): lo aprobado en el mes ≈ costo de lo vendido ±5 %.
 * `products` = [{ _id, cost }] con costo > 0.
 */
function planPurchaseOrders({ ctx, rng, cogsByMonth, products, suppliers, now, target = 1200 }) {
  const months = [...cogsByMonth.keys()].sort();
  const totalCogs = months.reduce((sum, ym) => sum + cogsByMonth.get(ym), 0);
  const orders = [];
  for (const ym of months) {
    const count = Math.max(1, Math.round((target * cogsByMonth.get(ym)) / totalCogs));
    const statuses = statusesFor(count, rng);
    const approvedCount = statuses.filter((s) => s === 'APPROVED').length || 1;
    const perOrder = (cogsByMonth.get(ym) * (0.95 + rng.next() * 0.1)) / approvedCount;

    for (const status of statuses) {
      const lineCount = Math.min(rng.pick(PO_LINE_COUNTS), products.length);
      const picked = shuffled(products, rng).slice(0, lineCount);
      const weights = picked.map(() => 0.5 + rng.next());
      const weightSum = weights.reduce((a, b) => a + b, 0);
      const lines = picked.map((product, i) => {
        const unitCost = round2(product.cost * (0.95 + rng.next() * 0.1));
        const quantity = Math.max(1, Math.round((perOrder * weights[i]) / weightSum / unitCost));
        return { productId: product._id, quantity, unitCost };
      });
      const createdAt = businessDate(ym, rng, now);
      const reviewedAt = new Date(Math.min(createdAt.getTime() + rng.int(1, 48) * HOUR_MS, now.getTime() - 60 * 1000));
      const order = {
        _id: new mongoose.Types.ObjectId(),
        companyId: ctx.companyId,
        supplierId: rng.pick(suppliers)._id,
        warehouseId: ctx.warehouse._id,
        status,
        lines,
        total: round2(lines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0)),
        notes: DEMO_MARK,
        createdBy: ctx.admin._id,
        approvedBy: status === 'APPROVED' ? ctx.admin._id : null,
        approvedAt: status === 'APPROVED' ? reviewedAt : null,
        rejectedBy: status === 'REJECTED' ? ctx.admin._id : null,
        rejectedAt: status === 'REJECTED' ? reviewedAt : null,
        rejectionReason: status === 'REJECTED' ? rng.pick(REJECTION_REASONS) : null,
        createdAt,
        updatedAt: status === 'DRAFT' ? createdAt : reviewedAt,
        __v: 0,
      };
      orders.push(order);
    }
  }
  return orders.sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * Gastos operativos por mes para que el neto quede en un margen de 8–20 %:
 * opex = ingresos × (1 − margen) − compras pagadas − otros gastos del mes.
 * Devuelve [{ category, description, amount, date }] (sin código ni cuenta).
 */
function planOperatingExpenses({ incomeByMonth, purchasesByMonth, otherExpensesByMonth, rng, now }) {
  const expenses = [];
  const margins = new Map();
  for (const ym of [...incomeByMonth.keys()].sort()) {
    const income = incomeByMonth.get(ym);
    if (!(income > 0)) continue;
    const margin = MARGIN_RANGE[0] + rng.next() * (MARGIN_RANGE[1] - MARGIN_RANGE[0]);
    const spent = (purchasesByMonth.get(ym) || 0) + (otherExpensesByMonth.get(ym) || 0);
    const opex = round2(Math.max(income * 0.04, income * (1 - margin) - spent));
    margins.set(ym, margin);

    const items = OPEX_PLAN.flatMap(({ category, weight, items: parts }) =>
      parts.map(([description, day]) => ({ category, description, day, raw: (weight / parts.length) * (0.9 + rng.next() * 0.2) }))
    );
    const rawSum = items.reduce((sum, i) => sum + i.raw, 0);
    let assigned = 0;
    items.forEach((item, index) => {
      const amount = index === items.length - 1 ? round2(opex - assigned) : round2((opex * item.raw) / rawSum);
      assigned = round2(assigned + amount);
      const date = clampToMonth(mexicoTime(ym, item.day, 10, rng.int(0, 59)), ym, now);
      expenses.push({ category: item.category, description: item.description, amount, date });
    });
  }
  return { expenses, margins };
}

module.exports = {
  MX_OFFSET_MS,
  DAY_MS,
  OPEX_PLAN,
  MARGIN_RANGE,
  monthOf,
  clampToMonth,
  planSuppliers,
  planPurchaseOrders,
  planOperatingExpenses,
};
