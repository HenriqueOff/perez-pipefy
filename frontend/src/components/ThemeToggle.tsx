import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AuthApi } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { applyTheme, getStoredTheme, resolveEffectiveTheme, setLocalTheme } from '../utils/theme';
import Icon from './Icon';

/** Switch de claro/escuro. Sem usuário logado (tela de login), a escolha fica só no
 * localStorage deste navegador. Logado, a escolha é da CONTA — persiste no backend, então
 * cada usuário mantém seu próprio tema em qualquer dispositivo que ele entrar depois. */
export default function ThemeToggle() {
  const { user, setUser } = useAuth();
  const [effective, setEffective] = useState<'light' | 'dark'>(() =>
    resolveEffectiveTheme(user?.theme_preference ?? getStoredTheme())
  );

  useEffect(() => {
    setEffective(resolveEffectiveTheme(user?.theme_preference ?? getStoredTheme()));
  }, [user?.theme_preference]);

  const updateThemeMutation = useMutation({
    mutationFn: AuthApi.updateTheme,
  });

  function handleToggle() {
    const next = effective === 'dark' ? 'light' : 'dark';
    setEffective(next);
    applyTheme(next);

    if (user) {
      setUser({ ...user, theme_preference: next });
      updateThemeMutation.mutate(next);
    } else {
      setLocalTheme(next);
    }
  }

  const isDark = effective === 'dark';

  return (
    <button
      type="button"
      className={`theme-toggle ${isDark ? 'theme-toggle-dark' : ''}`}
      onClick={handleToggle}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
      title={isDark ? 'Modo escuro' : 'Modo claro'}
    >
      <span className="theme-toggle-track">
        <Icon name="sun" size={12} />
        <Icon name="moon" size={12} />
        <span className="theme-toggle-thumb" />
      </span>
    </button>
  );
}
