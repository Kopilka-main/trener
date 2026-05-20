import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Field, TextInput } from '../components/Field';
import { Checkbox } from '../components/Checkbox';
import { TRAINER_BASE } from '../lib/routes';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('moroz.coach@mail.ru');
  const [password, setPassword] = useState('');
  const [stay, setStay] = useState(true);

  const submit = () => {
    if (!email.trim() || !password) {
      alert('Введите почту и пароль');
      return;
    }
    localStorage.setItem('trener_auth', '1');
    navigate(`${TRAINER_BASE}/home`, { replace: true });
  };

  return (
    <div className="flex h-full flex-col justify-center px-6 pb-12">
      <h1 className="text-[28px] font-bold leading-tight">С возвращением</h1>
      <p className="mt-2 text-[14px] text-[var(--color-ink-muted)]">
        Войдите, чтобы продолжить вести клиентов и тренировки.
      </p>

      <div className="mt-7 space-y-4">
        <Field label="Эл. почта">
          <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@mail.ru" />
        </Field>

        <div>
          <div className="mb-1.5 flex items-center justify-between px-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">Пароль</span>
            <button
              type="button"
              onClick={() => alert('Восстановление пароля пока недоступно')}
              className="text-[12px] text-[var(--color-ink-muted)]"
            >
              Забыли?
            </button>
          </div>
          <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>

        <button type="button" onClick={() => setStay((v) => !v)} className="flex items-center gap-2.5">
          <Checkbox checked={stay} />
          <span className="text-[13px]">Оставаться в аккаунте</span>
        </button>
      </div>

      <button
        onClick={submit}
        className="mt-6 w-full rounded-2xl bg-ink py-3.5 text-[15px] font-semibold"
        style={{ color: '#ffffff' }}
      >
        Войти
      </button>

      <div className="mt-6 text-center text-[13px] text-[var(--color-ink-muted)]">
        Нет аккаунта?{' '}
        <button type="button" onClick={() => navigate(`${TRAINER_BASE}/register`)} className="font-semibold text-ink">
          Создать
        </button>
      </div>
    </div>
  );
}
