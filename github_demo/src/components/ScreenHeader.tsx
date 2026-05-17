import { ChevronLeft, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { backTarget } from '../lib/routes';

type Props = {
  title: ReactNode;
  back?: boolean | (() => void);
  closeIcon?: boolean;
  right?: ReactNode;
};

export function ScreenHeader({ title, back, closeIcon, right }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  // «Назад» ведёт к родительскому экрану по иерархии, а не по истории браузера.
  const onBack = () => {
    if (typeof back === 'function') back();
    else navigate(backTarget(location.pathname, location.search));
  };
  const Icon = closeIcon ? X : ChevronLeft;
  return (
    <header className="grid grid-cols-[44px_1fr_auto] items-center px-3 py-3">
      {back ? (
        <button onClick={onBack} className="flex h-8 w-8 items-center justify-center rounded-full active:bg-black/5" aria-label="Назад">
          <Icon size={20} strokeWidth={1.8} />
        </button>
      ) : (
        <span />
      )}
      <h1 className="truncate text-center text-[15px] font-semibold">{title}</h1>
      <div className="flex shrink-0 justify-end pr-1">{right}</div>
    </header>
  );
}
