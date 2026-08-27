export type ThemePreference = 'system' | 'light' | 'dark';

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

export function setTheme(pref: ThemePreference) {
  localStorage.setItem(STORAGE_KEY, pref);
  applyTheme(pref);
}
