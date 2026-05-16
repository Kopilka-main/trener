import { Minus, Plus } from 'lucide-react';

type Props = {
  value: number | null;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  unit?: string;
  unitLabel?: string;
};

export function Stepper({ value, onChange, step = 1, min = 0, unit, unitLabel }: Props) {
  const v = value ?? 0;
  return (
    <div className="rounded-2xl bg-[var(--color-card)] px-2 py-3">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => onChange(Math.max(min, v - step))}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-chip)]"
          aria-label="Минус"
        >
          <Minus size={16} />
        </button>
        <div className="flex flex-1 items-baseline justify-center gap-1.5">
          <span className="text-2xl font-bold tabular-nums">{v}</span>
          {unit && <span className="text-xs text-[var(--color-ink-muted)]">{unit}</span>}
        </div>
        <button
          onClick={() => onChange(v + step)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-chip)]"
          aria-label="Плюс"
        >
          <Plus size={16} />
        </button>
      </div>
      {unitLabel && <div className="mt-1 text-center text-[11px] text-[var(--color-ink-muted)]">{unitLabel}</div>}
    </div>
  );
}
