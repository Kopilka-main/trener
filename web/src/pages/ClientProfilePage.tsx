import { useNavigate } from 'react-router-dom';
import { Bell, ChevronRight, LogOut, Pencil, Settings } from 'lucide-react';
import { ScreenHeader } from '../components/ScreenHeader';
import { Avatar } from '../components/Avatar';
import { useConfirm } from '../components/ConfirmProvider';
import { useClient } from '../api/clients';
import { useClientWorkouts } from '../api/client-workouts';
import { fullName } from '../lib/initials';
import { calcAge, formatBirth } from '../lib/format';
import { CLIENT_BASE, DEMO_CLIENT_ID } from '../lib/routes';
import { ThemeToggle } from '../components/ThemeToggle';

type LucideIcon = typeof Settings;

// Профиль клиента — клиентский аналог карточки тренера.
export function ClientProfilePage() {
  const navigate = useNavigate();
  const { data: client } = useClient(DEMO_CLIENT_ID);
  const { data: workouts } = useClientWorkouts(DEMO_CLIENT_ID);
  const confirm = useConfirm();
  if (!client) return null;

  const age = calcAge(client.birthDate);
  const totalWorkouts = (workouts?.history.length ?? 0) + (workouts?.current ? 1 : 0);
  const tags = (client.hashtags ?? '').split(/\s+/).filter(Boolean);

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title="Профиль"
        back
        right={
          <button onClick={() => navigate(`${CLIENT_BASE}/profile/edit`)} className="flex h-8 w-8 items-center justify-center" aria-label="Редактировать">
            <Pencil size={16} />
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-5">
        <div className="flex items-center gap-3 rounded-3xl bg-[var(--color-card)] p-4">
          <Avatar firstName={client.firstName} lastName={client.lastName} size={64} />
          <div className="min-w-0">
            <div className="text-[19px] font-bold leading-tight">{fullName(client.firstName, client.lastName)}</div>
            <div className="mt-0.5 text-[13px] text-[var(--color-ink-muted)]">
              {age !== null ? `${age} лет · ` : ''}{totalWorkouts} тренировок
            </div>
          </div>
        </div>

        {tags.length > 0 && (
          <Section title="Теги">
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span key={t} className="rounded-full bg-[var(--color-chip)] px-3 py-1.5 text-[13px]">{t}</span>
              ))}
            </div>
          </Section>
        )}

        <Section title="Персональные данные">
          <div className="overflow-hidden rounded-2xl bg-[var(--color-card)] px-4">
            <DataRow label="Телефон" value={client.phone ?? '—'} />
            <DataRow
              label="Дата рождения"
              value={client.birthDate ? `${formatBirth(client.birthDate)}${age !== null ? ` · ${age} лет` : ''}` : '—'}
            />
            <DataRow label="Рост / вес" value={`${client.heightCm ?? '—'} см · ${client.weightKg ?? '—'} кг`} />
            <DataRow label="Пульс покоя" value={client.restingPulse ? `${client.restingPulse} уд/мин` : '—'} />
            <DataRow label="ID клиента" value={client.accountId ?? '—'} last />
          </div>
        </Section>

        {client.notes && (
          <Section title="Заметки">
            <div className="rounded-2xl bg-[var(--color-card)] p-3 text-[13px] leading-relaxed whitespace-pre-line">{client.notes}</div>
          </Section>
        )}

        {client.medicalNotes && (
          <Section title="Медицинская информация">
            <div className="rounded-2xl bg-[var(--color-card)] p-3 text-[13px] leading-relaxed whitespace-pre-line">{client.medicalNotes}</div>
          </Section>
        )}

        <div className="overflow-hidden rounded-2xl">
          <div className="flex w-full items-center gap-3 border-b border-[var(--color-line)] bg-[var(--color-card)] px-4 py-3.5">
            <Settings size={17} className="shrink-0 text-[var(--color-ink-muted)]" />
            <span className="flex-1 text-[14px] font-medium">Тема</span>
            <ThemeToggle />
          </div>
          <SettingRow icon={Bell} label="Уведомления" last />
        </div>

        <button
          onClick={async () => {
            if (!(await confirm('Выйти из приложения?', { confirmLabel: 'Выйти', danger: true }))) return;
            localStorage.removeItem('app_role');
            navigate('/', { replace: true });
          }}
          className="flex w-full items-center justify-center gap-2 py-2 text-[14px] font-semibold text-[var(--color-danger)]"
        >
          <LogOut size={16} /> Выйти
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="px-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">{title}</h3>
      {children}
    </section>
  );
}

function DataRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-3 ${last ? '' : 'border-b border-[var(--color-line)]'}`}>
      <span className="text-[13px] text-[var(--color-ink-muted)]">{label}</span>
      <span className="text-right text-[14px] font-semibold">{value}</span>
    </div>
  );
}

function SettingRow({ icon: Icon, label, last }: { icon: LucideIcon; label: string; last?: boolean }) {
  return (
    <button
      onClick={() => alert('Раздел в разработке')}
      className={`flex w-full items-center gap-3 bg-[var(--color-card)] px-4 py-3.5 text-left ${last ? '' : 'border-b border-[var(--color-line)]'}`}
    >
      <Icon size={17} className="shrink-0 text-[var(--color-ink-muted)]" />
      <span className="flex-1 text-[14px] font-medium">{label}</span>
      <ChevronRight size={16} className="shrink-0 text-[var(--color-ink-muted)]" />
    </button>
  );
}
