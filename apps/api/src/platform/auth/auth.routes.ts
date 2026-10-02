import {
  Router,
  type RequestHandler,
  type Router as ExpressRouter,
} from "express";
import { authenticate } from "../middleware/authenticate.js";
import { tenantContext } from "../middleware/tenantContext.js";
import { validate } from "../middleware/validate.js";
import {
  loginController,
  logoutController,
  meController,
  refreshController,
} from "./auth.controller.js";
import { credentialsSchema, refreshSchema } from "./auth.schemas.js";

const asyncHandler =
  (handler: RequestHandler): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(handler(req, res, next)).catch(next);

export const authRouter: ExpressRouter = Router();
authRouter.post(
  "/login",
  validate(credentialsSchema),
  asyncHandler(loginController),
);
authRouter.post(
  "/refresh",
  validate(refreshSchema),
  asyncHandler(refreshController),
);
authRouter.post(
  "/logout",
  validate(refreshSchema),
  asyncHandler(logoutController),
);
authRouter.get("/me", authenticate, tenantContext, asyncHandler(meController));
