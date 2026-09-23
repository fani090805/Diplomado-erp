declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        tenantId: string;
        companyIds: string[];
        permissions: string[];
      };
      companyId?: string;
      tenantId?: string;
    }
  }
}

export {};
