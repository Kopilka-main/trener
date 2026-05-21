import { Check } from 'lucide-react';

export function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
        checked ? 'border-[var(--color-accent)] bg-[var(--color-accent)]' : 'border-[var(--color-line)]'
      }`}
    >
      {checked && <Check size={13} strokeWidth={3} style={{ color: 'var(--color-accent-on)' }} />}
    </span>
  );
}
