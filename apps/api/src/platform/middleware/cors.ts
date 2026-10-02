import cors from "cors";
import { config } from "../config/index.js";

const allowedOrigins = new Set(config.corsOrigins);

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    callback(null, !origin || allowedOrigins.has(origin));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Company-Id",
    "Idempotency-Key",
  ],
});
