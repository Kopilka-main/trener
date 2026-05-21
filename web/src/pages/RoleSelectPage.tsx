import { useNavigate } from 'react-router-dom';
import { ChevronRight, Dumbbell, User } from 'lucide-react';
import { CLIENT_BASE, TRAINER_BASE } from '../lib/routes';

// Первый экран приложения — выбор режима: тренер или клиент.
export function RoleSelectPage() {
  const navigate = useNavigate();

  const pick = (role: 'trainer' | 'client') => {
    localStorage.setItem('app_role', role);
    if (role === 'client') {
      navigate(`${CLIENT_BASE}/workouts`, { replace: true });
    } else {
      navigate(localStorage.getItem('trener_auth') ? `${TRAINER_BASE}/home` : `${TRAINER_BASE}/login`, { replace: true });
    }
  };

  return (
    <div className="flex h-full flex-col justify-center px-6 pb-12">
      <h1 className="text-[28px] font-bold leading-tight">Добро пожаловать</h1>
      <p className="mt-2 text-[14px] text-[var(--color-ink-muted)]">
        Выберите, как вы будете пользоваться приложением.
      </p>

      <div className="mt-7 space-y-3">
        <button
          onClick={() => pick('trainer')}
          className="flex w-full items-center gap-4 rounded-2xl bg-[var(--color-accent)] p-4 text-left text-[var(--color-accent-on)]"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-black/10">
            <Dumbbell size={22} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] font-bold">Я тренер</span>
            <span className="block text-[12px] opacity-60">
              Клиенты, тренировки, календарь
            </span>
          </span>
          <ChevronRight size={18} className="shrink-0" />
        </button>

        <button
          onClick={() => pick('client')}
          className="flex w-full items-center gap-4 rounded-2xl bg-[var(--color-card)] p-4 text-left"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-chip)]">
            <User size={22} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] font-bold">Я клиент</span>
            <span className="block text-[12px] text-[var(--color-ink-muted)]">
              Мои тренировки и упражнения
            </span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-[var(--color-ink-muted)]" />
        </button>
      </div>
    </div>
  );
}
