import { Check } from 'lucide-react';

export function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
        checked ? 'border-ink bg-ink' : 'border-[var(--color-line)]'
      }`}
    >
      {checked && <Check size={13} strokeWidth={3} style={{ color: '#ffffff' }} />}
    </span>
  );
}
