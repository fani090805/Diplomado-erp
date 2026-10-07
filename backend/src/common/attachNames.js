'use strict';

/**
 * Agrega a cada documento el nombre de una referencia (cliente, proveedor…)
 * con UNA consulta por página, sin depender de que el cliente cargue el
 * catálogo completo.
 *
 * Multiempresa: la búsqueda filtra por los companyId de los propios
 * documentos y el nombre sólo se asigna si la referencia es de la MISMA
 * empresa que el documento (un id ajeno nunca muestra un nombre).
 *
 * @param {object[]} items      documentos lean (con companyId)
 * @param {object}   options
 * @param {object}   options.repository  repositorio con findAll(filter, { projection })
 * @param {string}   options.idField     campo con el id referido (p. ej. 'customerId')
 * @param {string}   options.nameField   campo a agregar (p. ej. 'customerName')
 */
async function attachNames(items, { repository, idField, nameField }) {
  const refs = items.filter((item) => item && item[idField] && item.companyId);
  if (!refs.length) return items.map((item) => ({ ...item, [nameField]: null }));

  const ids = [...new Set(refs.map((item) => String(item[idField])))];
  const companies = [...new Set(refs.map((item) => String(item.companyId)))];
  const rows = await repository.findAll(
    { _id: { $in: ids }, companyId: { $in: companies } },
    { projection: 'name companyId' }
  );
  const byKey = new Map(rows.map((row) => [`${row.companyId}:${row._id}`, row.name]));

  return items.map((item) => ({
    ...item,
    [nameField]: item && item[idField] ? byKey.get(`${item.companyId}:${item[idField]}`) || null : null,
  }));
}

module.exports = attachNames;
