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
};

export const apiClient = {
  async login(_email: string, _password: string): Promise<AuthTokens> {
    return {
      accessToken: 'demo-access-token',
      refreshToken: 'demo-refresh-token'
    };
  },
  async me(): Promise<{ id: string; name: string; email: string }> {
    return {
      id: 'demo-user',
      name: 'Usuario demo',
      email: 'demo@erp.local'
    };
  }
};
