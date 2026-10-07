'use strict';

const fs = require('fs');
const JSZip = require('jszip');

/**
 * Inserta una imagen (logo) en la esquina superior izquierda de una hoja de
 * un .xlsx YA generado.
 *
 * Por qué: el WorkbookWriter en streaming de exceljs no escribe dibujos
 * (sólo imágenes de fondo). El Excel se sigue generando en streaming (memoria
 * baja con 10,000+ ventas); al terminar, el .xlsx comprimido (~2 MB) se abre
 * aquí, se le agregan las partes de dibujo de OOXML y se vuelve a comprimir.
 * Sólo se leen/modifican la hoja indicada, sus relaciones y [Content_Types].xml;
 * las hojas grandes no se descomprimen.
 */
const EMU_PER_PX = 9525;
const NS_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const REL_DRAWING = `${NS_REL}/drawing`;
const REL_IMAGE = `${NS_REL}/image`;
const DRAWING_CT = 'application/vnd.openxmlformats-officedocument.drawing+xml';
const LOGO_REL_ID = 'rIdFaiLogo';
// Sin entradas de carpeta en el zip (como los .xlsx que genera Excel).
const NO_FOLDERS = { createFolders: false };
// El medio se llama image1.png: nombre alfanumérico estándar que Excel y
// lectores como ExcelJS reconocen (con guiones, ExcelJS lo ignora).

function drawingXml(sizePx) {
  const ext = sizePx * EMU_PER_PX;
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" ' +
    'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">' +
    '<xdr:oneCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>76200</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>38100</xdr:rowOff></xdr:from>' +
    `<xdr:ext cx="${ext}" cy="${ext}"/>` +
    '<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="2" name="Logo FAI" descr="FAI Solution ERP"/>' +
    '<xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr>' +
    `<xdr:blipFill><a:blip xmlns:r="${NS_REL}" r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>` +
    `<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${ext}" cy="${ext}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr>` +
    '</xdr:pic><xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>'
  );
}

const relsXml = (relationships) =>
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  relationships.map(({ id, type, target }) => `<Relationship Id="${id}" Type="${type}" Target="${target}"/>`).join('') +
  '</Relationships>';

/**
 * @param {Buffer} xlsx     archivo .xlsx completo
 * @param {object} options  { logoPath, sheet = 1, sizePx = 36 }
 * @returns {Promise<Buffer>} el .xlsx con el logo
 */
async function addLogoToXlsx(xlsx, { logoPath, sheet = 1, sizePx = 36 }) {
  const zip = await JSZip.loadAsync(xlsx);
  const sheetPath = `xl/worksheets/sheet${sheet}.xml`;
  const sheetRelsPath = `xl/worksheets/_rels/sheet${sheet}.xml.rels`;
  const sheetFile = zip.file(sheetPath);
  if (!sheetFile) throw new Error(`No existe la hoja ${sheet} en el Excel.`);

  // 1) Imagen y dibujo con su relación a la imagen.
  zip.file('xl/media/image1.png', fs.readFileSync(logoPath), NO_FOLDERS);
  zip.file('xl/drawings/drawing1.xml', drawingXml(sizePx), NO_FOLDERS);
  zip.file('xl/drawings/_rels/drawing1.xml.rels', relsXml([{ id: 'rId1', type: REL_IMAGE, target: '../media/image1.png' }]), NO_FOLDERS);

  // 2) La hoja apunta al dibujo (relación + elemento <drawing>, tras pageSetup).
  if (zip.file(sheetRelsPath)) {
    const rels = await zip.file(sheetRelsPath).async('string');
    zip.file(sheetRelsPath, rels.replace('</Relationships>', `<Relationship Id="${LOGO_REL_ID}" Type="${REL_DRAWING}" Target="../drawings/drawing1.xml"/></Relationships>`), NO_FOLDERS);
  } else {
    zip.file(sheetRelsPath, relsXml([{ id: LOGO_REL_ID, type: REL_DRAWING, target: '../drawings/drawing1.xml' }]), NO_FOLDERS);
  }
  let sheetXml = await sheetFile.async('string');
  const drawingTag = `<drawing r:id="${LOGO_REL_ID}"/>`;
  const before = ['<legacyDrawing', '<legacyDrawingHF', '<picture', '<oleObjects', '<controls', '<webPublishItems', '<tableParts', '<extLst']
    .map((tag) => sheetXml.indexOf(tag))
    .filter((i) => i >= 0);
  const at = before.length ? Math.min(...before) : sheetXml.lastIndexOf('</worksheet>');
  sheetXml = sheetXml.slice(0, at) + drawingTag + sheetXml.slice(at);
  zip.file(sheetPath, sheetXml, NO_FOLDERS);

  // 3) Tipos de contenido: png y el dibujo.
  let types = await zip.file('[Content_Types].xml').async('string');
  if (!/Extension="png"/i.test(types)) {
    types = types.replace('<Default Extension="xml"', '<Default Extension="png" ContentType="image/png"/><Default Extension="xml"');
  }
  types = types.replace('</Types>', `<Override PartName="/xl/drawings/drawing1.xml" ContentType="${DRAWING_CT}"/></Types>`);
  zip.file('[Content_Types].xml', types, NO_FOLDERS);

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

module.exports = { addLogoToXlsx };
