import { ThemePreference } from '../types';

export type { ThemePreference };

const STORAGE_KEY = 'pipelines-theme';

export function getStoredTheme(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

export function applyTheme(pref: ThemePreference) {
  const root = document.documentElement;
  if (pref === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', pref);
  }
}

// Grava só no localStorage (preferência "deste navegador") — usado antes do login, quando
// ainda não existe conta pra vincular a escolha.
export function setLocalTheme(pref: ThemePreference) {
  localStorage.setItem(STORAGE_KEY, pref);
  applyTheme(pref);
}

// Estado visual efetivo do switch: se a preferência é 'system', resolve com base no SO —
// o switch é binário (claro/escuro), não tem uma posição "sistema" pra mostrar.
export function resolveEffectiveTheme(pref: ThemePreference): 'light' | 'dark' {
  if (pref === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return pref;
}
