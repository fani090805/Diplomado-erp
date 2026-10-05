import React from 'react';
import { api } from '../../api/client';
import FormModal from '../FormModal';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
];
const TRACKING_OPTIONS = [
  { value: 'none', label: 'Sin seguimiento' },
  { value: 'lot', label: 'Por lote' },
  { value: 'serial', label: 'Por serie' },
];

export const PRODUCT_FIELDS = [
  { name: 'sku', label: 'SKU', required: true, placeholder: 'PROD-001' },
  { name: 'name', label: 'Nombre', required: true },
  { name: 'barcode', label: 'Código de barras' },
  { name: 'category', label: 'Categoría' },
  { name: 'unit', label: 'Unidad (ud, kg…)' },
  { name: 'trackingMode', label: 'Trazabilidad', type: 'select', options: TRACKING_OPTIONS, defaultValue: 'none' },
  { name: 'costPrice', label: 'Costo', type: 'number' },
  { name: 'salePrice', label: 'Precio de venta', type: 'number' },
  { name: 'taxRate', label: 'Impuesto (%)', type: 'number' },
  { name: 'minStock', label: 'Stock mínimo', type: 'number' },
  { name: 'maxStock', label: 'Stock máximo', type: 'number' },
  { name: 'description', label: 'Descripción', type: 'textarea' },
  { name: 'status', label: 'Estado', type: 'select', options: STATUS_OPTIONS, defaultValue: 'active' },
];

/**
 * Alta / edición de productos (compartido por Productos y Existencias).
 * `product`: null = cerrado, {} = alta, {_id,…} = edición.
 * onSaved(producto, { created }) recibe el producto devuelto por la API.
 */
export default function ProductFormModal({ product, onSaved, onCancel }) {
  const isEdit = Boolean(product && product._id);

  const submit = async (values) => {
    const saved = isEdit
      ? await api(`/products/${product._id}`, { method: 'PATCH', body: values })
      : await api('/products', { method: 'POST', body: values });
    onSaved(saved, { created: !isEdit });
  };

  return (
    <FormModal
      visible={Boolean(product)}
      title={isEdit ? 'Editar producto' : 'Nuevo producto'}
      fields={PRODUCT_FIELDS}
      initial={product}
      onSubmit={submit}
      onCancel={onCancel}
    />
  );
}
