import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./index.js";

describe("password hashing", () => {
  it("stores a one-way Argon2 hash and verifies the original password", async () => {
    const password = "correct-horse-battery-staple";
    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
    expect(hash).toMatch(/^\$argon2id\$/);
    await expect(verifyPassword(hash, password)).resolves.toBe(true);
    await expect(verifyPassword(hash, "incorrect-password")).resolves.toBe(
      false,
    );
  });
});
