import mongoose, { type ClientSession } from "mongoose";
import { config } from "../config/index.js";
import { tenantIsolationPlugin } from "../tenantIsolationPlugin.js";

mongoose.plugin(tenantIsolationPlugin);

export const connectDatabase = async (): Promise<typeof mongoose> => {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  await mongoose.connect(config.mongoUri);
  return mongoose;
};

export const withTransaction = async <T>(
  fn: (session: ClientSession) => Promise<T>,
): Promise<T> => {
  const session = await mongoose.startSession();

  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
};
