import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, SPACING } from '../../design-system/tokens';
import { TTTabs } from '../../design-system/components';
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

const STATUS_CREATE = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
];

const STATUS_EDIT = [
  ...STATUS_CREATE,
  { value: 'locked', label: 'Bloqueado' },
];

/** Usuarios de la empresa: altas, solicitudes pendientes y código de invitación. */
export default function UsersScreen() {
  const { can, session } = useAuth();
  const me = session?.user?._id;
  const roles = usePicklist('/roles', (r) => r.label || r.code || String(r._id));
  const branches = usePicklist('/branches', (r) => r.name || r.code || String(r._id));
  const activeList = useList('/users');
  const pendingList = useList('/users', { status: 'pending' });
  const [confirmUI, confirm] = useConfirm();
  const [editing, setEditing] = useState(null);
  const [activeTab, setActiveTab] = useState('active');
  const [approvalUser, setApprovalUser] = useState(null);

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

  const submit = async (values) => {
    if (editing && editing._id) {
      if (!values.password) delete values.password;
      await api(`/users/${editing._id}`, { method: 'PATCH', body: values });
    } else {
      await api('/users', { method: 'POST', body: values });
    }
    setEditing(null);
    activeList.reload();
  };

  const reject = (user) => {
    confirm(`¿Rechazar la solicitud de "${user.email}"?`, async () => {
      await api(`/users/${user._id}/reject`, { method: 'POST' });
      pendingList.reload();
    });
  };

  const activeColumns = [
    {
      key: 'name',
      label: 'Nombre',
      width: 190,
      render: (user) => (
        <Text style={styles.td}>{`${user.name} ${user.lastName || ''}`.trim()}</Text>
      ),
    },
    { key: 'email', label: 'Correo', width: 190 },
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
      width: 110,
      render: (user) => <StatusBadge value={user.status} />,
    },
  ];

  const pendingColumns = [
    {
      key: 'name',
      label: 'Nombre',
      width: 190,
      render: (user) => (
        <Text style={styles.td}>{`${user.name} ${user.lastName || ''}`.trim()}</Text>
      ),
    },
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

  return (
    <View style={styles.container}>
      {can('users.create') ? <CompanyJoinCodeCard /> : null}

      <TTTabs
        tabs={[
          { key: 'active', label: 'Activos' },
          { key: 'pending', label: 'Pendientes', badge: pendingList.total },
        ]}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
      />

      {activeTab === 'active' ? (
        <DataTable
          title="Usuarios"
          subtitle={`${activeList.total} registros`}
          columns={activeColumns}
          rows={activeList.items}
          loading={activeList.loading}
          error={activeList.error}
          search={activeList.search}
          onSearchChange={activeList.setSearch}
          onRefresh={activeList.reload}
          page={activeList.page}
          total={activeList.total}
          limit={activeList.limit}
          onPageChange={activeList.setPage}
          onCreate={can('users.create') ? () => setEditing({}) : undefined}
          createLabel="Nuevo usuario"
          rowActions={(user) => {
            if (String(user._id) === String(me)) return [];
            const actions = [];
            if (can('users.update')) {
              actions.push({ label: 'Editar', onPress: () => setEditing(user) });
            }
            if (can('users.delete')) {
              actions.push({
                label: 'Eliminar',
                danger: true,
                onPress: () =>
                  confirm(`¿Eliminar el usuario "${user.email}"?`, async () => {
                    await api(`/users/${user._id}`, { method: 'DELETE' });
                    activeList.reload();
                  }),
              });
            }
            return actions;
          }}
          emptyText="Sin usuarios."
        />
      ) : (
        <DataTable
          title="Solicitudes pendientes"
          subtitle={`${pendingList.total} solicitudes`}
          columns={pendingColumns}
          rows={pendingList.items}
          loading={pendingList.loading}
          error={pendingList.error}
          search={pendingList.search}
          onSearchChange={pendingList.setSearch}
          onRefresh={pendingList.reload}
          page={pendingList.page}
          total={pendingList.total}
          limit={pendingList.limit}
          onPageChange={pendingList.setPage}
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
      )}

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
});
