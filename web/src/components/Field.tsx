import type { ReactNode } from 'react';

type Props = {
  label?: string;
  children: ReactNode;
  hint?: string;
};

export function Field({ label, children, hint }: Props) {
  return (
    <label className="block">
      {label && <div className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">{label}</div>}
      {children}
      {hint && <div className="mt-1 px-1 text-[11px] text-[var(--color-ink-muted)]">{hint}</div>}
    </label>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;
export function TextInput(props: InputProps) {
  return (
    <input
      {...props}
      className={`w-full rounded-2xl bg-[var(--color-card)] px-4 py-3.5 text-[15px] outline-none placeholder:text-[var(--color-ink-muted)] focus:ring-2 focus:ring-ink/10 ${props.className ?? ''}`}
    />
  );
}

type AreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;
export function TextArea(props: AreaProps) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-2xl bg-[var(--color-card)] px-4 py-3 text-[15px] outline-none placeholder:text-[var(--color-ink-muted)] focus:ring-2 focus:ring-ink/10 ${props.className ?? ''}`}
    />
  );
}
