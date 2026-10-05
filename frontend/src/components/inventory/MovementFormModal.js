import React, { useMemo } from 'react';
import { api } from '../../api/client';
import FormModal from '../FormModal';

const PATHS = {
  ENTRY: '/inventory/entries',
  EXIT: '/inventory/exits',
  ADJUSTMENT: '/inventory/adjustments',
  TRANSFER: '/inventory/transfers',
};

const TITLES = {
  ENTRY: 'Registrar entrada',
  EXIT: 'Registrar salida',
  ADJUSTMENT: 'Nuevo ajuste',
  TRANSFER: 'Nueva transferencia',
};

function buildFields(kind, productOptions, warehouseOptions) {
  if (kind === 'TRANSFER') {
    return [
      { name: 'productId', label: 'Producto', type: 'select', options: productOptions, required: true },
      { name: 'fromWarehouseId', label: 'Almacén origen', type: 'select', options: warehouseOptions, required: true },
      { name: 'toWarehouseId', label: 'Almacén destino', type: 'select', options: warehouseOptions, required: true },
      { name: 'quantity', label: 'Cantidad', type: 'number', required: true },
      { name: 'reason', label: 'Motivo' },
      { name: 'reference', label: 'Referencia (documento)' },
    ];
  }
  return [
    { name: 'productId', label: 'Producto', type: 'select', options: productOptions, required: true },
    { name: 'warehouseId', label: 'Almacén', type: 'select', options: warehouseOptions, required: true },
    {
      name: 'quantity',
      label: kind === 'ADJUSTMENT' ? 'Cantidad final (recuento)' : 'Cantidad',
      type: 'number',
      required: true,
    },
    {
      name: 'reason',
      label: 'Motivo',
      required: kind === 'ADJUSTMENT',
      hint: kind === 'ADJUSTMENT' ? 'Obligatorio en ajustes.' : undefined,
    },
    { name: 'reference', label: 'Referencia (documento)' },
  ];
}

/**
 * Formulario de movimientos de inventario (entrada, salida, ajuste o
 * transferencia), compartido por Movimientos y Existencias.
 * `kind`: null = cerrado. `initial` permite preseleccionar el producto.
 */
export default function MovementFormModal({ kind, productOptions, warehouseOptions, initial = null, onSaved, onCancel }) {
  const fields = useMemo(
    () => buildFields(kind, productOptions, warehouseOptions),
    [kind, productOptions, warehouseOptions]
  );

  const submit = async (values) => {
    const saved = await api(PATHS[kind], { method: 'POST', body: values });
    onSaved(saved);
  };

  return (
    <FormModal
      visible={Boolean(kind)}
      title={TITLES[kind] || ''}
      fields={fields}
      initial={initial}
      onSubmit={submit}
      onCancel={onCancel}
    />
  );
}
