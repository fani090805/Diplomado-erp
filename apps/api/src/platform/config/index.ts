import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
    MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
    JWT_SECRET: z
      .string()
      .min(32, "JWT_SECRET must contain at least 32 characters"),
    JWT_REFRESH_SECRET: z
      .string()
      .min(32, "JWT_REFRESH_SECRET must contain at least 32 characters"),
    CORS_ORIGINS: z
      .string()
      .default("http://localhost:8081,http://localhost:19006"),
    EXPO_PUBLIC_API_URL: z.string().default("http://localhost:4000/api/v1"),
  })
  .superRefine((values, context) => {
    if (values.JWT_SECRET === values.JWT_REFRESH_SECRET) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["JWT_REFRESH_SECRET"],
        message: "JWT_SECRET and JWT_REFRESH_SECRET must be different.",
      });
    }

    if (
      values.NODE_ENV === "production" &&
      (values.JWT_SECRET.startsWith("replace-with-") ||
        values.JWT_REFRESH_SECRET.startsWith("replace-with-"))
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["JWT_SECRET"],
        message: "Production JWT secrets must be replaced with random values.",
      });
    }
  });

export const env = envSchema.parse(process.env);

export const config = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  mongoUri: env.MONGODB_URI,
  jwtSecret: env.JWT_SECRET,
  jwtRefreshSecret: env.JWT_REFRESH_SECRET,
  corsOrigins: env.CORS_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  apiBaseUrl: env.EXPO_PUBLIC_API_URL,
};
