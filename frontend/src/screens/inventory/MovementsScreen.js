import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../design-system/tokens';
import { formatCount, TTButton, TTIcon, TTSelect } from '../../design-system/components';
import { useAuth } from '../../auth/AuthContext';
import DataTable from '../../components/DataTable';
import MovementFormModal from '../../components/inventory/MovementFormModal';
import { useList, usePicklist } from '../../hooks/useResource';
import { useUrlState } from '../../nav/urlState';

const TYPE_OPTIONS = [
  { value: 'ENTRY', label: 'Entrada' },
  { value: 'EXIT', label: 'Salida' },
  { value: 'ADJUSTMENT', label: 'Ajuste' },
  { value: 'TRANSFER', label: 'Transferencia' },
];

/** Botones de la barra de la tabla (cada uno con su permiso). */
const MOVEMENT_ACTIONS = [
  { kind: 'ENTRY', label: 'Entrada', icon: 'entrada', permission: 'inventory.movements.create' },
  { kind: 'EXIT', label: 'Salida', icon: 'salida', permission: 'inventory.movements.create' },
  { kind: 'ADJUSTMENT', label: 'Ajuste', icon: 'ajuste', permission: 'inventory.adjustments.create' },
  { kind: 'TRANSFER', label: 'Transferencia', icon: 'intercambio', permission: 'inventory.transfers.create' },
];

const TYPE_FILTER_OPTIONS = [{ value: '', label: 'Todos' }, ...TYPE_OPTIONS];

const TYPE_LABEL = { ENTRY: 'Entrada', EXIT: 'Salida', ADJUSTMENT: 'Ajuste', TRANSFER: 'Transferencia' };

/**
 * Histórico inmutable de movimientos (ADR-008: sin PATCH/DELETE) + creación
 * de los cuatro tipos con sus permisos diferenciados del catálogo RBAC.
 */
export default function MovementsScreen() {
  const { can } = useAuth();
  const products = usePicklist('/products', (r) => r.name || r.sku || String(r._id));
  const warehouses = usePicklist('/warehouses', (r) => r.name || r.code || String(r._id));

  const [kind, setKind] = useState(null); // null | ENTRY | EXIT | ADJUSTMENT | TRANSFER
  const [typeFilter, setTypeFilter] = useUrlState('type', '', ['', 'ENTRY', 'EXIT', 'ADJUSTMENT', 'TRANSFER']);

  const query = useMemo(() => (typeFilter ? { type: typeFilter } : {}), [typeFilter]);
  const list = useList('/inventory/movements', query);

  const productLabels = useMemo(() => {
    const map = {};
    for (const o of products.options) map[o.value] = o.label;
    return map;
  }, [products.options]);
  const warehouseLabels = useMemo(() => {
    const map = {};
    for (const o of warehouses.options) map[o.value] = o.label;
    return map;
  }, [warehouses.options]);

  const nameOf = (v, labels) => {
    if (v && typeof v === 'object') return v.name || v.sku || v.code || String(v._id);
    if (!v) return '—';
    return labels[v] || String(v);
  };

  const dateOf = (v) => {
    if (!v) return '—';
    try {
      return new Date(v).toLocaleString();
    } catch {
      return String(v);
    }
  };

  return (
    <View style={styles.wrap}>
      <DataTable
        title="Movimientos de inventario"
        subtitle={`${formatCount(list.total)} registros`}
        filters={
          <TTSelect
            size="toolbar"
            valuePrefix="Tipo"
            value={typeFilter || null}
            onChange={(v) => setTypeFilter(v || '')}
            options={TYPE_FILTER_OPTIONS}
            placeholder="Tipo: todos"
          />
        }
        extraActions={MOVEMENT_ACTIONS.filter((a) => can(a.permission)).map((a) => (
          <TTButton
            key={a.kind}
            variant="secondary"
            size="toolbar"
            onPress={() => setKind(a.kind)}
            iconLeft={<TTIcon name={a.icon} size={16} color={COLORS.textPrimary} />}
          >
            {a.label}
          </TTButton>
        ))}
        columns={[
          { key: 'createdAt', label: 'Fecha', width: 150, render: (r) => <Text style={styles.td}>{dateOf(r.createdAt)}</Text> },
          { key: 'type', label: 'Tipo', width: 110, render: (r) => <Text style={styles.type}>{TYPE_LABEL[r.type] || r.type}</Text> },
          { key: 'productId', label: 'Producto', width: 190, render: (r) => <Text style={styles.td}>{nameOf(r.productId, productLabels)}</Text> },
          {
            key: 'warehouseId',
            label: 'Almacén',
            width: 170,
            render: (r) => (
              <Text style={styles.td}>
                {r.type === 'TRANSFER'
                  ? `${nameOf(r.fromWarehouseId, warehouseLabels)} → ${nameOf(r.toWarehouseId, warehouseLabels)}`
                  : nameOf(r.warehouseId, warehouseLabels)}
              </Text>
            ),
          },
          { key: 'quantity', label: 'Cantidad', width: 90, render: (r) => <Text style={styles.qty}>{Number(r.quantity ?? 0)}</Text> },
          { key: 'reason', label: 'Motivo', width: 170 },
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
        emptyText="Sin movimientos registrados."
      />

      <MovementFormModal
        kind={kind}
        productOptions={products.options}
        warehouseOptions={warehouses.options}
        onSaved={() => {
          setKind(null);
          list.reload();
        }}
        onCancel={() => setKind(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  td: { fontSize: 14, color: COLORS.textPrimary },
  type: { fontSize: 13, fontWeight: '700', color: COLORS.successText },
  qty: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
});
