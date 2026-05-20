import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Field, TextInput } from '../components/Field';
import { Checkbox } from '../components/Checkbox';
import { TRAINER_BASE } from '../lib/routes';

export function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('Алексей Морозов');
  const [email, setEmail] = useState('moroz.coach@mail.ru');
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(false);

  const submit = () => {
    if (!name.trim() || !email.trim()) {
      alert('Заполните имя и почту');
      return;
    }
    if (password.length < 8) {
      alert('Пароль — минимум 8 символов');
      return;
    }
    if (!agree) {
      alert('Примите условия использования');
      return;
    }
    localStorage.setItem('trener_auth', '1');
    navigate(`${TRAINER_BASE}/home`, { replace: true });
  };

  return (
    <div className="flex h-full flex-col justify-center px-6 pb-12">
      <h1 className="text-[28px] font-bold leading-tight">Создать аккаунт</h1>
      <p className="mt-2 text-[14px] text-[var(--color-ink-muted)]">
        Тренерское пространство — клиенты, тренировки, статистика.
      </p>

      <div className="mt-7 space-y-4">
        <Field label="Имя">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Имя и фамилия" />
        </Field>
        <Field label="Эл. почта">
          <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@mail.ru" />
        </Field>
        <Field label="Пароль" hint="Минимум 8 символов">
          <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </Field>

        <button type="button" onClick={() => setAgree((v) => !v)} className="flex items-start gap-2.5 text-left">
          <Checkbox checked={agree} />
          <span className="text-[13px] text-[var(--color-ink-muted)]">
            Принимаю условия использования и политику конфиденциальности
          </span>
        </button>
      </div>

      <button
        onClick={submit}
        className="mt-6 w-full rounded-2xl bg-ink py-3.5 text-[15px] font-semibold"
        style={{ color: '#ffffff' }}
      >
        Создать аккаунт
      </button>

      <div className="mt-6 text-center text-[13px] text-[var(--color-ink-muted)]">
        Уже есть аккаунт?{' '}
        <button type="button" onClick={() => navigate(`${TRAINER_BASE}/login`)} className="font-semibold text-ink">
          Войти
        </button>
      </div>
    </div>
  );
}
