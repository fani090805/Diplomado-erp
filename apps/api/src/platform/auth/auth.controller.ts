import type { Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import {
  getCurrentUser,
  login,
  revokeRefreshToken,
  rotateRefreshToken,
} from "./auth.service.js";

export const loginController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { email, password } = req.body as { email: string; password: string };
  res.status(200).json(await login(email, password));
};

export const refreshController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { refreshToken } = req.body as { refreshToken: string };
  res.status(200).json(await rotateRefreshToken(refreshToken));
};

export const logoutController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { refreshToken } = req.body as { refreshToken: string };
  await revokeRefreshToken(refreshToken);
  res.status(204).end();
};

export const meController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new AppError("UNAUTHORIZED", "Token requerido.", 401);
  res
    .status(200)
    .json(await getCurrentUser(req.user.userId, req.user.tenantId));
};
