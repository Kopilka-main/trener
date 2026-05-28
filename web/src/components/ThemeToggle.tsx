import { Flame, Leaf } from 'lucide-react';
import { useTheme } from '../lib/theme';

/**
 * Переключатель темы: Acid Flow (тёмная) ↔ Relax (светлая для йоги).
 */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isRelax = theme === 'relax';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isRelax ? 'Включить Acid Flow' : 'Включить Relax'}
      className="flex items-center gap-2 rounded-full bg-[var(--color-chip)] px-3 py-1.5 text-[12px] font-medium text-[var(--color-ink)]"
    >
      {isRelax ? <Leaf size={14} /> : <Flame size={14} />}
      <span>{isRelax ? 'Relax' : 'Acid Flow'}</span>
    </button>
  );
}
