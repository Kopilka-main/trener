import { initials } from '../lib/initials';

const PALETTE = [
  { bg: '#d8c2a4', fg: '#5a4a32' }, // beige
  { bg: '#bcd5be', fg: '#33543b' }, // sage
  { bg: '#cfd8e8', fg: '#3a4a66' }, // blue
  { bg: '#e8c7c7', fg: '#6a3434' }, // pink
  { bg: '#d4c8e8', fg: '#4a3a66' }, // lilac
  { bg: '#e6d8a8', fg: '#665a26' }, // mustard
  { bg: '#bcd9d9', fg: '#2f5454' }, // teal
  { bg: '#e0c4ad', fg: '#5e3e22' }, // peach
  { bg: '#c9c9c9', fg: '#3a3a3a' }, // grey
];

function colorFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
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
      className={`flex items-center justify-center rounded-full font-semibold select-none ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.36, background: c.bg, color: c.fg }}
    >
      {initials(firstName, lastName)}
    </div>
  );
}
