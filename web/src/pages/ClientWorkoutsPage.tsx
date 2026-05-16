import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CalendarDays, ChevronDown, ChevronUp, MoreHorizontal, Play, Plus, RotateCcw, X } from 'lucide-react';
import { ScreenHeader } from '../components/ScreenHeader';
import { Avatar } from '../components/Avatar';
import { BottomSheet } from '../components/BottomSheet';
import { SortableList } from '../components/SortableList';
import { AddExerciseSheet } from '../components/AddExerciseSheet';
import { ClientPreviewSheet } from '../components/ClientPreviewSheet';
import { useClient } from '../api/clients';
import { useAddWorkoutExercise, useAssignWorkout, useClientWorkout, useClientWorkouts, useDeleteWorkout, useRemoveWorkoutExercise, useReorderWorkoutExercises, useStartWorkout } from '../api/client-workouts';
import { useWorkoutTemplates } from '../api/workout-templates';
import { EXERCISE_CATEGORIES } from '../lib/catalog';
import { useConfirm } from '../components/ConfirmProvider';
import { fullName } from '../lib/initials';
import { formatDate, formatDuration } from '../lib/format';
import type { ClientWorkout, ClientWorkoutSummary, WorkoutExerciseDetail, WorkoutSet } from '../api/types';

export function ClientWorkoutsPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: client } = useClient(id);
  const { data: workouts, refetch } = useClientWorkouts(id);
  const startMut = useStartWorkout();
  const assignMut = useAssignWorkout(id);
  const deleteMut = useDeleteWorkout(id);
  const confirm = useConfirm();
  const [picker, setPicker] = useState<'none' | 'template' | 'history'>('none');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  if (!client) return null;

  const current = workouts?.current;
  const history = workouts?.history ?? [];
  const totalWorkouts = history.length + (current ? 1 : 0);

  const onStart = async () => {
    if (!current) return;
    if (current.status === 'draft') {
      await startMut.mutateAsync(current.id);
    }
    navigate(`/workouts/${current.id}/active`);
  };

  const onContinue = () => {
    if (current) navigate(`/workouts/${current.id}/active`);
  };

  // Назначить тренировку; если у клиента уже есть текущая — заменить её на новую.
  const handleAssign = async (body: { sourceTemplateId?: string; cloneFromWorkoutId?: string }) => {
    if (current) {
      if (!(await confirm('Заменить текущую тренировку на новую?', { confirmLabel: 'Заменить' }))) return;
      await deleteMut.mutateAsync(current.id);
    }
    await assignMut.mutateAsync(body);
    refetch();
  };

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title="Тренировки"
        back
        right={<button className="flex h-8 w-8 items-center justify-center" aria-label="Меню"><MoreHorizontal size={18} /></button>}
      />
      <div className="flex-1 overflow-y-auto pb-6">
        <div className="px-5 pb-3 pt-1 flex items-center gap-3">
          <button
            onClick={() => setPreviewOpen(true)}
            className="flex min-w-0 flex-1 items-center gap-3 text-left transition-transform active:scale-[0.99]"
          >
            <Avatar firstName={client.firstName} lastName={client.lastName} size={48} />
            <div className="min-w-0">
              <div className="text-[20px] font-bold leading-tight">{fullName(client.firstName, client.lastName)}</div>
              <div className="text-[12px] text-[var(--color-ink-muted)]">{totalWorkouts} тренировок</div>
            </div>
          </button>
          <button
            onClick={() => navigate(`/calendar?clientId=${id}`)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-chip)]"
            aria-label="Календарь"
          >
            <CalendarDays size={18} />
          </button>
        </div>

        <SectionHeader title="Ближайшая тренировка" />
        <div className="px-4">
          {!current && (
            <EmptyCurrent
              onPickTemplate={() => setPicker('template')}
              onPickHistory={() => setPicker('history')}
              hasHistory={history.length > 0}
            />
          )}
          {current && (
            <>
              <CurrentCard
                workout={current}
                onStart={current.status === 'active' ? onContinue : onStart}
              />
              <div className="mt-3 rounded-3xl border-2 border-dashed border-[var(--color-line)] p-4 text-center">
                <div className="mx-auto max-w-[280px] text-[12px] text-[var(--color-ink-muted)]">
                  Можно выбрать другую тренировку из базы знаний или повторить одну из прошлых.
                </div>
                <button
                  onClick={() => setPicker('template')}
                  className="mt-3 w-full rounded-2xl bg-ink py-2.5 text-[13px] font-semibold"
                  style={{ color: '#ffffff' }}
                >
                  Выбрать из базы
                </button>
                <button
                  onClick={() => setPicker('history')}
                  disabled={history.length === 0}
                  className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-[var(--color-ink-muted)] disabled:opacity-40"
                >
                  <RotateCcw size={12} /> или повторить из истории
                </button>
              </div>
            </>
          )}
        </div>

        <SectionHeader title={`История тренировок · ${history.length}`} className="mt-5" />
        <div className="px-4">
          {history.length === 0 ? (
            <div className="rounded-2xl bg-[var(--color-card)] py-8 text-center text-sm text-[var(--color-ink-muted)]">Истории пока нет</div>
          ) : (
            <ul className="space-y-2">
              {history.map((w) => (
                <HistoryRow
                  key={w.id}
                  workout={w}
                  expanded={expandedId === w.id}
                  onToggle={() => setExpandedId(expandedId === w.id ? null : w.id)}
                  onRepeat={() => handleAssign({ cloneFromWorkoutId: w.id })}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      <ClientPreviewSheet client={client} open={previewOpen} onClose={() => setPreviewOpen(false)} />
      <TemplatePicker
        open={picker === 'template'}
        onClose={() => setPicker('none')}
        onAssign={handleAssign}
        onPicked={() => setPicker('none')}
      />
      <HistoryPicker
        open={picker === 'history'}
        history={history}
        onClose={() => setPicker('none')}
        onAssign={handleAssign}
        onPicked={() => setPicker('none')}
      />
    </div>
  );
}

function SectionHeader({ title, right, className = '' }: { title: string; right?: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-between px-5 pb-1.5 pt-3 ${className}`}>
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">{title}</h2>
      {right && <span className="text-[11px] text-[var(--color-ink-muted)]">{right}</span>}
    </div>
  );
}

function CurrentCard({ workout, onStart }: { workout: ClientWorkout; onStart: () => void }) {
  const reorderMut = useReorderWorkoutExercises(workout.id, workout.clientId);
  const addMut = useAddWorkoutExercise(workout.id, workout.clientId);
  const removeMut = useRemoveWorkoutExercise(workout.id, workout.clientId);
  const confirm = useConfirm();
  const [order, setOrder] = useState<WorkoutExerciseDetail[]>(workout.exercises);
  const [expanded, setExpanded] = useState(false);
  const [adding, setAdding] = useState(false);

  // Локальный порядок упражнений, синхронизируется с сервером после refetch.
  useEffect(() => {
    setOrder(workout.exercises);
  }, [workout]);

  const items = order.map((ex) => ({ ...ex, id: `ex-${ex.position}` }));

  const onReorder = (next: typeof items) => {
    setOrder(next);
    reorderMut.mutate(next.map((it) => it.position));
  };

  const onRemoveExercise = async (position: number) => {
    if (!(await confirm('Удалить упражнение из тренировки?', { confirmLabel: 'Удалить', danger: true }))) return;
    removeMut.mutate(position);
  };

  return (
    <div className="rounded-3xl bg-[var(--color-card)] p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-[18px] font-bold">{workout.name}</div>
          <div className="text-[12px] text-[var(--color-ink-muted)]">
            {workout.exercises.length} упражнений · ~{Math.round(estimateDurationMin(workout))} мин
          </div>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--color-ink-muted)]"
          aria-label={expanded ? 'Свернуть' : 'Развернуть'}
        >
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {expanded && (
        <>
          {items.length > 0 && (
            <SortableList
              items={items}
              onReorder={onReorder}
              rowClassName="bg-[var(--color-bg)]"
              renderItem={(ex) => (
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold">{ex.exerciseName}</div>
                    <div className="text-[11px] text-[var(--color-ink-muted)]">{plannedSummary(ex.sets[0])}</div>
                  </div>
                  <button
                    onClick={() => onRemoveExercise(ex.position)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--color-ink-muted)]"
                    aria-label="Удалить упражнение"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            />
          )}
          <button
            onClick={() => setAdding(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--color-line)] py-3 text-[13px] font-medium text-[var(--color-ink-muted)]"
          >
            <Plus size={15} /> Добавить упражнение
          </button>
        </>
      )}

      <button
        onClick={onStart}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-ink py-3.5 text-[15px] font-semibold"
        style={{ color: '#ffffff' }}
      >
        <Play size={16} fill="currentColor" /> {workout.status === 'active' ? 'Продолжить' : 'Начать тренировку'}
      </button>

      <AddExerciseSheet
        open={adding}
        onClose={() => setAdding(false)}
        onPick={(exerciseId) => { addMut.mutate(exerciseId); setAdding(false); }}
      />
    </div>
  );
}

function plannedSummary(s: WorkoutSet | undefined): string {
  if (!s) return '';
  return [
    s.plannedReps !== null ? `${s.plannedReps} повт` : null,
    s.plannedWeightKg !== null ? `${s.plannedWeightKg} кг` : null,
    s.plannedTimeSec !== null ? `${s.plannedTimeSec} с` : null,
    s.plannedRestSec ? `отдых ${s.plannedRestSec} с` : null,
  ].filter(Boolean).join(' · ');
}

// Итог подхода для истории: показываем факт, если он есть, иначе план.
function factSummary(s: WorkoutSet | undefined): string {
  if (!s) return '';
  const reps = s.actualReps ?? s.plannedReps;
  const weight = s.actualWeightKg ?? s.plannedWeightKg;
  const time = s.actualTimeSec ?? s.plannedTimeSec;
  return [
    reps !== null ? `${reps}` : null,
    weight !== null ? `× ${weight} кг` : null,
    time !== null ? `${time} с` : null,
  ].filter(Boolean).join(' ');
}

function estimateDurationMin(w: ClientWorkout): number {
  const totalSec = w.exercises.reduce((acc, ex) => {
    const setDur = ex.sets.reduce((a, s) => a + (s.plannedRestSec ?? 0) + (s.plannedTimeSec ?? 0) + 30, 0);
    return acc + setDur;
  }, 0);
  return totalSec / 60;
}

function EmptyCurrent({
  onPickTemplate,
  onPickHistory,
  hasHistory,
}: {
  onPickTemplate: () => void;
  onPickHistory: () => void;
  hasHistory: boolean;
}) {
  return (
    <div>
      <div className="rounded-3xl border-2 border-dashed border-[var(--color-line)] bg-[var(--color-bg)]/40 p-5 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-chip)]">
          <Plus size={20} />
        </div>
        <div className="mt-3 text-[15px] font-semibold">Тренировка не запланирована</div>
        <div className="mx-auto mt-1 max-w-[280px] text-[12px] text-[var(--color-ink-muted)]">
          Выберите готовую из базы знаний или повторите одну из прошлых тренировок.
        </div>
        <button onClick={onPickTemplate} className="mt-4 w-full rounded-2xl bg-ink py-3 text-[14px] font-semibold" style={{ color: '#ffffff' }}>
          Выбрать из базы
        </button>
        <button onClick={onPickHistory} disabled={!hasHistory} className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-[var(--color-ink-muted)] disabled:opacity-40">
          <RotateCcw size={13} /> или повторить из истории
        </button>
      </div>
    </div>
  );
}

function HistoryRow({
  workout,
  expanded,
  onToggle,
  onRepeat,
}: {
  workout: ClientWorkoutSummary;
  expanded: boolean;
  onToggle: () => void;
  onRepeat: () => Promise<void>;
}) {
  const monthDay = formatDate(workout.completedAt ?? workout.createdAt);
  const [month, day] = monthDay.split(' ');
  const { data: detail } = useClientWorkout(expanded ? workout.id : undefined);
  return (
    <li className="rounded-2xl bg-[var(--color-card)]">
      <div className="flex items-center gap-3 p-3">
        <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-[var(--color-chip)] text-center leading-tight">
          <span className="text-[10px] font-medium uppercase text-[var(--color-ink-muted)]">{month}</span>
          <span className="text-sm font-bold tabular-nums">{day}</span>
        </div>
        <button onClick={onToggle} className="min-w-0 flex-1 text-left">
          <div className="truncate text-[14px] font-semibold">{workout.name}</div>
          {workout.status === 'skipped' ? (
            <div className="text-[11px] text-[var(--color-danger)]">пропущена</div>
          ) : (
            <div className="text-[11px] text-[var(--color-ink-muted)]">
              {workout.durationSec ? formatDuration(workout.durationSec) : ''}{workout.rpe ? ` · RPE ${workout.rpe}` : ''}
            </div>
          )}
        </button>
        <button onClick={onToggle} className="flex h-7 w-7 items-center justify-center text-[var(--color-ink-muted)]" aria-label="Развернуть">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <button onClick={onRepeat} className="flex h-7 w-7 items-center justify-center text-[var(--color-ink-muted)]" aria-label="Повторить">
          <RotateCcw size={14} />
        </button>
      </div>
      {expanded && (
        <div className="space-y-1.5 border-t border-[var(--color-line)] px-4 py-3">
          {!detail && <div className="text-[12px] text-[var(--color-ink-muted)]">Загрузка…</div>}
          {detail && detail.exercises.length === 0 && (
            <div className="text-[12px] text-[var(--color-ink-muted)]">Упражнений нет</div>
          )}
          {detail?.exercises.map((ex) => (
            <div key={ex.position} className="flex items-baseline justify-between gap-2 text-[12px]">
              <span className="truncate font-medium">{ex.exerciseName}</span>
              <span className="shrink-0 tabular-nums text-[var(--color-ink-muted)]">{factSummary(ex.sets[0])}</span>
            </div>
          ))}
          {workout.trainerNote && (
            <div className="pt-1 text-[12px] italic text-[var(--color-ink-muted)]">«{workout.trainerNote}»</div>
          )}
        </div>
      )}
    </li>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] ${active ? 'bg-ink' : 'bg-[var(--color-chip)]'}`}
      style={{ color: active ? '#ffffff' : '#1a1a1a' }}
    >
      {children}
    </button>
  );
}

function TemplatePicker({ open, onClose, onAssign, onPicked }: { open: boolean; onClose: () => void; onAssign: (body: { sourceTemplateId?: string; cloneFromWorkoutId?: string }) => Promise<void>; onPicked: () => void }) {
  const { data: templates } = useWorkoutTemplates();
  const [category, setCategory] = useState<string | null>(null);
  const filtered = (templates ?? []).filter((t) => !category || t.muscleGroup === category);
  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="px-4 pt-2 pb-4 max-h-[70vh] overflow-y-auto">
        <h3 className="text-base font-semibold">Выбрать из базы</h3>
        <div className="mt-2 -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
          <FilterChip active={category === null} onClick={() => setCategory(null)}>Все</FilterChip>
          {EXERCISE_CATEGORIES.map((c) => (
            <FilterChip key={c} active={category === c} onClick={() => setCategory(c)}>{c}</FilterChip>
          ))}
        </div>
        <ul className="mt-2 space-y-2">
          {filtered.map((t) => (
            <li key={t.id}>
              <button
                onClick={async () => {
                  await onAssign({ sourceTemplateId: t.id });
                  onPicked();
                }}
                className="flex w-full items-center gap-3 rounded-2xl bg-[var(--color-card)] px-3 py-3 text-left"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-chip)] text-sm font-bold tabular-nums">{t.exercises.length}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold">{t.name}</div>
                  {t.shortDescription && <div className="text-[11px] text-[var(--color-ink-muted)] line-clamp-2">{t.shortDescription}</div>}
                </div>
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="py-6 text-center text-sm text-[var(--color-ink-muted)]">Ничего не найдено</li>
          )}
        </ul>
      </div>
    </BottomSheet>
  );
}

function HistoryPicker({ open, history, onClose, onAssign, onPicked }: { open: boolean; history: ClientWorkoutSummary[]; onClose: () => void; onAssign: (body: { sourceTemplateId?: string; cloneFromWorkoutId?: string }) => Promise<void>; onPicked: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="px-4 pt-2 pb-4 max-h-[70vh] overflow-y-auto">
        <h3 className="text-base font-semibold">Повторить из истории</h3>
        <ul className="mt-3 space-y-2">
          {history.map((w) => (
            <li key={w.id}>
              <button
                onClick={async () => { await onAssign({ cloneFromWorkoutId: w.id }); onPicked(); }}
                className="flex w-full items-center gap-3 rounded-2xl bg-[var(--color-card)] px-3 py-3 text-left"
              >
                <div className="text-[11px] text-[var(--color-ink-muted)] w-12">{formatDate(w.completedAt ?? w.createdAt)}</div>
                <div className="min-w-0 flex-1 text-[14px] font-semibold">{w.name}</div>
              </button>
            </li>
          ))}
          {history.length === 0 && <li className="py-6 text-center text-sm text-[var(--color-ink-muted)]">История пуста</li>}
        </ul>
      </div>
    </BottomSheet>
  );
}