import type { RequestHandler } from 'express';
import { rateLimit as createRateLimit } from 'express-rate-limit';
import { AppError } from '../errors/AppError.js';

export const rateLimit = (maxRequests = 100, windowMs = 60_000): RequestHandler =>
  createRateLimit({
    limit: maxRequests,
    windowMs,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      next(new AppError('RATE_LIMIT_EXCEEDED', 'Demasiadas solicitudes.', 429));
    }
  });
