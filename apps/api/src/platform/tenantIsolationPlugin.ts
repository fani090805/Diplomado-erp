import type { Aggregate, Query, Schema } from "mongoose";
import { requireTenantId } from "./tenantContext.js";

declare module "mongoose" {
  interface SchemaOptions {
    global?: boolean;
  }
}

const assertTenantIdIsImmutable = (update: unknown): void => {
  if (Array.isArray(update)) {
    throw new Error(
      "Update pipelines are not supported for tenant-scoped models.",
    );
  }

  if (typeof update !== "object" || update === null) {
    return;
  }

  const updateRecord = update as Record<string, unknown>;

  for (const [operator, operation] of Object.entries(updateRecord)) {
    if (
      typeof operation === "object" &&
      operation !== null &&
      "tenantId" in operation
    ) {
      throw new Error("The tenantId field is immutable.");
    }

    if (
      operator === "$rename" &&
      typeof operation === "object" &&
      operation !== null
    ) {
      const renamedFields = Object.values(operation as Record<string, unknown>);
      if (renamedFields.includes("tenantId")) {
        throw new Error("The tenantId field is immutable.");
      }
    }
  }

  if ("tenantId" in updateRecord) {
    throw new Error("The tenantId field is immutable.");
  }
};

export const tenantIsolationPlugin = (schema: Schema): void => {
  if (schema.options.global === true) {
    return;
  }

  schema.pre("validate", function () {
    const tenantId = requireTenantId();
    const document = this as typeof this & { tenantId?: string };

    if (document.isNew) {
      document.tenantId = tenantId;
      return;
    }

    if (document.tenantId !== tenantId) {
      throw new Error("Document does not belong to the active tenant.");
    }
  });

  schema.pre("deleteOne", { document: true, query: false }, function () {
    const tenantId = requireTenantId();
    const document = this as typeof this & { tenantId?: string };

    if (document.tenantId !== tenantId) {
      throw new Error("Document does not belong to the active tenant.");
    }
  });

  const scopeQuery = function (this: Query<unknown, unknown>): void {
    const tenantId = requireTenantId();
    this.where({ tenantId });

    const update = this.getUpdate();
    assertTenantIdIsImmutable(update);

    if (this.getOptions().upsert) {
      const updateDocument =
        typeof update === "object" && update !== null
          ? (update as Record<string, unknown>)
          : {};

      const setOnInsert =
        typeof updateDocument.$setOnInsert === "object" &&
        updateDocument.$setOnInsert !== null
          ? (updateDocument.$setOnInsert as Record<string, unknown>)
          : {};

      this.setUpdate({
        ...updateDocument,
        $setOnInsert: { ...setOnInsert, tenantId },
      });
    }
  };

  schema.pre(
    /^(count|delete|find|update)/,
    { document: false, query: true },
    scopeQuery,
  );
  schema.pre("distinct", { document: false, query: true }, scopeQuery);

  schema.pre(
    ["replaceOne", "findOneAndReplace"],
    { document: false, query: true },
    function (this: Query<unknown, unknown>) {
      const tenantId = requireTenantId();
      this.where({ tenantId });
      const update = this.getUpdate();
      assertTenantIdIsImmutable(update);

      if (
        this.getOptions().upsert &&
        typeof update === "object" &&
        update !== null
      ) {
        this.setUpdate({ ...(update as Record<string, unknown>), tenantId });
      }
    },
  );

  schema.pre("estimatedDocumentCount", function () {
    requireTenantId();
    throw new Error(
      "estimatedDocumentCount is not supported for tenant-scoped models.",
    );
  });

  schema.pre(
    "insertMany",
    function (next, documents: Array<Record<string, unknown>>) {
      try {
        const tenantId = requireTenantId();
        for (const document of documents) {
          if (document.tenantId && document.tenantId !== tenantId) {
            throw new Error("Document does not belong to the active tenant.");
          }
          document.tenantId = tenantId;
        }
        next();
      } catch (error) {
        next(error as Error);
      }
    },
  );

  schema.pre("bulkWrite", function (next) {
    try {
      requireTenantId();
      next(new Error("bulkWrite is not supported for tenant-scoped models."));
    } catch (error) {
      next(error as Error);
    }
  });

  schema.pre("aggregate", function (this: Aggregate<unknown>) {
    const tenantId = requireTenantId();
    const pipeline = this.pipeline();
    const matchStage = { $match: { tenantId } };

    const prependTenantMatch = (target: typeof pipeline): void => {
      const targetFirstStage = target[0];
      if (
        targetFirstStage &&
        ("$geoNear" in targetFirstStage ||
          "$search" in targetFirstStage ||
          "$vectorSearch" in targetFirstStage)
      ) {
        target.splice(1, 0, matchStage);
      } else {
        target.unshift(matchStage);
      }
    };

    prependTenantMatch(pipeline);

    for (const stage of pipeline) {
      if ("$lookup" in stage) {
        stage.$lookup.pipeline ??= [];
        prependTenantMatch(stage.$lookup.pipeline);
      }

      if ("$unionWith" in stage) {
        if (typeof stage.$unionWith === "string") {
          stage.$unionWith = { coll: stage.$unionWith, pipeline: [matchStage] };
        } else {
          stage.$unionWith.pipeline ??= [];
          stage.$unionWith.pipeline.unshift(matchStage);
        }
      }

      if ("$graphLookup" in stage) {
        stage.$graphLookup.restrictSearchWithMatch = {
          ...stage.$graphLookup.restrictSearchWithMatch,
          tenantId,
        };
      }

      if ("$merge" in stage || "$out" in stage) {
        throw new Error(
          "Write stages are not supported in tenant-scoped aggregations.",
        );
      }
    }
  });
};
