import type { Request, Response } from 'express';

export const healthHandler = async (_req: Request, res: Response): Promise<void> => {
  const dbState = 'ok';

  res.status(200).json({
    status: 'ok',
    api: 'online',
    database: dbState,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
};
