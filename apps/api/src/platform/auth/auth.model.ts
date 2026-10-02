import mongoose, { type InferSchemaType, type Model } from "mongoose";
import { tenantIsolationPlugin } from "../tenantIsolationPlugin.js";

const authIdentitySchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true },
    userId: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    companyIds: { type: [String], default: [] },
    companyName: { type: String, default: "" },
    permissions: { type: [String], default: [] },
    disabledAt: { type: Date, default: null },
  },
  { timestamps: true, global: true },
);
authIdentitySchema.plugin(tenantIsolationPlugin);

authIdentitySchema.index({ email: 1 }, { unique: true });
authIdentitySchema.index({ tenantId: 1, userId: 1 }, { unique: true });

const authSessionSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    tenantId: { type: String, required: true, immutable: true },
    userId: { type: String, required: true, immutable: true },
    refreshTokenHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
authSessionSchema.plugin(tenantIsolationPlugin);
authSessionSchema.index({ tenantId: 1, expiresAt: 1 });

export type AuthIdentity = InferSchemaType<typeof authIdentitySchema>;
export type AuthSession = InferSchemaType<typeof authSessionSchema>;

export const AuthIdentityModel =
  (mongoose.models.AuthIdentity as Model<AuthIdentity> | undefined) ??
  mongoose.model<AuthIdentity>("AuthIdentity", authIdentitySchema);
export const AuthSessionModel =
  (mongoose.models.AuthSession as Model<AuthSession> | undefined) ??
  mongoose.model<AuthSession>("AuthSession", authSessionSchema);
