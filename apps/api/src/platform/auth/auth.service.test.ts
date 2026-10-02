import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AuthIdentityModel } from "./auth.model.js";
import { login, rotateRefreshToken } from "./auth.service.js";
import { hashPassword } from "./password.js";

describe("authentication sessions", () => {
  let replicaSet: MongoMemoryReplSet | undefined;

  beforeAll(async () => {
    replicaSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replicaSet.getUri());
    await AuthIdentityModel.create({
      tenantId: "tenant-auth",
      userId: "user-auth",
      name: "Ana QA",
      email: "ana@example.com",
      passwordHash: await hashPassword("secure-password"),
      companyIds: [],
      permissions: [],
      companyName: "Empresa QA",
    });
  }, 300_000);

  afterAll(async () => {
    await mongoose.disconnect();
    await replicaSet?.stop();
  });

  it("authenticates with Argon2 and rotates refresh tokens once", async () => {
    const session = await login("ana@example.com", "secure-password");
    expect(session.accessToken).toBeTruthy();

    const rotated = await rotateRefreshToken(session.refreshToken);
    expect(rotated.refreshToken).not.toBe(session.refreshToken);
    expect(rotated.accessToken).toBeTruthy();
    await expect(
      rotateRefreshToken(session.refreshToken),
    ).rejects.toMatchObject({
      code: "INVALID_REFRESH_TOKEN",
      status: 401,
    });
  });

  it("uses one generic failure for unknown accounts and wrong passwords", async () => {
    await expect(login("missing@example.com", "wrong")).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
      status: 401,
    });
    await expect(login("ana@example.com", "wrong")).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
      status: 401,
    });
  });
});
