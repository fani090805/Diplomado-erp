import React, { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { COLORS } from '../../design-system/tokens';
import { TTConfirmModal, TTTabs, formatCount } from '../../design-system/components';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import ProductFormModal from '../../components/inventory/ProductFormModal';
import { useList } from '../../hooks/useResource';
import { useLiveUpdates } from '../../hooks/useLiveUpdates';

/** Catálogo con baja lógica y borrado físico protegido por su historial. */
export default function ProductsScreen() {
  const { can } = useAuth();
  const [status, setStatus] = useState('active');
  const list = useList('/products', { status });
  const [counts, setCounts] = useState({ active: 0, inactive: 0 });
  const [countsKey, setCountsKey] = useState(0);
  const [confirmation, setConfirmation] = useState(null);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all(['active', 'inactive'].map(async (productStatus) => {
      const result = await api('/products', { query: { status: productStatus, page: 1, limit: 1 }, withMeta: true });
      return [productStatus, result.meta?.total || 0];
    }))
      .then((entries) => {
        if (!cancelled) setCounts(Object.fromEntries(entries));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [countsKey]);

  // La tabla ya se refresca sola (useList); los contadores de las pestañas también.
  useLiveUpdates('product', () => setCountsKey((key) => key + 1));

  useEffect(() => {
    list.setPage(1);
    // La pestaña cambia el filtro del listado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const money = (n) => (n === null || n === undefined || n === '' ? '—' : `$${Number(n).toFixed(2)}`);
  const refresh = () => {
    list.reload();
    setCountsKey((key) => key + 1);
  };

  const ask = (config) => setConfirmation(config);
  const runConfirmation = async () => {
    const action = confirmation?.action;
    setConfirmation(null);
    if (!action) return;
    try {
      await action();
      refresh();
    } catch (error) {
      if (error.status === 409) {
        setConfirmation({
          title: 'Producto con historial',
          message: error.message,
          confirmLabel: 'Entendido',
          informational: true,
        });
      } else {
        setConfirmation({ title: 'No se pudo completar la acción', message: error.message, isError: true });
      }
    }
  };

  return (
    <>
      <DataTable
        title="Productos"
        subtitle={`${formatCount(list.total)} registros`}
        filters={[
          <TTTabs
            key="status"
            activeTab={status}
            onChangeTab={setStatus}
            tabs={[
              { key: 'active', label: 'Activos', badge: formatCount(counts.active) },
              { key: 'inactive', label: 'Inactivos', badge: formatCount(counts.inactive) },
            ]}
          />,
        ]}
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
        onRefresh={refresh}
        page={list.page}
        total={list.total}
        limit={list.limit}
        onPageChange={list.setPage}
        onCreate={can('products.create') ? () => setEditing({}) : undefined}
        rowActions={(row) => [
          ...(can('products.update')
            ? [
                { label: 'Editar', onPress: () => setEditing(row) },
                ...(status === 'active'
                  ? [{
                      label: 'Desactivar',
                      onPress: () => ask({
                        title: 'Desactivar producto',
                        message: `¿Desactivar ${row.name}? Ya no se podrá vender ni comprar. Su historial se conserva y podrás reactivarlo.`,
                        confirmLabel: 'Desactivar',
                        action: () => api(`/products/${row._id}/deactivate`, { method: 'PATCH' }),
                      }),
                    }]
                  : [{
                      label: 'Reactivar',
                      primary: true,
                      onPress: () => ask({
                        title: 'Reactivar producto',
                        message: `¿Reactivar ${row.name}?`,
                        confirmLabel: 'Reactivar',
                        action: () => api(`/products/${row._id}/reactivate`, { method: 'PATCH' }),
                      }),
                    }]),
              ]
            : []),
          ...(can('products.delete') && !row.hasHistory
            ? [{
                label: status === 'active' ? 'Eliminar' : 'Eliminar definitivamente',
                danger: true,
                onPress: () => ask({
                  title: 'Eliminar producto definitivamente',
                  message: `¿Eliminar ${row.name} definitivamente? Esta acción no se puede deshacer.`,
                  confirmLabel: 'Eliminar definitivamente',
                  destructive: true,
                  action: () => api(`/products/${row._id}`, { method: 'DELETE' }),
                }),
              }]
            : []),
        ]}
      />

      <ProductFormModal
        product={editing}
        onSaved={() => {
          setEditing(null);
          refresh();
        }}
        onCancel={() => setEditing(null)}
      />
      <TTConfirmModal
        visible={Boolean(confirmation)}
        title={confirmation?.title}
        message={confirmation?.message || ''}
        isError={Boolean(confirmation?.isError)}
        destructive={Boolean(confirmation?.destructive)}
        confirmLabel={confirmation?.confirmLabel || 'Confirmar'}
        cancelLabel="Cancelar"
        onCancel={() => setConfirmation(null)}
        onConfirm={confirmation?.informational ? () => setConfirmation(null) : runConfirmation}
      />
    </>
  );
}

const styles = { td: { fontSize: 14, color: COLORS.textPrimary } };
