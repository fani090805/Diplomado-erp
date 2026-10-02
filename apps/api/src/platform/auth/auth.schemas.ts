import { z } from "zod";

export const credentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(256),
});

export const refreshSchema = z.object({ refreshToken: z.string().min(1) });
