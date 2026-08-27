import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { api, setAccessToken } from '../api/client';
import { User } from '../types';
import { applyTheme, getStoredTheme } from '../utils/theme';

type LoginResult = { twoFactorRequired: true; tempToken: string } | { twoFactorRequired: false };

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  verifyTwoFactor: (tempToken: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // tenta restaurar a sessão via refresh token (cookie httpOnly)
    api
      .post('/auth/refresh')
      .then(async ({ data }) => {
        setAccessToken(data.accessToken);
        const me = await api.get('/auth/me');
        setUser(me.data);
        applyTheme(me.data.theme_preference);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string): Promise<LoginResult> {
    const { data } = await api.post('/auth/login', { email, password });
    if (data.twoFactorRequired) {
      return { twoFactorRequired: true, tempToken: data.tempToken };
    }
    setAccessToken(data.accessToken);
    setUser(data.user);
    applyTheme(data.user.theme_preference);
    return { twoFactorRequired: false };
  }

  async function verifyTwoFactor(tempToken: string, code: string) {
    const { data } = await api.post('/auth/login/verify-2fa', { tempToken, code });
    setAccessToken(data.accessToken);
    setUser(data.user);
    applyTheme(data.user.theme_preference);
  }

  async function logout() {
    await api.post('/auth/logout').catch(() => undefined);
    setAccessToken(null);
    setUser(null);
    // Volta pra preferência salva neste navegador (a de conta some junto com a sessão) —
    // senão a tela de login ficaria "presa" no tema da conta que acabou de sair.
    applyTheme(getStoredTheme());
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, verifyTwoFactor, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return ctx;
}
