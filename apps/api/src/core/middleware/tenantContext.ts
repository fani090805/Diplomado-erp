import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError.js';

export const tenantContext = (req: Request, _res: Response, next: NextFunction): void => {
  const user = req.user;
  const tenantId = user?.tenantId;

  if (!tenantId) {
    next(new AppError('UNAUTHORIZED', 'El token no contiene un tenant válido.', 401));
    return;
  }

  req.tenantId = tenantId;

  const companyIdHeader = req.headers['x-company-id'];
  const companyId = Array.isArray(companyIdHeader) ? companyIdHeader[0] : companyIdHeader;

  if (companyId && !user.companyIds.includes(companyId)) {
    next(new AppError('FORBIDDEN', 'No tienes acceso a esta empresa.', 403));
    return;
  }

  req.companyId = companyId;
  next();
};
