import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, SIZES } from '../../design-system/tokens';
import { formatCount, TTSearch, TTSelect } from '../../design-system/components';
import { api } from '../../api/client';
import DataTable from '../../components/DataTable';
import DetailModal from '../../components/DetailModal';
import StatusBadge from '../../components/StatusBadge';
import { dateOf } from '../../lib/format';
import { useList } from '../../hooks/useResource';
import { useUrlState } from '../../nav/urlState';

const RESULT_OPTIONS = [
  { value: 'SUCCESS', label: 'Éxito' },
  { value: 'FAILURE', label: 'Fallo' },
];

const RESULT_FILTER_OPTIONS = [{ value: '', label: 'Todos' }, ...RESULT_OPTIONS];

/**
 * Auditoría inmutable (ADR-005): sólo lectura, sin POST/PUT/DELETE.
 * El detalle (before/after) se carga con GET /audit/:id bajo demanda.
 */
export default function AuditScreen() {
  const [moduleF, setModuleF] = useUrlState('module', '');
  const [resultF, setResultF] = useUrlState('result', '', ['', 'SUCCESS', 'FAILURE']);

  const query = useMemo(() => {
    const q = {};
    if (moduleF.trim()) q.module = moduleF.trim();
    if (resultF) q.result = resultF;
    return q;
  }, [moduleF, resultF]);

  const list = useList('/audit', query);
  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState('');

  const open = async (row) => {
    setDetailError('');
    try {
      const doc = await api(`/audit/${row._id}`);
      setDetail(doc);
    } catch (e) {
      setDetailError(e.message);
    }
  };

  const pretty = (v) => (v ? JSON.stringify(v, null, 2) : null);

  return (
    <View style={styles.wrap}>
      <DataTable
        title="Auditoría"
        subtitle={`${formatCount(list.total)} registros`}
        filters={[
          <TTSearch
            key="module"
            value={moduleF}
            onChangeText={setModuleF}
            placeholder="Módulo: products, users…"
            style={styles.moduleFilter}
          />,
          <TTSelect
            key="result"
            size="toolbar"
            valuePrefix="Resultado"
            value={resultF || null}
            onChange={(v) => setResultF(v || '')}
            options={RESULT_FILTER_OPTIONS}
            placeholder="Resultado: todos"
          />,
        ]}
        columns={[
          { key: 'createdAt', label: 'Fecha', width: 160, render: (r) => <Text style={styles.td}>{dateOf(r.createdAt, true)}</Text> },
          { key: 'userEmail', label: 'Usuario', width: 170, render: (r) => <Text style={styles.td}>{r.userEmail || '—'}</Text> },
          { key: 'module', label: 'Módulo', width: 110 },
          { key: 'action', label: 'Acción', width: 150 },
          { key: 'resourceType', label: 'Recurso', width: 110, render: (r) => <Text style={styles.td}>{r.resourceType || '—'}</Text> },
          { key: 'result', label: 'Resultado', width: 110, render: (r) => <StatusBadge value={r.result} /> },
        ]}
        rows={list.items}
        loading={list.loading}
        error={list.error || detailError}
        onRefresh={list.reload}
        page={list.page}
        total={list.total}
        limit={list.limit}
        onPageChange={list.setPage}
        rowActions={(row) => [{ label: 'Ver detalle', onPress: () => open(row) }]}
        emptyText="Sin eventos de auditoría."
      />

      <DetailModal
        visible={Boolean(detail)}
        title="Evento de auditoría"
        entries={
          detail
            ? [
                { label: 'Fecha', value: <Text style={styles.td}>{dateOf(detail.createdAt, true)}</Text> },
                { label: 'Usuario', value: <Text style={styles.td}>{detail.userEmail || '—'}</Text> },
                { label: 'Módulo', value: <Text style={styles.td}>{detail.module}</Text> },
                { label: 'Acción', value: <Text style={styles.td}>{detail.action}</Text> },
                { label: 'Recurso', value: <Text style={styles.td}>{`${detail.resourceType || '—'} ${detail.resourceId || ''}`}</Text> },
                { label: 'Resultado', value: <StatusBadge value={detail.result} /> },
                { label: 'Código HTTP', value: <Text style={styles.td}>{detail.statusCode ?? '—'}</Text> },
                { label: 'Mensaje', value: <Text style={styles.td}>{detail.message || '—'}</Text> },
                { label: 'IP', value: <Text style={styles.td}>{detail.ip || '—'}</Text> },
              ]
            : []
        }
        raw={
          detail
            ? [
                '— before —',
                pretty(detail.before) || '(vacío)',
                '',
                '— after —',
                pretty(detail.after) || '(vacío)',
              ].join('\n')
            : ''
        }
        onClose={() => setDetail(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  moduleFilter: { height: SIZES.toolbarControl, minWidth: 0 },
  td: { fontSize: 14, color: COLORS.textPrimary },
});
