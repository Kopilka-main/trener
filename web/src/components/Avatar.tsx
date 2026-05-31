import { initials } from '../lib/initials';

// Единый нейтральный стиль: тёмная плашка с кремовыми инициалами.
// Различение клиентов — через сами инициалы, не через цвет.

type Props = {
  firstName: string;
  lastName: string;
  size?: number;
  className?: string;
};

export function Avatar({ firstName, lastName, size = 44, className = '' }: Props) {
  return (
    <div
      className={`flex items-center justify-center rounded-full select-none font-[family-name:var(--font-display)] tracking-[-0.02em] ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: 'var(--color-card-elevated)',
        color: 'var(--color-ink)',
      }}
    >
      {initials(firstName, lastName)}
    </div>
  );
}
