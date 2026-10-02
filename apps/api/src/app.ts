import express, { type Express } from "express";
import swaggerUi from "swagger-ui-express";
import { AppError } from "./platform/errors/AppError.js";
import { errorHandler } from "./platform/errors/errorHandler.js";
import { logger } from "./platform/logger/index.js";
import {
  corsMiddleware,
  helmetMiddleware,
  rateLimit,
} from "./platform/middleware/index.js";
import { healthHandler } from "./platform/middleware/health.js";
import { openApiDocument } from "./docs/openapi.js";
import { authRouter } from "./platform/auth/index.js";

export const app: Express = express();

app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(express.json());
app.use(rateLimit(100, 60_000));

app.get("/api/v1/health", healthHandler);
app.use("/api/v1/auth", authRouter);
app.get("/docs/openapi.json", (_req, res) => {
  res.status(200).json(openApiDocument);
});
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.use((_req, _res, next) => {
  next(new AppError("NOT_FOUND", "Recurso no encontrado.", 404));
});

app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    logger.error({ err, url: req.originalUrl }, "Unhandled API error");
    errorHandler(err, req, res, next);
  },
);
