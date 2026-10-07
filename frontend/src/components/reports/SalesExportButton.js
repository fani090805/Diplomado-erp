import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { apiBlob } from '../../api/client';
import { fetchAll } from '../../hooks/useResource';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../design-system/tokens';
import { TTButton, TTIcon, TTInput, TTModal, TTSelect } from '../../design-system/components';

/**
 * Botón "Exportar" de ventas: menú PDF / Excel → modal con filtros →
 * GET /reports/sales/export. En web descarga el archivo (blob) con el nombre
 * que manda el servidor; en móvil avisa que la descarga es de la versión web.
 */

const FORMATS = { pdf: 'PDF', xlsx: 'Excel' };

const STATUS_OPTIONS = [
  { value: 'APPROVED', label: 'Aprobadas' },
  { value: 'all', label: 'Todas' },
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'REJECTED', label: 'Rechazadas' },
];

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Atajos de rango en fechas locales; "hasta" es siempre hoy. */
const SHORTCUTS = [
  { key: 'month', label: 'Este mes', from: (now) => new Date(now.getFullYear(), now.getMonth(), 1) },
  { key: '3m', label: 'Últimos 3 meses', from: (now) => new Date(now.getFullYear(), now.getMonth() - 3, now.getDate() + 1) },
  { key: 'year', label: 'Este año', from: (now) => new Date(now.getFullYear(), 0, 1) },
];

function friendlyError(e) {
  if (e.status === 400 || e.status === 422) return e.message;
  if (e.status === 403) return 'No tiene permiso para exportar reportes de ventas.';
  if (e.status === 401) return 'Su sesión expiró. Inicie sesión de nuevo para descargar el reporte.';
  return 'No pudimos generar el reporte. Revise su conexión e inténtelo de nuevo.';
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function ExportModal({ format, initialFrom, initialTo, initialStatus, onClose }) {
  const today = ymd(new Date());
  const [from, setFrom] = useState(initialFrom || ymd(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [to, setTo] = useState(initialTo || today);
  const [status, setStatus] = useState(initialStatus || 'APPROVED');
  const [customerId, setCustomerId] = useState('');
  const [customers, setCustomers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchAll('/customers')
      .then((rows) => {
        if (cancelled) return;
        setCustomers(rows.map((r) => ({ value: String(r._id), label: r.name || r.code || String(r._id) })));
      })
      .catch(() => {
        if (!cancelled) setCustomers([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const applyShortcut = (s) => {
    const now = new Date();
    setFrom(ymd(s.from(now)));
    setTo(ymd(now));
  };

  const download = async () => {
    setError('');
    setDone('');
    if (!YMD_RE.test(from) || !YMD_RE.test(to)) {
      setError('Escriba las fechas con el formato AAAA-MM-DD.');
      return;
    }
    if (from > to) {
      setError('La fecha "desde" debe ser anterior o igual a "hasta".');
      return;
    }
    if (Platform.OS !== 'web') {
      setError('La descarga de reportes está disponible en la versión web.');
      return;
    }
    setBusy(true);
    try {
      const { blob, filename } = await apiBlob('/reports/sales/export', {
        query: { format, from, to, status, customerId },
        fallbackName: `ventas_${from}_${to}.${format}`,
      });
      saveBlob(blob, filename);
      setDone(`Listo: se descargó ${filename}.`);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <TTModal
      visible
      title={`Exportar ventas a ${FORMATS[format]}`}
      subtitle="Elija el periodo y los filtros del reporte."
      onClose={busy ? undefined : onClose}
      maxWidth={520}
      footer={
        <View style={styles.footer}>
          <TTButton variant="ghost" onPress={onClose} disabled={busy}>
            Cerrar
          </TTButton>
          <TTButton variant="primary" onPress={download} disabled={busy}>
            {`Descargar ${FORMATS[format]}`}
          </TTButton>
        </View>
      }
    >
      <View style={styles.form}>
        <View style={styles.row}>
          <View style={styles.field}>
            <TTInput label="Desde" value={from} onChangeText={setFrom} placeholder="AAAA-MM-DD" disabled={busy} />
          </View>
          <View style={styles.field}>
            <TTInput label="Hasta" value={to} onChangeText={setTo} placeholder="AAAA-MM-DD" disabled={busy} />
          </View>
        </View>

        <View style={styles.chips}>
          {SHORTCUTS.map((s) => (
            <Pressable key={s.key} style={styles.chip} onPress={() => applyShortcut(s)} disabled={busy}>
              <Text style={styles.chipText}>{s.label}</Text>
            </Pressable>
          ))}
        </View>

        <TTSelect label="Estado" value={status} onChange={(v) => setStatus(v || 'APPROVED')} options={STATUS_OPTIONS} disabled={busy} />
        <TTSelect
          label="Cliente (opcional)"
          value={customerId || null}
          onChange={(v) => setCustomerId(v || '')}
          options={[{ value: '', label: 'Todos los clientes' }, ...customers]}
          placeholder="Todos los clientes"
          disabled={busy}
        />

        {busy ? (
          <View style={styles.status}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={styles.statusText}>Generando reporte…</Text>
          </View>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {done ? <Text style={styles.done}>{done}</Text> : null}
        <Text style={styles.hint}>
          Máximo 24 meses. El PDF incluye hasta las 2,000 órdenes más recientes; el Excel incluye todas.
        </Text>
      </View>
    </TTModal>
  );
}

export default function SalesExportButton({ initialFrom, initialTo, initialStatus }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [format, setFormat] = useState(null);

  const pick = (f) => {
    setMenuOpen(false);
    setFormat(f);
  };

  return (
    <View style={styles.anchor}>
      <TTButton
        variant="secondary"
        size="md"
        onPress={() => setMenuOpen((o) => !o)}
        iconLeft={<TTIcon name="bajar" size={16} color={COLORS.textPrimary} />}
        iconRight={<TTIcon name={menuOpen ? 'chevronArriba' : 'chevronAbajo'} size={14} color={COLORS.textMuted} />}
      >
        Exportar
      </TTButton>
      {menuOpen ? (
        <View style={styles.menu}>
          {Object.entries(FORMATS).map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() => pick(key)}
              style={({ hovered }) => [styles.menuItem, hovered && styles.menuItemHover]}
            >
              <TTIcon name={key === 'pdf' ? 'documento' : 'graficaBarras'} size={16} color={COLORS.primary} />
              <Text style={styles.menuText}>{label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {format ? (
        <ExportModal
          format={format}
          initialFrom={initialFrom}
          initialTo={initialTo}
          initialStatus={initialStatus}
          onClose={() => setFormat(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: { position: 'relative', zIndex: 30, alignSelf: 'flex-start' },
  menu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: SPACING.xs,
    minWidth: 160,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.xs,
    zIndex: 40,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  menuItemHover: { backgroundColor: COLORS.primaryGlow },
  menuText: { fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.textPrimary, fontWeight: TYPOGRAPHY.fontWeight.medium },
  form: { gap: SPACING.md },
  row: { flexDirection: 'row', gap: SPACING.md, flexWrap: 'wrap' },
  field: { flex: 1, minWidth: 160 },
  chips: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  chipText: { fontSize: TYPOGRAPHY.fontSize.xs + 1, color: COLORS.primary, fontWeight: TYPOGRAPHY.fontWeight.semibold },
  status: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  statusText: { fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.textSecondary },
  error: { fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.error },
  done: { fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.successText },
  hint: { fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.textMuted },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.sm },
});
