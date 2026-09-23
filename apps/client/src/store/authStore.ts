import { create } from 'zustand';

export type SessionState = {
  isAuthenticated: boolean;
  userName: string;
  companyName: string;
  accessToken: string | null;
  refreshToken: string | null;
  login: (data: { userName: string; companyName: string; accessToken: string; refreshToken: string }) => void;
  logout: () => void;
};

export const useAuthStore = create<SessionState>((set) => ({
  isAuthenticated: false,
  userName: 'Usuario',
  companyName: 'Empresa demo',
  accessToken: null,
  refreshToken: null,
  login: ({ userName, companyName, accessToken, refreshToken }) =>
    set({
      isAuthenticated: true,
      userName,
      companyName,
      accessToken,
      refreshToken
    }),
  logout: () =>
    set({
      isAuthenticated: false,
      userName: 'Usuario',
      companyName: 'Empresa demo',
      accessToken: null,
      refreshToken: null
    })
}));
