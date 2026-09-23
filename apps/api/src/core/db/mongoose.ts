import mongoose from 'mongoose';
import { config } from '../config/index.js';

export const connectDatabase = async (): Promise<typeof mongoose> => {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  await mongoose.connect(config.mongoUri);
  return mongoose;
};

export const withTransaction = async <T>(fn: () => Promise<T>): Promise<T> => {
  const session = await mongoose.startSession();

  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await fn();
    });
    return result;
  } finally {
    await session.endSession();
  }
};
