import type { Request, Response } from "express";
import mongoose from "mongoose";

export const healthHandler = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  const databaseConnected = mongoose.connection.readyState === 1;

  res.status(200).json({
    status: databaseConnected ? "ok" : "degraded",
    api: "online",
    database: databaseConnected ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
};
