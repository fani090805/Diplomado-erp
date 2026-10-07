import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../design-system/tokens';
import { TTConfirmModal, TTIcon, TTTabs } from '../../design-system/components';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { useConfirm } from '../../components/Confirm';
import DataTable from '../../components/DataTable';
import FormModal from '../../components/FormModal';
import StatusBadge from '../../components/StatusBadge';
import { invert } from '../../lib/format';
import { useList, usePicklist } from '../../hooks/useResource';
import CompanyJoinCodeCard from './CompanyJoinCodeCard';
import PendingUserApprovalModal from './PendingUserApprovalModal';
import { useUrlState } from '../../nav/urlState';

const STATUS_CREATE = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
];

const STATUS_EDIT = [
  ...STATUS_CREATE,
  { value: 'locked', label: 'Bloqueado' },
];

function fullName(user) {
  return `${user.name || ''} ${user.lastName || ''}`.trim() || user.email;
}

/** Usuarios de la empresa: activos, solicitudes pendientes, inactivos y código de invitación. */
export default function UsersScreen() {
  const { can, session } = useAuth();
  const me = session?.user?._id;
  const roles = usePicklist('/roles', (r) => r.label || r.code || String(r._id));
  const branches = usePicklist('/branches', (r) => r.name || r.code || String(r._id));
  const activeList = useList('/users');
  const pendingList = useList('/users', { status: 'pending' });
  const inactiveList = useList('/users', { status: 'inactive' });
  const [confirmUI, confirm] = useConfirm();
  const [editing, setEditing] = useState(null);
  const [activeTab, setActiveTab] = useUrlState('tab', 'active', ['active', 'pending', 'inactive']);
  const [approvalUser, setApprovalUser] = useState(null);
  // Confirmaciones de ciclo de vida (título, botón y tono propios) y avisos del servidor.
  const [dialog, setDialog] = useState(null);
  const [notice, setNotice] = useState(null);

  const roleLabels = invert(roles.options);

  const fields = useMemo(() => {
    const isEdit = Boolean(editing && editing._id);
    return [
      { name: 'name', label: 'Nombre', required: true },
      { name: 'lastName', label: 'Apellidos' },
      { name: 'email', label: 'Correo', keyboardType: 'email-address', required: true },
      isEdit
        ? { name: 'password', label: 'Nueva contraseña (opcional)', type: 'password' }
        : { name: 'password', label: 'Contraseña', type: 'password', required: true, hint: 'Mínimo 8 caracteres con letras y números.' },
      { name: 'roleId', label: 'Rol', type: 'select', options: roles.options, required: true },
      { name: 'branchId', label: 'Sucursal', type: 'select', options: branches.options, placeholder: '(sin sucursal)' },
      { name: 'status', label: 'Estado', type: 'select', options: isEdit ? STATUS_EDIT : STATUS_CREATE, defaultValue: 'active' },
    ];
  }, [editing, roles.options, branches.options]);

  const reloadAll = () => {
    activeList.reload();
    pendingList.reload();
    inactiveList.reload();
  };

  const submit = async (values) => {
    if (editing && editing._id) {
      if (!values.password) delete values.password;
      await api(`/users/${editing._id}`, { method: 'PATCH', body: values });
    } else {
      await api('/users', { method: 'POST', body: values });
    }
    setEditing(null);
    reloadAll();
  };

  const reject = (user) => {
    confirm(`¿Rechazar la solicitud de "${user.email}"?`, async () => {
      await api(`/users/${user._id}/reject`, { method: 'POST' });
      pendingList.reload();
    });
  };

  const runDialogAction = async () => {
    const action = dialog?.action;
    setDialog(null);
    if (!action) return;
    try {
      await action();
      reloadAll();
    } catch (error) {
      // 409 = el servidor conserva al usuario por su historial: es informativo, no un fallo.
      if (error.status === 409) {
        setNotice(error.message);
        reloadAll();
      } else {
        setDialog({ error: error.message || 'Ocurrió un error. Intente de nuevo.' });
      }
    }
  };

  const askDeactivate = (user) =>
    setDialog({
      title: 'Desactivar usuario',
      message: `¿Desactivar a ${fullName(user)}? Ya no podrá iniciar sesión. Podrás reactivarlo después.`,
      confirmLabel: 'Desactivar',
      action: () => api(`/users/${user._id}/deactivate`, { method: 'PATCH' }),
    });

  const askReactivate = (user) =>
    setDialog({
      title: 'Reactivar usuario',
      message: `¿Reactivar a ${fullName(user)}? Podrá volver a iniciar sesión.`,
      confirmLabel: 'Reactivar',
      action: () => api(`/users/${user._id}/reactivate`, { method: 'PATCH' }),
    });

  const askRemovePermanently = (user) =>
    setDialog({
      title: 'Eliminar definitivamente',
      message: `¿Eliminar definitivamente a ${fullName(user)}? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar definitivamente',
      destructive: true,
      action: () => api(`/users/${user._id}/permanent`, { method: 'DELETE' }),
    });

  const nameColumn = {
    key: 'name',
    label: 'Nombre',
    width: 190,
    render: (user) => <Text style={styles.td}>{fullName(user)}</Text>,
  };

  const userColumns = [
    nameColumn,
    { key: 'email', label: 'Correo', width: 210 },
    {
      key: 'roleId',
      label: 'Rol',
      width: 140,
      render: (user) => (
        <Text style={styles.td}>
          {roleLabels[String(user.roleId?._id ?? user.roleId)] || '—'}
        </Text>
      ),
    },
    {
      key: 'status',
      label: 'Estado',
      width: 120,
      render: (user) => <StatusBadge value={user.status} />,
    },
  ];

  const pendingColumns = [
    nameColumn,
    { key: 'email', label: 'Correo', width: 210 },
    {
      key: 'createdAt',
      label: 'Fecha de registro',
      width: 150,
      render: (user) => (
        <Text style={styles.td}>
          {user.createdAt ? new Date(user.createdAt).toLocaleDateString('es-MX') : '—'}
        </Text>
      ),
    },
  ];

  const activeActions = (user) => {
    if (String(user._id) === String(me)) return [];
    const actions = [];
    if (can('users.update')) {
      actions.push({ label: 'Editar', onPress: () => setEditing(user) });
      actions.push({ label: 'Desactivar', onPress: () => askDeactivate(user) });
    }
    return actions;
  };

  const inactiveActions = (user) => {
    const actions = [];
    if (can('users.update')) {
      actions.push({ label: 'Reactivar', primary: true, onPress: () => askReactivate(user) });
    }
    if (can('users.delete')) {
      actions.push({
        label: 'Eliminar definitivamente',
        danger: true,
        onPress: () => askRemovePermanently(user),
      });
    }
    return actions;
  };

  const listProps = (list) => ({
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
  });

  return (
    <View style={styles.container}>
      {can('users.create') ? <CompanyJoinCodeCard /> : null}

      <TTTabs
        tabs={[
          { key: 'active', label: 'Activos' },
          { key: 'pending', label: 'Pendientes', badge: pendingList.total },
          { key: 'inactive', label: 'Inactivos', badge: inactiveList.total },
        ]}
        activeTab={activeTab}
        onChangeTab={(tab) => {
          setNotice(null);
          setActiveTab(tab);
        }}
      />

      {notice ? (
        <View accessibilityRole="alert" style={styles.notice}>
          <TTIcon name="ayuda" size={18} color={COLORS.info} />
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

      {activeTab === 'active' ? (
        <DataTable
          title="Usuarios"
          subtitle={`${activeList.total} registros`}
          columns={userColumns}
          {...listProps(activeList)}
          onCreate={can('users.create') ? () => setEditing({}) : undefined}
          createLabel="Nuevo usuario"
          rowActions={activeActions}
          emptyText="Sin usuarios."
        />
      ) : null}

      {activeTab === 'pending' ? (
        <DataTable
          title="Solicitudes pendientes"
          subtitle={`${pendingList.total} solicitudes`}
          columns={pendingColumns}
          {...listProps(pendingList)}
          rowActions={
            can('users.update')
              ? (user) => [
                  { label: 'Aprobar', onPress: () => setApprovalUser(user) },
                  { label: 'Rechazar', danger: true, onPress: () => reject(user) },
                ]
              : undefined
          }
          emptyText="No hay solicitudes pendientes."
        />
      ) : null}

      {activeTab === 'inactive' ? (
        <DataTable
          title="Usuarios inactivos"
          subtitle={`${inactiveList.total} registros`}
          columns={userColumns}
          {...listProps(inactiveList)}
          rowActions={can('users.update') || can('users.delete') ? inactiveActions : undefined}
          emptyText="No hay usuarios inactivos."
        />
      ) : null}

      <FormModal
        visible={Boolean(editing)}
        title={editing && editing._id ? 'Editar usuario' : 'Nuevo usuario'}
        fields={fields}
        initial={editing}
        onSubmit={submit}
        onCancel={() => setEditing(null)}
      />
      <PendingUserApprovalModal
        user={approvalUser}
        roleOptions={roles.options}
        branchOptions={branches.options}
        rolesLoading={roles.loading}
        branchesLoading={branches.loading}
        onClose={() => setApprovalUser(null)}
        onApproved={() => {
          pendingList.reload();
          activeList.reload();
        }}
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
      {confirmUI}
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
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.infoGlow,
  },
  noticeText: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.ui,
  },
});
