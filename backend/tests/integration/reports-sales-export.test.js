'use strict';

/**
 * Exportación de ventas a PDF / Excel (GET /reports/sales/export).
 *
 * Las órdenes se insertan directo en la colección para fijar `createdAt`.
 * México está en UTC-6 todo el año (sin horario de verano desde 2022):
 *  - 2026-03-31T05:30Z = lunes 30 mar 23:30 (MX) → entra en "hasta 2026-03-30"
 *  - 2026-03-31T06:30Z = martes 31 mar 00:30 (MX) → queda fuera
 *  - 2026-03-01T05:00Z = sábado 28 feb 23:00 (MX) → fuera de "desde 2026-03-01"
 */

const request = require('supertest');
const mongoose = require('mongoose');
const ExcelJS = require('exceljs');
const { describeIfDb, connectTestDb, closeTestDb, app } = require('../helpers/setup');
const { createTenant, createUser, login, auth } = require('../helpers/fixtures');
const SalesOrder = require('../../src/modules/sales-orders/sales_order.model');
const Customer = require('../../src/modules/customers/customer.model');
const Product = require('../../src/modules/products/product.model');

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Supertest: junta el cuerpo binario en un Buffer. */
function binary(res, callback) {
  const chunks = [];
  res.on('data', (c) => chunks.push(Buffer.from(c)));
  res.on('end', () => callback(null, Buffer.concat(chunks)));
}

async function readWorkbook(buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  return wb;
}

/** Filas de datos (sin encabezado) de una hoja como arreglos de valores. */
function dataRows(sheet) {
  const rows = [];
  sheet.eachRow((row, n) => {
    if (n > 1) rows.push(row.values.slice(1));
  });
  return rows;
}

describeIfDb('API /reports/sales/export (PDF y Excel)', () => {
  let tenantA;
  let tenantB;
  let tokenA;
  let tokenAlmacen;
  let tokenB;
  let custA1;
  let custA2;
  let custB;
  let prodA1;
  let prodA2;

  let seq = 0;
  const order = (tenant, customer, createdAt, lines, status = 'APPROVED') => ({
    companyId: tenant.company._id,
    code: `SO-${String((seq += 1)).padStart(6, '0')}`,
    customerId: customer._id,
    warehouseId: tenant.warehouse._id,
    status,
    lines: lines.map(([product, quantity, unitPrice]) => ({ productId: product._id, quantity, unitPrice })),
    total: lines.reduce((s, [, q, p]) => s + q * p, 0),
    createdAt: new Date(createdAt),
    updatedAt: new Date(createdAt),
  });

  const insertCatalog = async (Model, doc) => {
    const { insertedId } = await Model.collection.insertOne(doc);
    return { _id: insertedId, ...doc };
  };

  beforeAll(async () => {
    await connectTestDb();
    tenantA = await createTenant({ name: 'Exportes Ñandú' });
    tenantB = await createTenant({ name: 'Exportes B' });
    await createUser({ company: tenantA.company, branch: tenantA.branch, role: tenantA.roles.administrador, email: 'admin-export-a@test.local' });
    await createUser({ company: tenantA.company, branch: tenantA.branch, role: tenantA.roles.almacen, email: 'almacen-export-a@test.local' });
    await createUser({ company: tenantB.company, branch: tenantB.branch, role: tenantB.roles.administrador, email: 'admin-export-b@test.local' });
    tokenA = await login('admin-export-a@test.local', 'Clave1234');
    tokenAlmacen = await login('almacen-export-a@test.local', 'Clave1234');
    tokenB = await login('admin-export-b@test.local', 'Clave1234');

    const a = tenantA.company._id;
    custA1 = await insertCatalog(Customer, { companyId: a, code: 'C-A1', name: 'Cliente Grande', taxId: 'GRA010101AAA' });
    custA2 = await insertCatalog(Customer, { companyId: a, code: 'C-A2', name: 'Cliente Chico', taxId: null });
    custB = await insertCatalog(Customer, { companyId: tenantB.company._id, code: 'C-B1', name: 'Cliente de B' });
    prodA1 = await insertCatalog(Product, { companyId: a, sku: 'SKU-1', name: 'Tornillo', status: 'active' });
    prodA2 = await insertCatalog(Product, { companyId: a, sku: 'SKU-2', name: 'Tuerca', status: 'active' });

    await SalesOrder.collection.insertMany([
      order(tenantA, custA1, '2026-03-02T18:00:00Z', [[prodA1, 10, 100], [prodA2, 5, 20]]), // 1100
      order(tenantA, custA1, '2026-03-15T18:00:00Z', [[prodA1, 2, 100]]), // 200
      order(tenantA, custA2, '2026-03-31T05:30:00Z', [[prodA2, 3, 20]]), // 60, lun 30 mar 23:30 MX
      order(tenantA, custA2, '2026-03-20T18:00:00Z', [[prodA1, 1, 100]], 'DRAFT'), // 100
      order(tenantA, custA2, '2026-03-21T18:00:00Z', [[prodA2, 1, 20]], 'REJECTED'), // 20
      order(tenantA, custA1, '2026-03-31T06:30:00Z', [[prodA1, 50, 100]]), // fuera: mar 31 00:30 MX
      order(tenantA, custA1, '2026-03-01T05:00:00Z', [[prodA1, 70, 100]]), // fuera: sáb 28 feb 23:00 MX
      order(tenantB, custB, '2026-03-10T18:00:00Z', [[prodA1, 999, 1]]), // otra empresa
    ]);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  const exportAs = (token, query) =>
    request(app)
      .get('/api/v1/reports/sales/export')
      .query(query)
      .set(auth(token))
      .buffer(true)
      .parse(binary);

  const MARCH = { from: '2026-03-01', to: '2026-03-30' };

  test('XLSX: cabeceras, firma ZIP y las 5 hojas con datos aprobados del rango', async () => {
    const res = await exportAs(tokenA, { format: 'xlsx', ...MARCH });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe(XLSX_TYPE);
    expect(res.headers['content-disposition']).toContain(
      'attachment; filename="ventas_exportes-nandu_2026-03-01_2026-03-30.xlsx"'
    );
    expect(res.body.subarray(0, 4).toString('hex')).toBe('504b0304'); // PK\x03\x04

    const wb = await readWorkbook(res.body);
    expect(wb.worksheets.map((s) => s.name)).toEqual(['Resumen', 'Ventas', 'Detalle', 'Por cliente', 'Por producto']);

    const ventas = wb.getWorksheet('Ventas');
    expect(ventas.getRow(1).values.slice(1)).toEqual([
      'Folio', 'Fecha', 'Cliente', 'RFC', 'Almacén', 'Estado', 'Líneas', 'Subtotal', 'Total',
    ]);
    expect(ventas.getCell('A1').fill.fgColor.argb).toBe('FF334024');
    expect(ventas.getCell('A1').font.color.argb).toBe('FFF5EEDB');
    expect(ventas.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 });
    expect(ventas.autoFilter).toBeTruthy();
    expect(ventas.getCell('I2').numFmt).toBe('"$"#,##0.00');
    expect(ventas.getCell('B2').numFmt).toBe('dd/mm/yyyy');

    const rows = dataRows(ventas);
    expect(rows.map((r) => r[8])).toEqual([1100, 200, 60]); // incluye el día final completo (hora MX)
    expect(rows[0].slice(2, 7)).toEqual(['Cliente Grande', 'GRA010101AAA', 'Almacén General', 'Aprobada', 2]);
    // 30 mar 23:30 MX se muestra como 30/03/2026 (no 31).
    expect(rows[2][1].toISOString().slice(0, 10)).toBe('2026-03-30');

    expect(dataRows(wb.getWorksheet('Detalle'))).toHaveLength(4);
    const porCliente = dataRows(wb.getWorksheet('Por cliente'));
    expect(porCliente.map((r) => [r[0], r[3]])).toEqual([['Cliente Grande', 1300], ['Cliente Chico', 60]]);
    const porProducto = dataRows(wb.getWorksheet('Por producto'));
    expect(porProducto.map((r) => [r[0], r[3], r[4]])).toEqual([['Tornillo', 12, 1200], ['Tuerca', 8, 160]]);

    const resumen = wb.getWorksheet('Resumen');
    const byLabel = {};
    resumen.eachRow((row) => {
      byLabel[row.getCell(1).value] = row.getCell(2).value;
    });
    expect(byLabel['Empresa']).toBe('Exportes Ñandú');
    expect(byLabel['Total vendido']).toBe(1360);
    expect(byLabel['Número de órdenes']).toBe(3);
    expect(byLabel['Ticket promedio']).toBeCloseTo(453.33, 2);
    expect(byLabel['Unidades']).toBe(20);
  });

  test('PDF: cabeceras, firma %PDF y fin %%EOF', async () => {
    const res = await exportAs(tokenA, { format: 'pdf', ...MARCH, status: 'all' });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toContain('filename="ventas_exportes-nandu_2026-03-01_2026-03-30.pdf"');
    expect(res.headers['access-control-expose-headers']).toBe('Content-Disposition');
    expect(res.body.subarray(0, 5).toString()).toBe('%PDF-');
    expect(res.body.subarray(-6).toString()).toContain('%%EOF');
  });

  test('PDF con más de 2,000 órdenes: responde un PDF válido con varias páginas', async () => {
    const big = await createTenant({ name: 'Exportes Grandes' });
    await createUser({ company: big.company, branch: big.branch, role: big.roles.administrador, email: 'admin-export-big@test.local' });
    const token = await login('admin-export-big@test.local', 'Clave1234');
    const cust = await insertCatalog(Customer, { companyId: big.company._id, code: 'C-1', name: 'Cliente' });
    const prod = await insertCatalog(Product, { companyId: big.company._id, sku: 'P-1', name: 'Producto', status: 'active' });
    const docs = [];
    for (let i = 0; i < 2100; i += 1) {
      docs.push(order(big, cust, new Date(Date.UTC(2026, 0, 1 + (i % 300), 18)).toISOString(), [[prod, 1, 10 + (i % 7)]]));
    }
    await SalesOrder.collection.insertMany(docs);

    const res = await exportAs(token, { format: 'pdf', from: '2026-01-01', to: '2026-12-31' });
    expect(res.status).toBe(200);
    expect(res.body.subarray(0, 5).toString()).toBe('%PDF-');
    const pages = (res.body.toString('latin1').match(/\/Type \/Page\b/g) || []).length;
    // 2,000 filas a ~43 por página + portada ⇒ unas 48 páginas (no 2,100 filas).
    expect(pages).toBeGreaterThan(40);
    expect(pages).toBeLessThan(60);
  });

  test('filtros: estado, cliente y producto', async () => {
    const all = await readWorkbook((await exportAs(tokenA, { format: 'xlsx', ...MARCH, status: 'all' })).body);
    expect(dataRows(all.getWorksheet('Ventas')).map((r) => r[5])).toEqual([
      'Aprobada', 'Aprobada', 'Borrador', 'Rechazada', 'Aprobada',
    ]);

    const drafts = await readWorkbook((await exportAs(tokenA, { format: 'xlsx', ...MARCH, status: 'DRAFT' })).body);
    expect(dataRows(drafts.getWorksheet('Ventas')).map((r) => r[8])).toEqual([100]);

    const byCustomer = await readWorkbook(
      (await exportAs(tokenA, { format: 'xlsx', ...MARCH, customerId: String(custA2._id) })).body
    );
    expect(dataRows(byCustomer.getWorksheet('Ventas')).map((r) => r[2])).toEqual(['Cliente Chico']);

    const byProduct = await readWorkbook(
      (await exportAs(tokenA, { format: 'xlsx', ...MARCH, productId: String(prodA2._id) })).body
    );
    expect(dataRows(byProduct.getWorksheet('Ventas')).map((r) => r[8])).toEqual([1100, 60]);
    // Detalle y "Por producto" sólo con las líneas del producto filtrado.
    expect(dataRows(byProduct.getWorksheet('Detalle')).map((r) => r[3])).toEqual(['Tuerca', 'Tuerca']);
    expect(dataRows(byProduct.getWorksheet('Por producto')).map((r) => r[0])).toEqual(['Tuerca']);

    // Filtro vacío de cliente (lo manda el formulario) = todos.
    const empty = await exportAs(tokenA, { format: 'xlsx', ...MARCH, customerId: '' });
    expect(empty.status).toBe(200);
  });

  test.each([
    ['desde posterior a hasta', { format: 'pdf', from: '2026-04-01', to: '2026-03-01' }],
    ['más de 24 meses', { format: 'pdf', from: '2024-01-01', to: '2026-01-02' }],
    ['fecha inexistente', { format: 'xlsx', from: '2026-02-30', to: '2026-03-30' }],
    ['formato de fecha', { format: 'xlsx', from: '01/03/2026', to: '2026-03-30' }],
    ['formato de archivo', { format: 'csv', ...MARCH }],
    ['estado desconocido', { format: 'pdf', ...MARCH, status: 'PAID' }],
    ['cliente inválido', { format: 'pdf', ...MARCH, customerId: 'abc' }],
    ['sin fechas', { format: 'pdf' }],
  ])('rango o filtro inválido (%s) ⇒ 400 JSON', async (_name, query) => {
    const res = await request(app).get('/api/v1/reports/sales/export').query(query).set(auth(tokenA));
    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  test('exactamente 24 meses es válido', async () => {
    const res = await exportAs(tokenA, { format: 'xlsx', from: '2024-03-30', to: '2026-03-30' });
    expect(res.status).toBe(200);
  });

  test('sin reports.read ⇒ 403; sin token ⇒ 401', async () => {
    const forbidden = await request(app)
      .get('/api/v1/reports/sales/export')
      .query({ format: 'pdf', ...MARCH })
      .set(auth(tokenAlmacen));
    expect(forbidden.status).toBe(403);

    const anonymous = await request(app).get('/api/v1/reports/sales/export').query({ format: 'pdf', ...MARCH });
    expect(anonymous.status).toBe(401);
  });

  test('aislamiento: cada empresa sólo exporta sus ventas y no usa clientes ajenos', async () => {
    const b = await readWorkbook((await exportAs(tokenB, { format: 'xlsx', ...MARCH })).body);
    const rows = dataRows(b.getWorksheet('Ventas'));
    expect(rows).toHaveLength(1);
    expect(rows[0][2]).toBe('Cliente de B');

    const a = await readWorkbook((await exportAs(tokenA, { format: 'xlsx', ...MARCH, status: 'all' })).body);
    expect(dataRows(a.getWorksheet('Ventas')).map((r) => r[2])).not.toContain('Cliente de B');

    // Un cliente de la empresa B no sirve como filtro en la empresa A.
    const foreign = await request(app)
      .get('/api/v1/reports/sales/export')
      .query({ format: 'xlsx', ...MARCH, customerId: String(custB._id) })
      .set(auth(tokenA));
    expect(foreign.status).toBe(400);

    // Un id inexistente tampoco filtra en silencio.
    const missing = await request(app)
      .get('/api/v1/reports/sales/export')
      .query({ format: 'xlsx', ...MARCH, productId: String(new mongoose.Types.ObjectId()) })
      .set(auth(tokenA));
    expect(missing.status).toBe(400);
  });
});
