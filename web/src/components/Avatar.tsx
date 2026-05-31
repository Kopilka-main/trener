import { initials } from '../lib/initials';

// Палитра acid-flow: тёмный фон card-elevated + один из ярких цветов для букв.
// Цвет «привязан» к имени клиента через простой хэш, поэтому одинаковый
// клиент всегда получает один и тот же оттенок аватара.
const ACCENT_PALETTE = [
  '#d4ff3d', // lime (основной акцент)
  '#ff6e4e', // coral
  '#e8b255', // amber
  '#2f6fed', // blue
  '#c54a8a', // berry
  '#87a86b', // sage
  '#9b8cff', // violet
];

function colorFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return ACCENT_PALETTE[h % ACCENT_PALETTE.length];
}

type Props = {
  firstName: string;
  lastName: string;
  size?: number;
  className?: string;
};

export function Avatar({ firstName, lastName, size = 44, className = '' }: Props) {
  const c = colorFor(`${firstName} ${lastName}`);
  return (
    <div
      className={`flex items-center justify-center rounded-full select-none font-[family-name:var(--font-display)] tracking-[-0.02em] ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: 'var(--color-card-elevated)',
        color: c,
        border: `1px solid ${c}33`,
      }}
    >
      {initials(firstName, lastName)}
    </div>
  );
}
