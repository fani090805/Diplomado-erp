import React, { useState } from 'react';
import { COLORS } from '../../design-system/tokens';
import { Text } from 'react-native';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { useConfirm } from '../../components/Confirm';
import DataTable from '../../components/DataTable';
import { formatCount } from '../../design-system/components';
import StatusBadge from '../../components/StatusBadge';
import ProductFormModal from '../../components/inventory/ProductFormModal';
import { useList } from '../../hooks/useResource';

/** CRUD de productos (lectura, alta, edición y baja lógica por estado). */
export default function ProductsScreen() {
  const { can } = useAuth();
  const list = useList('/products');
  const [confirmUI, confirm] = useConfirm();
  const [editing, setEditing] = useState(null);

  const money = (n) => (n === null || n === undefined || n === '' ? '—' : `$${Number(n).toFixed(2)}`);

  return (
    <>
      <DataTable
        title="Productos"
        subtitle={`${formatCount(list.total)} registros`}
        columns={[
          { key: 'sku', label: 'SKU', width: 110 },
          { key: 'name', label: 'Nombre', width: 210 },
          { key: 'category', label: 'Categoría', width: 120 },
          { key: 'costPrice', label: 'Costo', width: 90, render: (r) => <Text style={styles.td}>{money(r.costPrice)}</Text> },
          { key: 'salePrice', label: 'Precio', width: 90, render: (r) => <Text style={styles.td}>{money(r.salePrice)}</Text> },
          { key: 'minStock', label: 'Stock mín.', width: 90 },
          { key: 'maxStock', label: 'Stock máx.', width: 90 },
          { key: 'status', label: 'Estado', width: 100, render: (r) => <StatusBadge value={r.status} /> },
        ]}
        rows={list.items}
        loading={list.loading}
        error={list.error}
        search={list.search}
        onSearchChange={list.setSearch}
        onRefresh={list.reload}
        page={list.page}
        total={list.total}
        limit={list.limit}
        onPageChange={list.setPage}
        onCreate={can('products.create') ? () => setEditing({}) : undefined}
        rowActions={(row) => [
          ...(can('products.update')
            ? [{ label: 'Editar', onPress: () => setEditing(row) }]
            : []),
          ...(can('products.delete')
            ? [
                {
                  label: 'Eliminar',
                  danger: true,
                  onPress: () =>
                    confirm(`¿Eliminar el producto "${row.name}"? Esta acción no se puede deshacer.`, async () => {
                      await api(`/products/${row._id}`, { method: 'DELETE' });
                      list.reload();
                    }),
                },
              ]
            : []),
        ]}
      />

      <ProductFormModal
        product={editing}
        onSaved={() => {
          setEditing(null);
          list.reload();
        }}
        onCancel={() => setEditing(null)}
      />
      {confirmUI}
    </>
  );
}

const styles = { td: { fontSize: 14, color: COLORS.textPrimary } };
