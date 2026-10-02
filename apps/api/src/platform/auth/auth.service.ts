import { createHash, randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { AppError } from "../errors/AppError.js";
import { config } from "../config/index.js";
import { withTransaction } from "../db/mongoose.js";
import { runWithTenantContext } from "../tenantContext.js";
import { verifyPassword } from "./password.js";
import { AuthIdentityModel, AuthSessionModel } from "./auth.model.js";

const refreshLifetimeMs = 30 * 24 * 60 * 60 * 1000;
const hashToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

type Identity = {
  _id: unknown;
  tenantId: string;
  userId: string;
  name: string;
  email: string;
  passwordHash: string;
  companyIds: string[];
  companyName: string;
  permissions: string[];
  disabledAt: Date | null;
};

const issueAccessToken = (identity: Identity): string =>
  jwt.sign(
    {
      userId: identity.userId,
      tenantId: identity.tenantId,
      companyIds: identity.companyIds,
      permissions: identity.permissions,
    },
    config.jwtSecret,
    { expiresIn: "15m", issuer: "erp-api", audience: "erp-client" },
  );

const issueRefreshToken = (identity: Identity, sessionId: string): string =>
  jwt.sign(
    { userId: identity.userId, tenantId: identity.tenantId, sessionId },
    config.jwtRefreshSecret,
    { expiresIn: "30d", issuer: "erp-api", audience: "erp-refresh" },
  );

export const login = async (
  email: string,
  password: string,
): Promise<{ accessToken: string; refreshToken: string; user: object }> => {
  const identity = (await AuthIdentityModel.findOne({ email })
    .select("+passwordHash")
    .lean()) as Identity | null;
  if (
    !identity ||
    identity.disabledAt ||
    !(await verifyPassword(identity.passwordHash, password))
  ) {
    throw new AppError(
      "INVALID_CREDENTIALS",
      "Correo o contraseña incorrectos.",
      401,
    );
  }

  const sessionId = randomUUID();
  const refreshToken = issueRefreshToken(identity, sessionId);
  await runWithTenantContext({ tenantId: identity.tenantId }, async () => {
    await AuthSessionModel.create({
      _id: sessionId,
      userId: identity.userId,
      refreshTokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + refreshLifetimeMs),
    });
  });
  return {
    accessToken: issueAccessToken(identity),
    refreshToken,
    user: {
      id: identity.userId,
      name: identity.name,
      email: identity.email,
      companyName: identity.companyName,
    },
  };
};

export const rotateRefreshToken = async (
  token: string,
): Promise<{ accessToken: string; refreshToken: string }> => {
  let payload: { userId: string; tenantId: string; sessionId: string };
  try {
    payload = jwt.verify(token, config.jwtRefreshSecret, {
      issuer: "erp-api",
      audience: "erp-refresh",
    }) as typeof payload;
  } catch {
    throw new AppError(
      "INVALID_REFRESH_TOKEN",
      "La sesión expiró o no es válida.",
      401,
    );
  }

  const identity = (await AuthIdentityModel.findOne({
    tenantId: payload.tenantId,
    userId: payload.userId,
    disabledAt: null,
  }).lean()) as Identity | null;
  if (!identity)
    throw new AppError("INVALID_REFRESH_TOKEN", "La sesión no es válida.", 401);

  return runWithTenantContext({ tenantId: payload.tenantId }, async () =>
    withTransaction(async (session) => {
      const current = await AuthSessionModel.findOneAndUpdate(
        {
          _id: payload.sessionId,
          userId: payload.userId,
          refreshTokenHash: hashToken(token),
          revokedAt: null,
          expiresAt: { $gt: new Date() },
        },
        { $set: { revokedAt: new Date() } },
        { new: false, session },
      );
      if (!current) {
        throw new AppError(
          "INVALID_REFRESH_TOKEN",
          "La sesión ya fue usada o revocada.",
          401,
        );
      }
      const nextSessionId = randomUUID();
      const refreshToken = issueRefreshToken(identity, nextSessionId);
      await AuthSessionModel.create(
        [
          {
            _id: nextSessionId,
            userId: payload.userId,
            refreshTokenHash: hashToken(refreshToken),
            expiresAt: new Date(Date.now() + refreshLifetimeMs),
          },
        ],
        { session },
      );
      return { accessToken: issueAccessToken(identity), refreshToken };
    }),
  );
};

export const revokeRefreshToken = async (token: string): Promise<void> => {
  let payload: { userId: string; tenantId: string; sessionId: string };
  try {
    payload = jwt.verify(token, config.jwtRefreshSecret, {
      issuer: "erp-api",
      audience: "erp-refresh",
    }) as typeof payload;
  } catch {
    return;
  }
  await runWithTenantContext({ tenantId: payload.tenantId }, async () => {
    await AuthSessionModel.updateOne(
      {
        _id: payload.sessionId,
        userId: payload.userId,
        refreshTokenHash: hashToken(token),
        revokedAt: null,
      },
      { $set: { revokedAt: new Date() } },
    );
  });
};

export const getCurrentUser = async (userId: string, tenantId: string) => {
  const identity = await AuthIdentityModel.findOne({
    tenantId,
    userId,
    disabledAt: null,
  })
    .select("userId name email companyName")
    .lean();
  if (!identity)
    throw new AppError("UNAUTHORIZED", "La cuenta no está activa.", 401);
  return {
    id: identity.userId,
    name: identity.name,
    email: identity.email,
    companyName: identity.companyName,
  };
};
