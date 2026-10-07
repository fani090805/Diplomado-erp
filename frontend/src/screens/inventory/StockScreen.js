import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../design-system/tokens';
import { formatCount, TTBadge, TTButton, TTConfirmModal, TTIcon, TTSelect, TTStatCard } from '../../design-system/components';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import DataTable from '../../components/DataTable';
import MovementFormModal from '../../components/inventory/MovementFormModal';
import ProductFormModal from '../../components/inventory/ProductFormModal';
import { fetchAll, usePicklist } from '../../hooks/useResource';
import { useLiveUpdates } from '../../hooks/useLiveUpdates';
import { money } from '../../lib/format';
import { useUrlState } from '../../nav/urlState';

const PAGE_SIZE = 20;

const idOf = (value) => (value && typeof value === 'object' ? String(value._id) : value ? String(value) : '');

/**
 * Existencias por producto y almacén, con alta rápida de productos y registro
 * de entradas/salidas sin salir de la pantalla. El valor se calcula con el
 * costo del producto (el mismo criterio que el reporte de inventario).
 */
export default function StockScreen() {
  const { can } = useAuth();
  const warehouses = usePicklist('/warehouses', (r) => r.name || r.code || String(r._id));

  const [stock, setStock] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [productId, setProductId] = useUrlState('product', '');
  const [warehouseId, setWarehouseId] = useUrlState('warehouse', '');
  const [page, setPage] = useUrlState('page', 1);

  const [newProduct, setNewProduct] = useState(null);
  const [askInitialStock, setAskInitialStock] = useState(null); // producto recién creado
  const [movement, setMovement] = useState(null); // { kind, initial }
  const [productConfirmation, setProductConfirmation] = useState(null);

  const canCreateProduct = can('products.create');
  const canMove = can('inventory.movements.create');

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  // Existencias y catálogo cambian con entradas, salidas, ventas y compras aprobadas.
  useLiveUpdates(['inventory', 'product'], reload);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchAll('/inventory/stock'),
      can('products.read') ? fetchAll('/products') : Promise.resolve([]),
      can('products.read') ? fetchAll('/products', { status: 'inactive' }) : Promise.resolve([]),
    ])
      .then(([stockRows, productRows, inactiveProductRows]) => {
        if (cancelled) return;
        setStock(stockRows);
        setProducts([...productRows, ...inactiveProductRows]);
        setError(null);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [can, reloadKey]);

  const productById = useMemo(() => new Map(products.map((p) => [String(p._id), p])), [products]);
  const productOptions = useMemo(
    () => products.filter((p) => p.status === 'active').map((p) => ({ value: String(p._id), label: p.sku ? `${p.name} (${p.sku})` : p.name })),
    [products]
  );

  /** Filas enriquecidas con costo, valor y estado de existencia. */
  const rows = useMemo(
    () =>
      stock.map((row) => {
        const product = productById.get(idOf(row.productId)) || {};
        const quantity = Number(row.quantity ?? 0);
        const minStock = Number(product.minStock ?? 0);
        const cost = product.costPrice === undefined || product.costPrice === null ? null : Number(product.costPrice);
        return {
          ...row,
          productKey: idOf(row.productId),
          warehouseKey: idOf(row.warehouseId),
          name: row.product?.name || product.name || '—',
          sku: row.product?.sku || product.sku || '',
          unit: row.product?.unit || product.unit || '',
          warehouseName: row.warehouse?.name || row.warehouse?.code || '—',
          quantity,
          cost,
          value: cost === null ? null : quantity * cost,
          level: quantity <= 0 ? 'empty' : minStock > 0 && quantity <= minStock ? 'low' : 'ok',
        };
      }),
    [stock, productById]
  );

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) => (!productId || r.productKey === productId) && (!warehouseId || r.warehouseKey === warehouseId)
      ),
    [rows, productId, warehouseId]
  );
  useEffect(() => setPage(1), [productId, warehouseId]);

  const summary = useMemo(() => {
    const withAlert = new Set(rows.filter((r) => r.level !== 'ok').map((r) => r.productKey));
    const hasCosts = rows.some((r) => r.value !== null);
    return {
      products: products.length || new Set(rows.map((r) => r.productKey)).size,
      value: hasCosts ? rows.reduce((sum, r) => sum + (r.value || 0), 0) : null,
      lowStock: withAlert.size,
    };
  }, [rows, products.length]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const onProductSaved = (product, { created }) => {
    setNewProduct(null);
    reload();
    if (created && canMove && product?._id) setAskInitialStock(product);
  };

  const confirmProductAction = async () => {
    const action = productConfirmation?.action;
    setProductConfirmation(null);
    if (!action) return;
    try {
      await action();
      reload();
    } catch (actionError) {
      setProductConfirmation({
        title: actionError.status === 409 ? 'Producto con historial' : 'No se pudo desactivar',
        message: actionError.message,
        informational: true,
      });
    }
  };

  const openMovement = (kind, initial = null) => setMovement({ kind, initial });

  const extraActions = canMove ? (
    <>
      <TTButton
        variant="secondary"
        size="toolbar"
        onPress={() => openMovement('ENTRY')}
        iconLeft={<TTIcon name="entrada" size={16} color={COLORS.textPrimary} />}
      >
        Registrar entrada
      </TTButton>
      <TTButton
        variant="secondary"
        size="toolbar"
        onPress={() => openMovement('EXIT')}
        iconLeft={<TTIcon name="salida" size={16} color={COLORS.textPrimary} />}
      >
        Registrar salida
      </TTButton>
    </>
  ) : null;

  return (
    <View style={styles.wrap}>
      <View style={styles.summary}>
        <TTStatCard
          label="Productos"
          value={loading ? '…' : String(summary.products)}
          icon="productos"
          trend="Catálogo activo"
          style={styles.stat}
        />
        <TTStatCard
          label="Valor del inventario"
          value={loading ? '…' : summary.value === null ? 'Sin datos aún' : money(summary.value)}
          icon="dinero"
          trend="A costo del producto"
          style={styles.stat}
        />
        <TTStatCard
          label="Stock bajo"
          value={loading ? '…' : String(summary.lowStock)}
          icon="alerta"
          trend={summary.lowStock > 0 ? 'Productos por reponer' : 'Todo en orden'}
          trendType={summary.lowStock > 0 ? 'negative' : 'positive'}
          style={styles.stat}
        />
      </View>

      <DataTable
        title="Existencias"
        subtitle={`${formatCount(filtered.length)} registros`}
        filters={[
          <TTSelect
            key="product"
            size="toolbar"
            valuePrefix="Producto"
            title="Producto"
            value={productId || null}
            onChange={(v) => setProductId(v || '')}
            options={[{ value: '', label: 'Todos' }, ...productOptions]}
            placeholder="Producto: todos"
          />,
          <TTSelect
            key="warehouse"
            size="toolbar"
            valuePrefix="Almacén"
            value={warehouseId || null}
            onChange={(v) => setWarehouseId(v || '')}
            options={[{ value: '', label: 'Todos' }, ...warehouses.options]}
            placeholder="Almacén: todos"
          />,
        ]}
        columns={[
          {
            key: 'product',
            label: 'Producto',
            width: 230,
            render: (r) => (
              <View style={styles.productCell}>
                <Text style={styles.td} numberOfLines={1}>{r.name}</Text>
                {r.sku ? <Text style={styles.sku}>{r.sku}</Text> : null}
                {r.level !== 'ok' ? (
                  <TTBadge
                    value={r.level}
                    label={r.level === 'empty' ? 'Sin stock' : 'Stock bajo'}
                    variant={r.level === 'empty' ? 'negative' : 'pending'}
                  />
                ) : null}
              </View>
            ),
          },
          { key: 'warehouse', label: 'Almacén', width: 150, render: (r) => <Text style={styles.td}>{r.warehouseName}</Text> },
          { key: 'quantity', label: 'Cantidad', width: 100, render: (r) => <Text style={styles.qty}>{r.quantity}</Text> },
          { key: 'unit', label: 'Unidad', width: 90, render: (r) => <Text style={styles.td}>{r.unit || '—'}</Text> },
          {
            key: 'cost',
            label: 'Costo unitario',
            width: 120,
            render: (r) => <Text style={styles.td}>{r.cost === null ? '—' : money(r.cost)}</Text>,
          },
          {
            key: 'value',
            label: 'Valor total',
            width: 130,
            render: (r) => <Text style={styles.qty}>{r.value === null ? '—' : money(r.value)}</Text>,
          },
        ]}
        rows={pageRows}
        rowActions={can('products.update') ? (row) => [
          {
            label: 'Editar producto',
            onPress: () => setNewProduct(productById.get(row.productKey) || null),
          },
          ...(productById.get(row.productKey)?.status === 'active' ? [{
            label: 'Desactivar producto',
            onPress: () => setProductConfirmation({
              title: 'Desactivar producto',
              message: `¿Desactivar ${row.name}? Ya no se podrá vender ni comprar. Su historial se conserva y podrás reactivarlo.`,
              action: () => api(`/products/${row.productKey}/deactivate`, { method: 'PATCH' }),
            }),
          }] : []),
        ] : undefined}
        loading={loading}
        error={error}
        onRefresh={reload}
        page={page}
        total={filtered.length}
        limit={PAGE_SIZE}
        onPageChange={setPage}
        extraActions={extraActions}
        onCreate={canCreateProduct ? () => setNewProduct({}) : undefined}
        createLabel="Nuevo producto"
        emptyTitle="Aún no hay existencias"
        emptyText={
          productId || warehouseId
            ? 'No hay existencias con estos filtros.'
            : 'Aún no hay existencias. Crea un producto y registra una entrada para empezar.'
        }
      />

      <ProductFormModal product={newProduct} onSaved={onProductSaved} onCancel={() => setNewProduct(null)} />

      <TTConfirmModal
        visible={Boolean(askInitialStock)}
        title="Producto creado"
        message={`¿Quieres registrar existencias iniciales de "${askInitialStock?.name || ''}"?`}
        confirmLabel="Registrar entrada"
        cancelLabel="Ahora no"
        onCancel={() => setAskInitialStock(null)}
        onConfirm={() => {
          const product = askInitialStock;
          setAskInitialStock(null);
          openMovement('ENTRY', { productId: String(product._id) });
        }}
      />

      <TTConfirmModal
        visible={Boolean(productConfirmation)}
        title={productConfirmation?.title}
        message={productConfirmation?.message || ''}
        onCancel={() => setProductConfirmation(null)}
        onConfirm={productConfirmation?.informational ? () => setProductConfirmation(null) : confirmProductAction}
        confirmLabel={productConfirmation?.informational ? 'Entendido' : 'Desactivar'}
      />

      <MovementFormModal
        kind={movement?.kind || null}
        initial={movement?.initial || null}
        productOptions={productOptions}
        warehouseOptions={warehouses.options}
        onSaved={() => {
          setMovement(null);
          reload();
        }}
        onCancel={() => setMovement(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: SPACING.md },
  summary: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  stat: { flex: 1, minWidth: 200 },
  productCell: { gap: 4, alignItems: 'flex-start' },
  td: { fontSize: 14, color: COLORS.textPrimary },
  sku: { fontSize: 12, color: COLORS.textMuted, fontFamily: TYPOGRAPHY.fontFamily.ui },
  qty: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
});
