import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { ScreenHeader } from '../components/ScreenHeader';
import { Field, TextArea } from '../components/Field';
import { Avatar } from '../components/Avatar';
import { useClientWorkout, useFinishWorkout } from '../api/client-workouts';
import { useClient } from '../api/clients';
import { fullName } from '../lib/initials';
import { formatDuration } from '../lib/format';
import { clientWorkoutsPath } from '../lib/routes';
import { RPE_OPTIONS } from '../lib/catalog';

export function WorkoutSummaryPage() {
  const { id = '' } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data: workout } = useClientWorkout(id);
  const { data: client } = useClient(workout?.clientId);
  const finishMut = useFinishWorkout(id);

  const [note, setNote] = useState('');
  const [rpe, setRpe] = useState<number | null>(null);

  if (!workout || !client) return null;
  const duration = Number(searchParams.get('duration') ?? '0');

  const save = async () => {
    await finishMut.mutateAsync({
      trainerNote: note.trim() || null,
      rpe,
      durationSec: duration,
    });
    navigate(clientWorkoutsPath(client.id));
  };

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title="Итоги тренировки" back={() => navigate(clientWorkoutsPath(client.id))} closeIcon />
      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-4">
        <div className="rounded-3xl bg-[var(--color-card)] p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-success)] text-white">
            <Check size={26} strokeWidth={3} />
          </div>
          <div className="mt-4 text-[20px] font-bold">Тренировка завершена</div>
          <div className="mt-1 text-[13px] text-[var(--color-ink-muted)]">{workout.name} · {formatDuration(duration)}</div>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[var(--color-chip)] px-2 py-1 pr-3 text-[12px]">
            <Avatar firstName={client.firstName} lastName={client.lastName} size={22} />
            <span className="font-medium">{fullName(client.firstName, client.lastName)}</span>
          </div>
        </div>

        <Field label="Заметка к тренировке">
          <TextArea
            rows={4}
            placeholder="↩ дополнить…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>

        <div>
          <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">Самочувствие клиента</div>
          <div className="grid grid-cols-3 gap-2">
            {RPE_OPTIONS.map((opt) => {
              const active = rpe === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setRpe(opt.value)}
                  className={`rounded-2xl py-4 text-center ${active ? 'bg-ink text-white' : 'bg-[var(--color-card)]'}`}
                >
                  <div className="text-[14px] font-semibold">{opt.label}</div>
                  <div className={`mt-0.5 text-[11px] ${active ? 'text-white/70' : 'text-[var(--color-ink-muted)]'}`}>{opt.sub}</div>
                </button>
              );
            })}
          </div>
        </div>

        <button onClick={save} className="mt-2 w-full rounded-2xl bg-ink py-4 text-[15px] font-semibold" style={{ color: '#ffffff' }}>
          Сохранить в историю
        </button>
      </div>
    </div>
  );
}
