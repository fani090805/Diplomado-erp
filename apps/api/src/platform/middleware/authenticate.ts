import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { config } from "../config/index.js";
import { AppError } from "../errors/AppError.js";

const tokenPayloadSchema = z.object({
  userId: z.string().min(1),
  tenantId: z.string().min(1),
  companyIds: z.array(z.string().min(1)),
  permissions: z.array(z.string().min(1)),
});

export const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next(new AppError("UNAUTHORIZED", "Token requerido.", 401));
    return;
  }

  try {
    const token = authHeader.replace("Bearer ", "");
    const payload = tokenPayloadSchema.parse(
      jwt.verify(token, config.jwtSecret),
    );
    req.user = payload;
    next();
  } catch {
    next(new AppError("UNAUTHORIZED", "Token inválido.", 401));
  }
};
