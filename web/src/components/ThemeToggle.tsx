import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../lib/theme';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'}
      className="flex items-center gap-2 rounded-full bg-[var(--color-chip)] px-3 py-1.5 text-[12px] font-medium text-[var(--color-ink)]"
    >
      {isDark ? <Moon size={14} /> : <Sun size={14} />}
      <span>{isDark ? 'Тёмная' : 'Светлая'}</span>
    </button>
  );
}
