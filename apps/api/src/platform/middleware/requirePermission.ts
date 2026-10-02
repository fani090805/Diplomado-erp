import type { NextFunction, Request, Response } from "express";
import { hasPermission } from "@erp/shared";
import { AppError } from "../errors/AppError.js";

export const requirePermission =
  (permission: string) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const permissions = req.user?.permissions ?? [];

    if (!hasPermission(permission, permissions)) {
      next(
        new AppError("FORBIDDEN", "No tienes permisos para esta acción.", 403),
      );
      return;
    }

    next();
  };
