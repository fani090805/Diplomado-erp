import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import { config } from "../config/index.js";
import { AppError } from "../errors/AppError.js";
import { authenticate } from "./authenticate.js";
import { tenantContext } from "./tenantContext.js";

const runMiddleware = (
  middleware: (req: Request, res: Response, next: NextFunction) => void,
  request: Request,
): Promise<AppError | undefined> =>
  new Promise((resolve) => {
    middleware(request, {} as Response, (error?: unknown) =>
      resolve(error as AppError | undefined),
    );
  });

describe("security middleware", () => {
  it("rejects a token without a tenant", async () => {
    const token = jwt.sign(
      { userId: "user-1", companyIds: [], permissions: [] },
      config.jwtSecret,
    );
    const request = {
      headers: { authorization: `Bearer ${token}` },
    } as Request;

    const error = await runMiddleware(authenticate, request);

    expect(error?.status).toBe(401);
  });

  it("ignores a forged tenant header", async () => {
    const request = {
      headers: { "x-tenant-id": "forged-tenant" },
      user: {
        userId: "user-1",
        tenantId: "token-tenant",
        companyIds: [],
        permissions: [],
      },
    } as unknown as Request;

    const error = await runMiddleware(tenantContext, request);

    expect(error).toBeUndefined();
    expect(request.tenantId).toBe("token-tenant");
  });

  it("rejects a company outside the user company list", async () => {
    const request = {
      headers: { "x-company-id": "company-forbidden" },
      user: {
        userId: "user-1",
        tenantId: "tenant-1",
        companyIds: ["company-allowed"],
        permissions: [],
      },
    } as unknown as Request;

    const error = await runMiddleware(tenantContext, request);

    expect(error?.status).toBe(403);
  });
});
