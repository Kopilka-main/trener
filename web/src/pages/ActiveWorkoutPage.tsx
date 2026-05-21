import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, Plus, Square, X } from 'lucide-react';
import { SortableList } from '../components/SortableList';
import { AddExerciseSheet } from '../components/AddExerciseSheet';
import { useAddWorkoutExercise, useClientWorkout, useRemoveWorkoutExercise, useReorderWorkoutExercises, useUpdateSet } from '../api/client-workouts';
import { useClient } from '../api/clients';
import { useElapsed } from '../hooks/useElapsed';
import { appBase, clientWorkoutsPath } from '../lib/routes';
import { formatDuration } from '../lib/format';
import { shortName } from '../lib/initials';
import type { WorkoutExerciseDetail, WorkoutSet } from '../api/types';

type EditingKey = `${number}-${number}` | null;

export function ActiveWorkoutPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: workout } = useClientWorkout(id);
  const { data: client } = useClient(workout?.clientId);
  const updateSet = useUpdateSet(id);
  const elapsed = useElapsed(workout?.startedAt ?? null);
  const [editing, setEditing] = useState<EditingKey>(null);
  const reorderMut = useReorderWorkoutExercises(workout?.id ?? '', workout?.clientId ?? '');
  const addMut = useAddWorkoutExercise(workout?.id ?? '', workout?.clientId ?? '');
  const removeMut = useRemoveWorkoutExercise(workout?.id ?? '', workout?.clientId ?? '');
  const [order, setOrder] = useState<WorkoutExerciseDetail[]>([]);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (workout) setOrder(workout.exercises);
  }, [workout]);

  const setsCounters = useMemo(() => {
    if (!workout) return { done: 0, total: 0 };
    const all = workout.exercises.flatMap((e) => e.sets);
    return { done: all.filter((s) => s.done).length, total: all.length };
  }, [workout]);

  if (!workout) return null;
  const isFinished = workout.status === 'completed' || workout.status === 'skipped';

  const displayExercises = order.length > 0 ? order : workout.exercises;
  const exItems = displayExercises.map((ex) => ({ ...ex, id: `ex-${ex.position}` }));
  const onReorderExercises = (next: typeof exItems) => {
    setOrder(next);
    reorderMut.mutate(next.map((it) => it.position));
  };
  const onRemoveExercise = (position: number) => removeMut.mutate(position);

  const finishWorkout = () => {
    navigate(`${appBase()}/workouts/${workout.id}/summary?duration=${elapsed}`);
  };

  return (
    <div className="flex h-full flex-col">
      <header className="grid grid-cols-[44px_1fr_auto] items-center px-3 py-3">
        <button onClick={() => navigate(clientWorkoutsPath(workout.clientId))} className="flex h-8 w-8 items-center justify-center" aria-label="Назад">
          <Square size={18} strokeWidth={1.6} />
        </button>
        <div className="text-center">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
            {client ? `${shortName(client.firstName, client.lastName).toUpperCase()} · ${workout.status === 'active' ? 'идёт' : workout.status}` : ''}
          </div>
          <div className="text-[15px] font-semibold leading-tight">{workout.name}</div>
        </div>
        <button onClick={finishWorkout} disabled={isFinished} className="px-2 py-1 text-[14px] font-semibold text-[var(--color-success)] disabled:opacity-40">
          Завершить
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        <div className="rounded-2xl bg-[var(--color-accent)] p-4 text-[var(--color-accent-on)]">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/60">Прошло</div>
              <div className="text-3xl font-bold tabular-nums leading-tight">{formatDuration(elapsed)}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/60">Подходов</div>
              <div className="text-2xl font-bold tabular-nums leading-tight">{setsCounters.done} / {setsCounters.total}</div>
            </div>
          </div>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/15">
            <div className="h-full bg-white" style={{ width: setsCounters.total === 0 ? '0%' : `${(setsCounters.done / setsCounters.total) * 100}%` }} />
          </div>
        </div>

        <SortableList
          items={exItems}
          onReorder={onReorderExercises}
          rowClassName=""
          contentClassName="pr-2"
          listClassName="space-y-1.5"
          renderItem={(ex) => (
            <div className="space-y-3">
              {ex.sets.map((set) => {
                const key: EditingKey = `${ex.position}-${set.setIndex}`;
                const isEditing = editing === key;
                const isCurrent = !set.done && key === currentKey({ exercises: displayExercises });
                return (
                  <div
                    key={key}
                    className={`rounded-2xl bg-[var(--color-card)] p-3 ${isCurrent ? 'ring-2 ring-ink' : ''}`}
                    style={set.done ? { backgroundColor: 'color-mix(in srgb, var(--color-success) 16%, var(--color-card))' } : undefined}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-[14px] font-semibold">{ex.exerciseName}</div>
                      {!isFinished && <HoldToDelete onDelete={() => onRemoveExercise(ex.position)} />}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase text-[var(--color-ink-muted)]">План</span>
                      <span className="text-[13px] tabular-nums underline decoration-dotted underline-offset-4">{planText(set)}</span>
                      <span className="ml-2 text-[10px] font-semibold uppercase text-[var(--color-ink-muted)]">Факт</span>
                      {isEditing ? (
                        <SetEditor
                          set={set}
                          onCancel={() => setEditing(null)}
                          onSave={async (patch) => {
                            await updateSet.mutateAsync({
                              exPos: ex.position,
                              setIdx: set.setIndex,
                              body: { ...patch, done: true },
                            });
                            setEditing(null);
                          }}
                        />
                      ) : (
                        <button onClick={() => !isFinished && setEditing(key)} className="flex items-center gap-1.5 text-[13px] tabular-nums" disabled={isFinished}>
                          <FactPills set={set} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        />

        <button
          onClick={() => setAdding(true)}
          disabled={isFinished}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--color-line)] py-3.5 text-[13px] font-medium text-[var(--color-ink-muted)] disabled:opacity-50"
        >
          <Plus size={14} /> Добавить упражнение
        </button>
      </div>

      <AddExerciseSheet
        open={adding}
        onClose={() => setAdding(false)}
        onPick={(exerciseId) => { addMut.mutate(exerciseId); setAdding(false); }}
      />
    </div>
  );
}

function currentKey(workout: { exercises: { position: number; sets: { setIndex: number; done: boolean }[] }[] }): EditingKey {
  for (const ex of workout.exercises) {
    for (const s of ex.sets) {
      if (!s.done) return `${ex.position}-${s.setIndex}`;
    }
  }
  return null;
}

function planText(set: WorkoutSet): string {
  const parts: string[] = [];
  if (set.plannedReps !== null) parts.push(`${set.plannedReps}`);
  if (set.plannedWeightKg !== null) parts.push(`× ${set.plannedWeightKg} кг`);
  if (set.plannedTimeSec !== null) parts.push(`${set.plannedTimeSec} с`);
  return parts.join(' ') || '—';
}

function FactPills({ set }: { set: WorkoutSet }) {
  const reps = set.actualReps ?? null;
  const weight = set.actualWeightKg ?? null;
  const time = set.actualTimeSec ?? null;
  const showWeight = set.plannedWeightKg !== null;
  const showTime = set.plannedTimeSec !== null;
  const showReps = set.plannedReps !== null;
  const pill = (val: number | null, suffix?: string) => (
    <span className={`inline-flex min-w-[36px] justify-center rounded-md px-1.5 py-0.5 text-[12px] ${set.done ? 'bg-[var(--color-chip)]' : 'border border-dashed border-[var(--color-line)] text-[var(--color-ink-muted)]'}`}>
      {val !== null ? val : '—'}{suffix ? ` ${suffix}` : ''}
    </span>
  );
  return (
    <span className="flex items-center gap-1">
      {showReps && pill(reps)}
      {(showReps && (showWeight || showTime)) && <span className="text-[var(--color-ink-muted)]">×</span>}
      {showWeight && pill(weight, 'кг')}
      {showTime && pill(time, 'с')}
    </span>
  );
}

function SetEditor({ set, onCancel, onSave }: { set: WorkoutSet; onCancel: () => void; onSave: (patch: { actualReps: number | null; actualWeightKg: number | null; actualTimeSec: number | null }) => Promise<void> }) {
  const [reps, setReps] = useState<string>(String(set.actualReps ?? set.plannedReps ?? ''));
  const [weight, setWeight] = useState<string>(String(set.actualWeightKg ?? set.plannedWeightKg ?? ''));
  const [time, setTime] = useState<string>(String(set.actualTimeSec ?? set.plannedTimeSec ?? ''));
  const showReps = set.plannedReps !== null;
  const showWeight = set.plannedWeightKg !== null;
  const showTime = set.plannedTimeSec !== null;

  return (
    <span className="inline-flex items-center gap-1">
      {showReps && (
        <input
          autoFocus
          inputMode="decimal"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          className="w-12 rounded-md bg-[var(--color-chip)] px-1.5 py-0.5 text-center text-[12px] focus:outline-none"
        />
      )}
      {(showReps && (showWeight || showTime)) && <span className="text-[var(--color-ink-muted)]">×</span>}
      {showWeight && (
        <input
          inputMode="decimal"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="w-14 rounded-md bg-[var(--color-chip)] px-1.5 py-0.5 text-center text-[12px] focus:outline-none"
        />
      )}
      {showTime && (
        <input
          inputMode="decimal"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-12 rounded-md bg-[var(--color-chip)] px-1.5 py-0.5 text-center text-[12px] focus:outline-none"
        />
      )}
      <button
        type="button"
        aria-label="Сохранить подход"
        onClick={() =>
          onSave({
            actualReps: showReps && reps !== '' ? Number(reps) : null,
            actualWeightKg: showWeight && weight !== '' ? Number(weight) : null,
            actualTimeSec: showTime && time !== '' ? Number(time) : null,
          })
        }
        className="ml-1 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-success)] text-white shadow-sm transition-transform active:scale-90"
      >
        <Check size={15} strokeWidth={3} />
      </button>
      <button
        type="button"
        aria-label="Отменить"
        onClick={onCancel}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-chip)] text-[var(--color-ink-muted)] transition-transform active:scale-90"
      >
        <X size={14} strokeWidth={2.5} />
      </button>
    </span>
  );
}

// Кнопка удаления с удержанием: держать 2 сек, вокруг рисуется окружность по часовой.
function HoldToDelete({ onDelete }: { onDelete: () => void }) {
  const HOLD_MS = 2000;
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(0);

  useEffect(() => () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); }, []);

  const tick = (now: number) => {
    const p = Math.min((now - startRef.current) / HOLD_MS, 1);
    setProgress(p);
    if (p >= 1) {
      rafRef.current = null;
      setProgress(0);
      onDelete();
    } else {
      rafRef.current = requestAnimationFrame(tick);
    }
  };

  const start = () => {
    startRef.current = performance.now();
    if (rafRef.current === null) rafRef.current = requestAnimationFrame(tick);
  };

  const cancel = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setProgress(0);
  };

  const size = 34;
  const r = 15;
  const circ = 2 * Math.PI * r;

  return (
    <button
      type="button"
      aria-label="Удерживайте 2 секунды для удаления"
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); start(); }}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: size, height: size, touchAction: 'none' }}
    >
      <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth="2" />
        {progress > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--color-danger)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - progress)}
          />
        )}
      </svg>
      <X size={16} className="relative text-[var(--color-danger)]" />
    </button>
  );
}
