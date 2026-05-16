import { useNavigate } from 'react-router-dom';
import { ChevronRight, Dumbbell, User } from 'lucide-react';

// Первый экран приложения — выбор режима: тренер или клиент.
export function RoleSelectPage() {
  const navigate = useNavigate();

  const pick = (role: 'trainer' | 'client') => {
    localStorage.setItem('app_role', role);
    if (role === 'client') {
      navigate('/clients/cl_001/workouts', { replace: true });
    } else {
      navigate(localStorage.getItem('trener_auth') ? '/clients' : '/login', { replace: true });
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
          className="flex w-full items-center gap-4 rounded-2xl bg-ink p-4 text-left"
          style={{ color: '#ffffff' }}
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10">
            <Dumbbell size={22} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] font-bold">Я тренер</span>
            <span className="block text-[12px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
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
