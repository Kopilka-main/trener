import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, Dumbbell, Pencil } from 'lucide-react';
import { ScreenHeader } from '../components/ScreenHeader';
import { Avatar } from '../components/Avatar';
import { useClient } from '../api/clients';
import { useClientWorkouts } from '../api/client-workouts';
import { calcAge, formatBirth, formatDate, formatDuration } from '../lib/format';
import { fullName } from '../lib/initials';
import type { ClientWorkoutSummary } from '../api/types';

// Полноценная страница карточки клиента. Открывается тапом по клиенту в списке.
// Сверху — крупная CTA «Перейти к тренировкам», ниже — данные и история.
export function ClientCardPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: client } = useClient(id);
  const { data: workouts } = useClientWorkouts(id);

  if (!client) return null;

  const age = calcAge(client.birthDate);
  const tags = (client.hashtags ?? '').split(/\s+/).filter(Boolean);
  const history = workouts?.history ?? [];
  const totalWorkouts = history.length + (workouts?.current ? 1 : 0);
  const recent = history.slice(0, 3);

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title="Карточка клиента"
        back
        right={
          <button
            onClick={() => navigate(`/trainer/clients/${id}/edit`)}
            className="flex h-8 w-8 items-center justify-center"
            aria-label="Редактировать"
          >
            <Pencil size={16} />
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-5">
        {/* Шапка: аватар + имя + теги */}
        <div className="rounded-3xl bg-[var(--color-card)] p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Avatar firstName={client.firstName} lastName={client.lastName} size={64} />
            <div className="min-w-0">
              <div className="text-[19px] font-bold leading-tight">
                {fullName(client.firstName, client.lastName)}
              </div>
              <div className="mt-0.5 text-[13px] text-[var(--color-ink-muted)]">
                {age !== null ? `${age} лет · ` : ''}{totalWorkouts} тренировок
              </div>
              {client.currentTrainingType && (
                <div className="text-[12px] text-[var(--color-ink-muted)]">{client.currentTrainingType}</div>
              )}
            </div>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span key={t} className="rounded-full bg-[var(--color-chip)] px-3 py-1.5 text-[13px]">{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* CTA: переход к тренировкам */}
        <button
          onClick={() => navigate(`/trainer/clients/${id}/workouts`)}
          className="flex w-full items-center gap-3 rounded-2xl bg-ink p-4 text-left"
          style={{ color: '#ffffff' }}
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10">
            <Dumbbell size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-bold">Перейти к тренировкам</span>
            <span className="block text-[12px]" style={{ color: 'rgba(255,255,255,0.7)' }}>
              текущая + история
            </span>
          </span>
          <ChevronRight size={18} className="shrink-0" />
        </button>

        <Section title="Персональные данные">
          <div className="overflow-hidden rounded-2xl">
            <Row label="Телефон" value={client.phone ?? '—'} />
            <Row
              label="Дата рождения"
              value={
                client.birthDate
                  ? `${formatBirth(client.birthDate)}${age !== null ? ` · ${age} лет` : ''}`
                  : '—'
              }
            />
            <Row label="Рост / вес" value={`${client.heightCm ?? '—'} см · ${client.weightKg ?? '—'} кг`} />
            <Row label="ID клиента" value={client.accountId ?? '—'} last />
          </div>
        </Section>

        {client.notes && (
          <Section title="Заметки">
            <div className="rounded-2xl bg-[var(--color-card)] p-4 text-[14px] leading-relaxed whitespace-pre-line">
              {client.notes}
            </div>
          </Section>
        )}

        {client.medicalNotes && (
          <Section title="Медицинская информация" indicator>
            <div className="rounded-2xl bg-[var(--color-card)] p-4 text-[14px] leading-relaxed whitespace-pre-line">
              {client.medicalNotes}
            </div>
          </Section>
        )}

        {recent.length > 0 && (
          <Section title="Последние тренировки">
            <ul className="overflow-hidden rounded-2xl">
              {recent.map((w, i) => (
                <HistoryItem key={w.id} workout={w} last={i === recent.length - 1} />
              ))}
            </ul>
          </Section>
        )}

        <button
          onClick={() => navigate(`/trainer/clients/${id}/edit`)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-card)] py-3.5 text-[14px] font-medium"
        >
          <Pencil size={16} /> Редактировать данные
        </button>
      </div>
    </div>
  );
}

function Section({ title, children, indicator }: { title: string; children: React.ReactNode; indicator?: boolean }) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
        {indicator && <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-danger)]" />}
        {title}
      </h3>
      {children}
    </section>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 bg-[var(--color-card)] px-4 py-3 ${
        last ? '' : 'border-b border-[var(--color-line)]'
      }`}
    >
      <div className="text-[13px] text-[var(--color-ink-muted)]">{label}</div>
      <div className="text-right text-[14px] font-semibold">{value}</div>
    </div>
  );
}

function HistoryItem({ workout, last }: { workout: ClientWorkoutSummary; last: boolean }) {
  const dateStr = formatDate(workout.completedAt ?? workout.createdAt);
  const [month, day] = dateStr.split(' ');
  return (
    <li
      className={`flex items-center gap-3 bg-[var(--color-card)] px-3 py-2.5 ${
        last ? '' : 'border-b border-[var(--color-line)]'
      }`}
    >
      <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-[var(--color-chip)] text-center leading-tight">
        <span className="text-[10px] font-medium uppercase text-[var(--color-ink-muted)]">{month}</span>
        <span className="text-sm font-bold tabular-nums">{day}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold">{workout.name}</div>
        {workout.status === 'skipped' ? (
          <div className="text-[11px] text-[var(--color-danger)]">пропущена</div>
        ) : (
          <div className="text-[11px] text-[var(--color-ink-muted)]">
            {workout.durationSec ? formatDuration(workout.durationSec) : ''}
            {workout.rpe ? ` · RPE ${workout.rpe}` : ''}
          </div>
        )}
      </div>
    </li>
  );
}
