import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../design-system/tokens';
import {
  TTBadge,
  TTButton,
  TTConfirmModal,
  TTIcon,
  TTInput,
  TTModal,
  TTTabs,
} from '../../design-system/components';
import { api } from '../../api/client';
import DataTable from '../../components/DataTable';
import FormModal from '../../components/FormModal';
import { useList } from '../../hooks/useResource';
import { dateOf } from '../../lib/format';
import { INDUSTRY_LABELS, INDUSTRY_OPTIONS } from '../../lib/companyRequest';
import { useUrlState } from '../../nav/urlState';

const PENDING_QUERY = { status: 'pending' };
const REJECTED_QUERY = { status: 'rejected' };

const COMPANY_FIELDS = [
  { name: 'companyName', label: 'Nombre de la empresa', required: true },
  { name: 'legalName', label: 'Razón social' },
  { name: 'taxId', label: 'RFC', placeholder: 'XAXX010101000' },
  { name: 'industry', label: 'Giro *', type: 'select', options: INDUSTRY_OPTIONS, required: true },
  { name: 'phone', label: 'Teléfono', keyboardType: 'phone-pad' },
  { name: 'city', label: 'Ciudad' },
  { name: 'name', label: 'Nombre del administrador', required: true },
  { name: 'lastName', label: 'Apellido del administrador' },
  { name: 'email', label: 'Correo del administrador', keyboardType: 'email-address', required: true },
  {
    name: 'password',
    label: 'Contraseña inicial del administrador',
    type: 'password',
    required: true,
    hint: 'Mínimo 8 caracteres con letras y números.',
  },
];

function fullName(person = {}) {
  return `${person.name || ''} ${person.lastName || ''}`.trim() || '—';
}

function Cell({ children, muted = false }) {
  return (
    <Text style={[styles.td, muted && styles.tdMuted]} numberOfLines={2}>
      {children === undefined || children === null || children === '' ? '—' : children}
    </Text>
  );
}

function listProps(list) {
  return {
    rows: list.items,
    loading: list.loading,
    error: list.error,
    search: list.search,
    onSearchChange: list.setSearch,
    onRefresh: list.reload,
    page: list.page,
    total: list.total,
    limit: list.limit,
    onPageChange: list.setPage,
  };
}

/** Panel de plataforma del Super Admin: solicitudes de alta, empresas y rechazadas. */
export default function CompaniesScreen() {
  const pendingList = useList('/platform/company-requests', PENDING_QUERY);
  const companiesList = useList('/platform/companies');
  const rejectedList = useList('/platform/company-requests', REJECTED_QUERY);
  const [activeTab, setActiveTab] = useUrlState('tab', 'requests', ['requests', 'companies', 'rejected']);
  const [dialog, setDialog] = useState(null);
  const [notice, setNotice] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [rejectBusy, setRejectBusy] = useState(false);
  const [creating, setCreating] = useState(false);

  const reloadAll = () => {
    pendingList.reload();
    companiesList.reload();
    rejectedList.reload();
  };

  const runDialogAction = async () => {
    const action = dialog?.action;
    setDialog(null);
    if (!action) return;
    try {
      await action();
      reloadAll();
    } catch (error) {
      setDialog({ error: error.message || 'Ocurrió un error. Intente de nuevo.' });
      reloadAll();
    }
  };

  const askApprove = (item) =>
    setDialog({
      title: 'Aprobar solicitud',
      message: `¿Aprobar "${item.company?.name}"? Se creará la empresa y ${item.applicant?.email} quedará como su administrador.`,
      confirmLabel: 'Aprobar',
      action: async () => {
        const data = await api(`/platform/company-requests/${item._id}/approve`, { method: 'POST' });
        setNotice(
          `La empresa "${data.company.name}" quedó lista. Código para su equipo: ${data.company.joinCode}.`
        );
      },
    });

  const openReject = (item) => {
    setRejecting(item);
    setReason('');
    setRejectError('');
  };

  const closeReject = () => {
    if (rejectBusy) return;
    setRejecting(null);
  };

  const submitReject = async () => {
    setRejectBusy(true);
    setRejectError('');
    try {
      const trimmed = reason.trim();
      await api(`/platform/company-requests/${rejecting._id}/reject`, {
        method: 'POST',
        body: trimmed ? { reason: trimmed } : {},
      });
      setNotice(`Se rechazó la solicitud de "${rejecting.company?.name}".`);
      setRejecting(null);
      reloadAll();
    } catch (error) {
      setRejectError(error.message || 'Ocurrió un error. Intente de nuevo.');
    } finally {
      setRejectBusy(false);
    }
  };

  const askToggleStatus = (company) => {
    const suspending = company.status === 'active';
    setDialog({
      title: suspending ? 'Suspender empresa' : 'Reactivar empresa',
      message: suspending
        ? `¿Suspender "${company.name}"? Sus usuarios no podrán iniciar sesión hasta que la reactives.`
        : `¿Reactivar "${company.name}"? Sus usuarios podrán volver a iniciar sesión.`,
      confirmLabel: suspending ? 'Suspender' : 'Reactivar',
      destructive: suspending,
      action: () =>
        api(`/platform/companies/${company._id}/status`, {
          method: 'PATCH',
          body: { status: suspending ? 'suspended' : 'active' },
        }),
    });
  };

  const createCompany = async (values) => {
    const body = { ...values };
    if (body.taxId) body.taxId = body.taxId.toUpperCase();
    const data = await api('/platform/companies', { method: 'POST', body });
    setCreating(false);
    setNotice(`La empresa "${data.name}" quedó lista. Código para su equipo: ${data.joinCode}.`);
    reloadAll();
  };

  const requestColumns = [
    {
      key: 'company',
      label: 'Empresa',
      width: 190,
      render: (item) => (
        <View>
          <Cell>{item.company?.name}</Cell>
          {item.company?.legalName ? <Cell muted>{item.company.legalName}</Cell> : null}
        </View>
      ),
    },
    {
      key: 'industry',
      label: 'Giro',
      width: 120,
      render: (item) => <Cell>{INDUSTRY_LABELS[item.company?.industry] || item.company?.industry}</Cell>,
    },
    { key: 'city', label: 'Ciudad', width: 120, render: (item) => <Cell>{item.company?.city}</Cell> },
    { key: 'applicant', label: 'Solicitante', width: 160, render: (item) => <Cell>{fullName(item.applicant)}</Cell> },
    { key: 'email', label: 'Correo', width: 200, render: (item) => <Cell>{item.applicant?.email}</Cell> },
    { key: 'createdAt', label: 'Fecha', width: 110, render: (item) => <Cell>{dateOf(item.createdAt)}</Cell> },
  ];

  const companyColumns = [
    { key: 'name', label: 'Nombre', width: 200, render: (company) => <Cell>{company.name}</Cell> },
    {
      key: 'joinCode',
      label: 'Código',
      width: 130,
      render: (company) => <Text style={styles.code}>{company.joinCode || '—'}</Text>,
    },
    {
      key: 'status',
      label: 'Estado',
      width: 130,
      render: (company) => <TTBadge value={company.status} label={company.status === 'active' ? 'Activa' : 'Suspendida'} />,
    },
    { key: 'activeUsers', label: 'Usuarios', width: 90, render: (company) => <Cell>{String(company.activeUsers ?? 0)}</Cell> },
    { key: 'createdAt', label: 'Fecha de alta', width: 120, render: (company) => <Cell>{dateOf(company.createdAt)}</Cell> },
  ];

  const rejectedColumns = [
    { key: 'company', label: 'Empresa', width: 180, render: (item) => <Cell>{item.company?.name}</Cell> },
    { key: 'applicant', label: 'Solicitante', width: 160, render: (item) => <Cell>{fullName(item.applicant)}</Cell> },
    { key: 'email', label: 'Correo', width: 200, render: (item) => <Cell>{item.applicant?.email}</Cell> },
    {
      key: 'rejectionReason',
      label: 'Motivo',
      width: 220,
      render: (item) => <Cell muted={!item.rejectionReason}>{item.rejectionReason || 'Sin motivo'}</Cell>,
    },
    { key: 'reviewedAt', label: 'Rechazada', width: 110, render: (item) => <Cell>{dateOf(item.reviewedAt)}</Cell> },
  ];

  return (
    <View style={styles.container}>
      <TTTabs
        tabs={[
          { key: 'requests', label: 'Solicitudes', badge: pendingList.total },
          { key: 'companies', label: 'Empresas', badge: companiesList.total },
          { key: 'rejected', label: 'Rechazadas' },
        ]}
        activeTab={activeTab}
        onChangeTab={(tab) => {
          setNotice(null);
          setActiveTab(tab);
        }}
      />

      {notice ? (
        <View accessibilityRole="alert" style={styles.notice}>
          <TTIcon name="check" size={18} color={COLORS.statusPositiveText} />
          <Text style={styles.noticeText}>{notice}</Text>
          <Pressable
            onPress={() => setNotice(null)}
            accessibilityRole="button"
            accessibilityLabel="Cerrar aviso"
            hitSlop={8}
          >
            <TTIcon name="cerrar" size={16} color={COLORS.textMuted} />
          </Pressable>
        </View>
      ) : null}

      {activeTab === 'requests' ? (
        <DataTable
          title="Solicitudes de alta"
          subtitle={`${pendingList.total} pendientes de revisión`}
          columns={requestColumns}
          {...listProps(pendingList)}
          rowActions={(item) => [
            { label: 'Aprobar', primary: true, onPress: () => askApprove(item) },
            { label: 'Rechazar', danger: true, onPress: () => openReject(item) },
          ]}
          emptyText="No hay solicitudes pendientes."
        />
      ) : null}

      {activeTab === 'companies' ? (
        <DataTable
          title="Empresas"
          subtitle={`${companiesList.total} registradas`}
          columns={companyColumns}
          {...listProps(companiesList)}
          onCreate={() => setCreating(true)}
          createLabel="Nueva empresa"
          rowActions={(company) => [
            company.status === 'active'
              ? { label: 'Suspender', danger: true, onPress: () => askToggleStatus(company) }
              : { label: 'Reactivar', primary: true, onPress: () => askToggleStatus(company) },
          ]}
          emptyText="Aún no hay empresas registradas."
        />
      ) : null}

      {activeTab === 'rejected' ? (
        <DataTable
          title="Solicitudes rechazadas"
          subtitle={`${rejectedList.total} en el historial`}
          columns={rejectedColumns}
          {...listProps(rejectedList)}
          emptyText="No hay solicitudes rechazadas."
        />
      ) : null}

      <TTModal
        visible={Boolean(rejecting)}
        title="Rechazar solicitud"
        subtitle={rejecting ? `${rejecting.company?.name} · ${rejecting.applicant?.email}` : undefined}
        onClose={closeReject}
        footer={
          <>
            <TTButton variant="secondary" size="md" onPress={closeReject} disabled={rejectBusy}>
              Cancelar
            </TTButton>
            <TTButton variant="danger" size="md" onPress={submitReject} loading={rejectBusy} disabled={rejectBusy}>
              Rechazar
            </TTButton>
          </>
        }
      >
        <View style={styles.rejectBody}>
          <Text style={styles.rejectHint}>
            Le enviaremos un correo al solicitante. Si escribes un motivo, se incluirá en el mensaje.
          </Text>
          <TTInput
            label="Motivo (opcional)"
            value={reason}
            onChangeText={setReason}
            placeholder="Ej. Los datos fiscales están incompletos."
            multiline
            numberOfLines={3}
            maxLength={500}
            disabled={rejectBusy}
          />
          {rejectError ? (
            <Text accessibilityRole="alert" style={styles.rejectError}>
              {rejectError}
            </Text>
          ) : null}
        </View>
      </TTModal>

      <FormModal
        visible={creating}
        title="Nueva empresa"
        fields={COMPANY_FIELDS}
        onSubmit={createCompany}
        onCancel={() => setCreating(false)}
      />

      <TTConfirmModal
        visible={Boolean(dialog)}
        title={dialog?.error ? 'No se pudo completar' : dialog?.title}
        message={dialog?.error || dialog?.message || ''}
        isError={Boolean(dialog?.error)}
        destructive={Boolean(dialog?.destructive)}
        confirmLabel={dialog?.confirmLabel}
        onCancel={() => setDialog(null)}
        onConfirm={runDialogAction}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.lg,
    width: '100%',
  },
  td: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  tdMuted: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  code: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    letterSpacing: 1,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.statusPositiveBorder,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.statusPositiveBg,
  },
  noticeText: {
    flex: 1,
    color: COLORS.statusPositiveText,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },
  rejectBody: {
    gap: SPACING.md,
  },
  rejectHint: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },
  rejectError: {
    color: COLORS.error,
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
});
