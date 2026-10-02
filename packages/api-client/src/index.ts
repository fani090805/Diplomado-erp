export type ApiResponse<T> = {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; name: string; email: string; companyName: string };
};

const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export const apiClient = {
  async login(email: string, password: string): Promise<AuthTokens> {
    const response = await fetch(`${apiBaseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) throw new Error("No fue posible iniciar sesión.");
    return (await response.json()) as AuthTokens;
  },
  async me(
    accessToken: string,
  ): Promise<{ id: string; name: string; email: string; companyName: string }> {
    const response = await fetch(`${apiBaseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) throw new Error("No fue posible cargar el usuario.");
    return (await response.json()) as {
      id: string;
      name: string;
      email: string;
      companyName: string;
    };
  },
};
