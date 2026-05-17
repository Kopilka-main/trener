import { useEffect } from 'react';
import type { ReactNode } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function BottomSheet({ open, onClose, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/35" onClick={onClose} />
      <div className="relative w-full max-w-[430px] rounded-t-3xl bg-[var(--color-bg)] pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl">
        <div className="mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-[var(--color-line)]" />
        {children}
      </div>
    </div>
  );
}
