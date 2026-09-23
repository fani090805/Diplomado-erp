import { describe, expect, it } from 'vitest';
import { apiClient } from './index.js';

describe('apiClient', () => {
  it('returns demo tokens for login', async () => {
    const result = await apiClient.login('demo@erp.local', 'demo-password');

    expect(result).toEqual({
      accessToken: 'demo-access-token',
      refreshToken: 'demo-refresh-token'
    });
  });

  it('returns the current demo user profile', async () => {
    const result = await apiClient.me();

    expect(result).toMatchObject({
      id: 'demo-user',
      name: 'Usuario demo',
      email: 'demo@erp.local'
    });
  });
});
