import { useNavigate } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { Avatar } from './Avatar';
import { calcAge, formatBirth } from '../lib/format';
import { fullName } from '../lib/initials';
import { useClientWorkouts } from '../api/client-workouts';
import { appBase } from '../lib/routes';
import type { Client } from '../api/types';

type Props = {
  client: Client | null;
  open: boolean;
  onClose: () => void;
};

export function ClientPreviewSheet({ client, open, onClose }: Props) {
  const navigate = useNavigate();
  const { data: workouts } = useClientWorkouts(client?.id);
  if (!client) return null;
  const age = calcAge(client.birthDate);
  const totalWorkouts = (workouts?.history.length ?? 0) + (workouts?.current ? 1 : 0);

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="px-4 pb-3 pt-2 space-y-3">
        <div className="rounded-2xl bg-[var(--color-card)] p-4">
          <div className="flex items-center gap-3">
            <Avatar firstName={client.firstName} lastName={client.lastName} size={52} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[18px] font-bold leading-tight">{fullName(client.firstName, client.lastName)}</div>
              <div className="mt-0.5 text-[12px] text-[var(--color-ink-muted)]">
                {age !== null ? `${age} лет` : '—'} · {totalWorkouts} тренировок
              </div>
            </div>
          </div>
          {client.hashtags && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {client.hashtags.split(/\s+/).filter(Boolean).map((tag) => (
                <span key={tag} className="rounded-full bg-[var(--color-chip)] px-2.5 py-1 text-[11px]">{tag}</span>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-[var(--color-card)] p-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">Персональные данные</h3>
          <dl className="mt-2 divide-y divide-[var(--color-line)] text-sm">
            <Row label="Телефон" value={client.phone ?? '—'} />
            <Row label="Дата рождения" value={client.birthDate ? `${formatBirth(client.birthDate)}${age !== null ? ` · ${age} лет` : ''}` : '—'} />
            <Row label="Рост / вес" value={`${client.heightCm ?? '—'} см · ${client.weightKg ?? '—'} кг`} />
            <Row label="ID клиента" value={client.accountId ?? '—'} />
          </dl>
        </div>

        {client.notes && (
          <div className="rounded-2xl bg-[var(--color-card)] p-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">Заметки</h3>
            <p className="mt-2 text-[14px] leading-relaxed whitespace-pre-line">{client.notes}</p>
          </div>
        )}

        {client.medicalNotes && (
          <div className="rounded-2xl bg-[var(--color-card)] p-4">
            <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-danger)]" />
              Медицинская информация
            </h3>
            <p className="mt-2 text-[14px] leading-relaxed whitespace-pre-line">{client.medicalNotes}</p>
          </div>
        )}

        <button
          onClick={() => { onClose(); navigate(`${appBase()}/clients/${client.id}/edit`); }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-ink py-4 text-[15px] font-semibold"
          style={{ color: '#ffffff' }}
        >
          <Pencil size={16} /> Редактировать данные
        </button>
      </div>
    </BottomSheet>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2.5">
      <dt className="text-[var(--color-ink-muted)]">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  );
}
