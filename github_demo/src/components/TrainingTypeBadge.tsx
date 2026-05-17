type Props = { value: string | null };

export function TrainingTypeBadge({ value }: Props) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--color-bg-soft)] px-2 py-0.5 text-[11px] text-[var(--color-ink-muted)]">
      {value}
    </span>
  );
}
