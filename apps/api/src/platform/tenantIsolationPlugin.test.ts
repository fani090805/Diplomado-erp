import mongoose, { Schema } from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { withTransaction } from "./db/mongoose.js";
import { runWithTenantContext } from "./tenantContext.js";
import { tenantIsolationPlugin } from "./tenantIsolationPlugin.js";

type TenantRecord = {
  name: string;
  tenantId?: string;
};

const schema = new Schema<TenantRecord>({
  name: { type: String, required: true },
  tenantId: { type: String, required: true },
});
schema.plugin(tenantIsolationPlugin);

const TenantRecordModel = mongoose.model<TenantRecord>(
  "TenantIsolationRecord",
  schema,
);

const globalSchema = new Schema(
  { name: { type: String, required: true } },
  { global: true },
);
globalSchema.plugin(tenantIsolationPlugin);
const GlobalRecordModel = mongoose.model(
  "TenantIsolationGlobalRecord",
  globalSchema,
);

describe("tenant isolation plugin", () => {
  let replicaSet: MongoMemoryReplSet | undefined;

  beforeAll(async () => {
    replicaSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replicaSet.getUri());
  }, 300_000);

  afterAll(async () => {
    await mongoose.disconnect();
    await replicaSet?.stop();
  });

  it("sets the active tenant on new documents and filters reads", async () => {
    await runWithTenantContext({ tenantId: "tenant-a" }, () =>
      TenantRecordModel.create({ name: "A" }),
    );
    await runWithTenantContext({ tenantId: "tenant-b" }, () =>
      TenantRecordModel.create({ name: "B" }),
    );

    const tenantARecords = await runWithTenantContext(
      { tenantId: "tenant-a" },
      async () => await TenantRecordModel.find().lean(),
    );

    expect(tenantARecords.map((record) => record.name)).toEqual(["A"]);
    expect(tenantARecords[0]?.tenantId).toBe("tenant-a");
  });

  it("rejects tenant-scoped reads without an active context", async () => {
    await expect(TenantRecordModel.find().exec()).rejects.toThrow(
      "Tenant context is required",
    );
  });

  it("prevents updates from changing tenantId", async () => {
    const record = await runWithTenantContext({ tenantId: "tenant-a" }, () =>
      TenantRecordModel.create({ name: "Immutable tenant" }),
    );

    await expect(
      runWithTenantContext({ tenantId: "tenant-a" }, () =>
        TenantRecordModel.updateOne(
          { _id: record._id },
          { $set: { tenantId: "tenant-b" } },
        ).exec(),
      ),
    ).rejects.toThrow("tenantId field is immutable");
  });

  it("passes the active MongoDB session into transactional work", async () => {
    const record = await runWithTenantContext({ tenantId: "tenant-a" }, () =>
      withTransaction(async (session) => {
        const [created] = await TenantRecordModel.create(
          [{ name: "Transactional" }],
          { session },
        );
        return created;
      }),
    );

    expect(record?.tenantId).toBe("tenant-a");
    expect(record?.name).toBe("Transactional");
  });

  it("scopes insertMany and rejects bulkWrite", async () => {
    const [record] = await runWithTenantContext({ tenantId: "tenant-a" }, () =>
      TenantRecordModel.insertMany([{ name: "Bulk insert" }]),
    );

    expect(record?.tenantId).toBe("tenant-a");

    await expect(
      runWithTenantContext({ tenantId: "tenant-a" }, () =>
        TenantRecordModel.bulkWrite([
          { insertOne: { document: { name: "Unsafe bulk" } } },
        ]),
      ),
    ).rejects.toThrow("bulkWrite is not supported");
  });

  it("allows explicitly global catalogs without tenant context", async () => {
    const record = await GlobalRecordModel.create({ name: "SAT catalog" });
    expect(record.name).toBe("SAT catalog");
  });
});
