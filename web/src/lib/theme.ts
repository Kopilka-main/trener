import { useSyncExternalStore } from 'react';

export type Theme = 'acid' | 'relax';

const STORAGE_KEY = 'app_theme';
const ATTR = 'data-theme';

export function getStoredTheme(): Theme {
  const raw = localStorage.getItem(STORAGE_KEY);
  // Acid Flow по умолчанию (тёмная — основная тема).
  return raw === 'relax' ? 'relax' : 'acid';
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(STORAGE_KEY, theme);
  if (theme === 'acid') {
    document.documentElement.removeAttribute(ATTR);
  } else {
    document.documentElement.setAttribute(ATTR, theme);
  }
  window.dispatchEvent(new Event('app:theme-changed'));
}

export function applyStoredTheme(): void {
  const t = getStoredTheme();
  if (t === 'acid') {
    document.documentElement.removeAttribute(ATTR);
  } else {
    document.documentElement.setAttribute(ATTR, t);
  }
}

function subscribe(callback: () => void): () => void {
  window.addEventListener('app:theme-changed', callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener('app:theme-changed', callback);
    window.removeEventListener('storage', callback);
  };
}

export function useTheme(): { theme: Theme; toggle: () => void; setTheme: (t: Theme) => void } {
  const theme = useSyncExternalStore(
    subscribe,
    () => getStoredTheme(),
    () => 'acid' as Theme,
  );
  return {
    theme,
    setTheme,
    toggle: () => setTheme(theme === 'acid' ? 'relax' : 'acid'),
  };
}
