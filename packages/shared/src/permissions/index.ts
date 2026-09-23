import type { BaseRole } from '../constants/index.js';

export const permissionsCatalog = {
  auth: { session: ['login', 'register', 'refresh', 'logout'] },
  users: { user: ['read', 'create', 'update', 'delete'] },
  companies: { company: ['read', 'create', 'update', 'delete'] },
  tenants: { tenant: ['read', 'create', 'update', 'delete'] },
  settings: { setting: ['read', 'write'] }
} as const;

type PermissionResource = keyof typeof permissionsCatalog;
type PermissionForResource<Resource extends PermissionResource> = {
  [Entity in keyof (typeof permissionsCatalog)[Resource]]: (typeof permissionsCatalog)[Resource][Entity] extends readonly (infer Action extends string)[]
    ? `${Resource & string}:${Entity & string}:${Action}`
    : never
}[keyof (typeof permissionsCatalog)[Resource]];
export type Permission = {
  [Resource in PermissionResource]: PermissionForResource<Resource>;
}[PermissionResource];
export type RolePermission = Permission | '*';

export const rolePermissions: Record<BaseRole, readonly RolePermission[]> = {
  propietario: ['*'],
  administrador: ['users:user:read', 'users:user:create', 'users:user:update', 'companies:company:read', 'companies:company:create', 'companies:company:update', 'settings:setting:read', 'settings:setting:write'],
  contador: ['companies:company:read', 'settings:setting:read'],
  vendedor: ['users:user:read', 'companies:company:read'],
  comprador: ['companies:company:read'],
  almacenista: ['companies:company:read'],
  cajero: ['companies:company:read'],
  rh: ['users:user:read'],
  solo_lectura: ['companies:company:read', 'settings:setting:read']
};

export const hasPermission = (permission: string, userPermissions: readonly string[]): boolean =>
  userPermissions.includes('*') || userPermissions.includes(permission);
