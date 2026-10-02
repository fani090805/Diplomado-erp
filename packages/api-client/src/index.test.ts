import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "./index.js";

describe("apiClient authentication", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends credentials to the API and returns its session", async () => {
    const session = {
      accessToken: "signed-access",
      refreshToken: "rotating-refresh",
      user: {
        id: "user-1",
        name: "Ana",
        email: "ana@example.com",
        companyName: "Acme",
      },
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(session), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiClient.login("ana@example.com", "pass")).resolves.toEqual(
      session,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/auth\/login$/),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "ana@example.com", password: "pass" }),
      }),
    );
  });

  it("does not fabricate a session when the API rejects credentials", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 401 })),
    );
    await expect(apiClient.login("ana@example.com", "wrong")).rejects.toThrow(
      "No fue posible iniciar sesión.",
    );
  });
});
