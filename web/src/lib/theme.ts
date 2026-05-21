export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'app_theme';
const ATTR = 'data-theme';

export function getStoredTheme(): Theme {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === 'dark' ? 'dark' : 'light';
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(STORAGE_KEY, theme);
  document.documentElement.setAttribute(ATTR, theme);
  window.dispatchEvent(new Event('app:theme-changed'));
}

export function applyStoredTheme(): void {
  document.documentElement.setAttribute(ATTR, getStoredTheme());
}
