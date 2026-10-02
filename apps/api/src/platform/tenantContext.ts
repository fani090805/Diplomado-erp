import { AsyncLocalStorage } from "node:async_hooks";

export type TenantContext = {
  tenantId: string;
  companyId?: string;
};

const tenantStorage = new AsyncLocalStorage<TenantContext>();

export const runWithTenantContext = <T>(
  context: TenantContext,
  callback: () => T,
): T => tenantStorage.run(context, callback);

export const getTenantContext = (): TenantContext | undefined =>
  tenantStorage.getStore();

export const requireTenantId = (): string => {
  const tenantId = getTenantContext()?.tenantId;

  if (!tenantId) {
    throw new Error("Tenant context is required for this database operation.");
  }

  return tenantId;
};
