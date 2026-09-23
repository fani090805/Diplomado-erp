import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from './authStore';

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      isAuthenticated: false,
      userName: 'Usuario',
      companyName: 'Empresa demo',
      accessToken: null,
      refreshToken: null
    });
  });

  it('stores the session values after login', () => {
    useAuthStore.getState().login({
      userName: 'Ana',
      companyName: 'Acme',
      accessToken: 'access-token',
      refreshToken: 'refresh-token'
    });

    const state = useAuthStore.getState();

    expect(state.isAuthenticated).toBe(true);
    expect(state.userName).toBe('Ana');
    expect(state.companyName).toBe('Acme');
    expect(state.accessToken).toBe('access-token');
    expect(state.refreshToken).toBe('refresh-token');
  });

  it('clears the session after logout', () => {
    useAuthStore.getState().login({
      userName: 'Ana',
      companyName: 'Acme',
      accessToken: 'access-token',
      refreshToken: 'refresh-token'
    });

    useAuthStore.getState().logout();
    const state = useAuthStore.getState();

    expect(state.isAuthenticated).toBe(false);
    expect(state.userName).toBe('Usuario');
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
  });
});
