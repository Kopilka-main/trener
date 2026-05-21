type Props<T extends string> = {
  options: readonly T[];
  selected: T[];
  onToggle: (value: T) => void;
  multi?: boolean;
};

export function Chips<T extends string>({ options, selected, onToggle, multi = true }: Props<T>) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => {
              if (!multi && active) return;
              onToggle(opt);
            }}
            className={`rounded-full px-3.5 py-2 text-[13px] transition-colors ${
              active ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-chip)]'
            }`}
            style={{ color: active ? 'var(--color-accent-on)' : 'var(--color-ink)' }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
