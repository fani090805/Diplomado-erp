import { describe, expect, it } from 'vitest';
import { hasPermission, rolePermissions } from './index.js';

describe('permissions', () => {
  it('grants wildcard permissions to the owner role', () => {
    expect(hasPermission('users:delete', rolePermissions.propietario)).toBe(true);
  });

  it('checks explicit permissions without granting unrelated actions', () => {
    expect(hasPermission('users:user:read', rolePermissions.administrador)).toBe(true);
    expect(hasPermission('users:user:delete', rolePermissions.administrador)).toBe(false);
  });

  it('rejects permissions that are not assigned', () => {
    expect(hasPermission('settings:setting:write', rolePermissions.contador)).toBe(false);
  });
});