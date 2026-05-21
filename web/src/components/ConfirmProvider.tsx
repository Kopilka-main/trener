import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';

type ConfirmOptions = { confirmLabel?: string; danger?: boolean };
type Pending = { message: string; confirmLabel: string; danger: boolean; resolve: (value: boolean) => void };

type ConfirmFn = (message: string, options?: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(() => Promise.resolve(false));

// Внутри-приложенческое окно подтверждения вместо нативного confirm().
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback<ConfirmFn>((message, options) => {
    return new Promise<boolean>((resolve) => {
      setPending({
        message,
        confirmLabel: options?.confirmLabel ?? 'Подтвердить',
        danger: options?.danger ?? false,
        resolve,
      });
    });
  }, []);

  const close = (value: boolean) => {
    if (pending) pending.resolve(value);
    setPending(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => close(false)} />
          <div className="relative w-full max-w-[320px] rounded-2xl bg-[var(--color-card)] p-5 shadow-2xl">
            <div className="text-[14px] leading-snug">{pending.message}</div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => close(false)}
                className="flex-1 rounded-xl bg-[var(--color-chip)] py-2.5 text-[14px] font-medium"
              >
                Отмена
              </button>
              <button
                onClick={() => close(true)}
                className="flex-1 rounded-xl py-2.5 text-[14px] font-semibold"
                style={{
                  background: pending.danger ? 'var(--color-danger)' : 'var(--color-accent)',
                  color: pending.danger ? '#ffffff' : 'var(--color-accent-on)',
                }}
              >
                {pending.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext);
}
