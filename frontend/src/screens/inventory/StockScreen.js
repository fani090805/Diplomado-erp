import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../design-system/tokens';
import { TTBadge, TTButton, TTConfirmModal, TTIcon, TTStatCard } from '../../design-system/components';
import { useAuth } from '../../auth/AuthContext';
import DataTable from '../../components/DataTable';
import Dropdown from '../../components/Dropdown';
import MovementFormModal from '../../components/inventory/MovementFormModal';
import ProductFormModal from '../../components/inventory/ProductFormModal';
import { fetchAll, usePicklist } from '../../hooks/useResource';
import { money } from '../../lib/format';

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
  const [productId, setProductId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [page, setPage] = useState(1);

  const [newProduct, setNewProduct] = useState(null);
  const [askInitialStock, setAskInitialStock] = useState(null); // producto recién creado
  const [movement, setMovement] = useState(null); // { kind, initial }

  const canCreateProduct = can('products.create');
  const canMove = can('inventory.movements.create');

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchAll('/inventory/stock'), can('products.read') ? fetchAll('/products') : Promise.resolve([])])
      .then(([stockRows, productRows]) => {
        if (cancelled) return;
        setStock(stockRows);
        setProducts(productRows);
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
    () => products.map((p) => ({ value: String(p._id), label: p.sku ? `${p.name} (${p.sku})` : p.name })),
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

  const openMovement = (kind, initial = null) => setMovement({ kind, initial });

  const headerExtra = canMove ? (
    <>
      <TTButton
        variant="secondary"
        size="md"
        onPress={() => openMovement('ENTRY')}
        iconLeft={<TTIcon name="entrada" size={16} color={COLORS.textPrimary} />}
      >
        Registrar entrada
      </TTButton>
      <TTButton
        variant="secondary"
        size="md"
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

      <View style={styles.filters}>
        <View style={styles.filter}>
          <Text style={styles.label}>Producto</Text>
          <Dropdown
            value={productId || null}
            onChange={(v) => setProductId(v || '')}
            options={productOptions}
            placeholder="(todos)"
          />
        </View>
        <View style={styles.filter}>
          <Text style={styles.label}>Almacén</Text>
          <Dropdown
            value={warehouseId || null}
            onChange={(v) => setWarehouseId(v || '')}
            options={warehouses.options}
            placeholder="(todos)"
          />
        </View>
      </View>

      <DataTable
        title="Existencias"
        subtitle={`${filtered.length} registros`}
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
        loading={loading}
        error={error}
        onRefresh={reload}
        page={page}
        total={filtered.length}
        limit={PAGE_SIZE}
        onPageChange={setPage}
        headerExtra={headerExtra}
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
  filters: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  filter: { minWidth: 220, flex: 1, gap: 4 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  productCell: { gap: 4, alignItems: 'flex-start' },
  td: { fontSize: 14, color: COLORS.textPrimary },
  sku: { fontSize: 12, color: COLORS.textMuted, fontFamily: TYPOGRAPHY.fontFamily.ui },
  qty: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
});
