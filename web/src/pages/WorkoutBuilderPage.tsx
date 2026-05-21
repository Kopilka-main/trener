import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Minus, Plus, Trash2, X } from 'lucide-react';
import { ScreenHeader } from '../components/ScreenHeader';
import { Field, TextArea, TextInput } from '../components/Field';
import { Chips } from '../components/Chips';
import { SortableList } from '../components/SortableList';
import { BottomSheet } from '../components/BottomSheet';
import { useExercises } from '../api/exercises';
import { useDeleteWorkoutTemplate, useSaveWorkoutTemplate, useWorkoutTemplate } from '../api/workout-templates';
import { useConfirm } from '../components/ConfirmProvider';
import { EXERCISE_CATEGORIES, TEMPLATE_TAGS } from '../lib/catalog';
import type { WorkoutTemplateInput } from '../api/types';

let entrySeq = 0;
const nextEntryId = () => `be-${++entrySeq}`;

// Одна запись = одно упражнение в тренировке (плоский список).
type BuilderExercise = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  exerciseCategory: string;
  reps: number | null;
  weightKg: number | null;
  timeSec: number | null;
};

function makeEntry(ex: {
  id: string;
  name: string;
  category: string;
  defaultReps: number | null;
  defaultWeightKg: number | null;
  defaultTimeSec: number | null;
}): BuilderExercise {
  return {
    id: nextEntryId(),
    exerciseId: ex.id,
    exerciseName: ex.name,
    exerciseCategory: ex.category,
    reps: ex.defaultReps,
    weightKg: ex.defaultWeightKg,
    timeSec: ex.defaultTimeSec,
  };
}

type Props = { mode: 'create' | 'edit' };

export function WorkoutBuilderPage({ mode }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const editing = mode === 'edit';
  const { data: existing } = useWorkoutTemplate(editing ? id : undefined);
  const saveMut = useSaveWorkoutTemplate(editing ? id : undefined);
  const deleteMut = useDeleteWorkoutTemplate();
  const confirm = useConfirm();

  const [step, setStep] = useState<1 | 2>(editing ? 2 : 1);
  const [name, setName] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<string | null>(null);
  const [categoryTag, setCategoryTag] = useState<string | null>(null);
  const [items, setItems] = useState<BuilderExercise[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editRow, setEditRow] = useState<string | null>(null);

  useEffect(() => {
    if (editing && existing) {
      setName(existing.name);
      setShortDescription(existing.shortDescription ?? '');
      setDescription(existing.description ?? '');
      setMuscleGroup(existing.muscleGroup);
      setCategoryTag(existing.categoryTag);
      setItems(
        existing.exercises.flatMap((e) =>
          Array.from({ length: Math.max(1, e.sets) }, () => ({
            id: nextEntryId(),
            exerciseId: e.exerciseId,
            exerciseName: e.exerciseName,
            exerciseCategory: e.exerciseCategory,
            reps: e.reps,
            weightKg: e.weightKg,
            timeSec: e.timeSec,
          }))
        )
      );
    }
  }, [editing, existing]);

  const submit = async () => {
    if (!name.trim()) { alert('Название обязательно'); return; }
    if (items.length === 0) { alert('Добавьте хотя бы одно упражнение'); return; }
    const input: WorkoutTemplateInput = {
      name: name.trim(),
      shortDescription: shortDescription.trim() || null,
      description: description.trim() || null,
      muscleGroup,
      categoryTag,
      exercises: items.map((e) => ({
        exerciseId: e.exerciseId,
        sets: 1,
        reps: e.reps,
        weightKg: e.weightKg,
        timeSec: e.timeSec,
      })),
    };
    await saveMut.mutateAsync(input);
    navigate(-1);
  };

  const remove = async () => {
    if (!id) return;
    if (!(await confirm('Удалить тренировку?', { confirmLabel: 'Удалить', danger: true }))) return;
    await deleteMut.mutateAsync(id);
    navigate(-1);
  };

  if (step === 1 && !editing) {
    return (
      <Step1
        muscleGroup={muscleGroup}
        setMuscleGroup={setMuscleGroup}
        items={items}
        setItems={setItems}
        onNext={() => setStep(2)}
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title={editing ? 'Тренировка' : 'Сборка тренировки'}
        back={() => (editing ? navigate(-1) : setStep(1))}
        closeIcon={!editing}
        right={<button onClick={submit} className="text-[14px] font-semibold">{editing ? 'Сохранить' : 'Готово'}</button>}
      />
      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-4">
        <Field label="Название">
          <TextInput placeholder="Верх · Сила" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Краткое описание">
          <TextArea rows={2} value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} placeholder="Силовая на верх — грудь, спина, плечи…" />
        </Field>
        <Field label="Описание">
          <TextArea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="↩ добавить заметку…" />
        </Field>
        <Field label="Тип">
          <Chips
            multi={false}
            options={TEMPLATE_TAGS}
            selected={categoryTag ? [categoryTag] : []}
            onToggle={(v) => setCategoryTag(v === categoryTag ? null : v)}
          />
        </Field>

        <section>
          <div className="mb-2 flex items-center justify-between px-1">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">Упражнения</h3>
            <span className="text-[11px] text-[var(--color-ink-muted)]">удерживать · перетащить</span>
          </div>
          <SortableList
            items={items}
            onReorder={setItems}
            renderItem={(it) => (
              <BuilderRow
                row={it}
                editing={editRow === it.id}
                onToggleEdit={() => setEditRow(editRow === it.id ? null : it.id)}
                onChange={(patch) => setItems((arr) => arr.map((r) => (r.id === it.id ? { ...r, ...patch } : r)))}
                onRemove={() => setItems((arr) => arr.filter((r) => r.id !== it.id))}
              />
            )}
          />
          <button
            onClick={() => setPickerOpen(true)}
            className="mt-3 w-full rounded-2xl border-2 border-dashed border-[var(--color-line)] py-3.5 text-sm font-medium text-[var(--color-ink-muted)]"
          >
            Добавить упражнение
          </button>
        </section>

        {editing && (
          <button
            onClick={remove}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-card)] py-3.5 text-[14px] font-medium text-[var(--color-danger)]"
          >
            <Trash2 size={16} /> Удалить тренировку
          </button>
        )}
      </div>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(picked) => {
          setItems((arr) => [...arr, ...picked.map(makeEntry)]);
          setPickerOpen(false);
        }}
      />
    </div>
  );
}

function BuilderRow({ row, editing, onToggleEdit, onChange, onRemove }: { row: BuilderExercise; editing: boolean; onToggleEdit: () => void; onChange: (patch: Partial<BuilderExercise>) => void; onRemove: () => void }) {
  const planLabel: string[] = [];
  if (row.reps) planLabel.push(`${row.reps} повт`);
  if (row.weightKg) planLabel.push(`${row.weightKg} кг`);
  if (row.timeSec) planLabel.push(`${row.timeSec} с`);
  return (
    <div>
      <button onClick={onToggleEdit} className="flex w-full items-center gap-2 text-left">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold">{row.exerciseName}</div>
          <div className="text-[11px] text-[var(--color-ink-muted)]">{row.exerciseCategory}</div>
        </div>
        <div className="text-right text-[12px] text-[var(--color-ink-muted)]">
          <div className="font-semibold text-ink">{row.reps !== null ? `${row.reps} повт` : '—'}</div>
          {row.weightKg !== null && <div>{row.weightKg} кг</div>}
          {row.timeSec !== null && row.weightKg === null && <div>{row.timeSec} с</div>}
        </div>
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="flex h-7 w-7 items-center justify-center text-[var(--color-ink-muted)]" aria-label="Убрать">
          <X size={14} />
        </button>
      </button>
      {editing && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <NumField label="повт." value={row.reps} onChange={(v) => onChange({ reps: v })} />
          <NumField label="кг" value={row.weightKg} onChange={(v) => onChange({ weightKg: v })} />
        </div>
      )}
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[var(--color-ink-muted)]">{label}</span>
      <input
        inputMode="decimal"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className="rounded-md bg-[var(--color-bg)] px-2 py-1 text-sm focus:outline-none"
      />
    </label>
  );
}

function Step1({
  muscleGroup,
  setMuscleGroup,
  items,
  setItems,
  onNext,
}: {
  muscleGroup: string | null;
  setMuscleGroup: (v: string | null) => void;
  items: BuilderExercise[];
  setItems: React.Dispatch<React.SetStateAction<BuilderExercise[]>>;
  onNext: () => void;
}) {
  const exercises = useExercises('', muscleGroup ?? undefined);
  const pickedIds = useMemo(() => new Set(items.map((i) => i.exerciseId)), [items]);

  const toggle = (exId: string) => {
    if (pickedIds.has(exId)) {
      setItems((arr) => arr.filter((r) => r.exerciseId !== exId));
      return;
    }
    const ex = exercises.data?.find((e) => e.id === exId);
    if (!ex) return;
    setItems((arr) => [...arr, makeEntry(ex)]);
  };

  // Кол-во — сколько раз упражнение попадёт в тренировку (отдельной строкой).
  const updateCount = (exId: string, n: number) => {
    if (n < 1) return;
    setItems((arr) => {
      const mine = arr.filter((i) => i.exerciseId === exId);
      if (n === mine.length) return arr;
      if (n < mine.length) {
        const drop = new Set(mine.slice(n).map((i) => i.id));
        return arr.filter((i) => !drop.has(i.id));
      }
      const ex = exercises.data?.find((e) => e.id === exId);
      if (!ex) return arr;
      const additions = Array.from({ length: n - mine.length }, () => makeEntry(ex));
      const lastIdx = arr.map((i) => i.exerciseId).lastIndexOf(exId);
      return [...arr.slice(0, lastIdx + 1), ...additions, ...arr.slice(lastIdx + 1)];
    });
  };

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title="Сборка тренировки"
        back
        closeIcon
        right={
          <button onClick={onNext} disabled={items.length === 0} className="text-[14px] font-semibold disabled:opacity-40">
            Дальше
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-4">
        <div className="text-[11px] text-[var(--color-ink-muted)] px-1">шаг 1 из 2</div>
        <Field label="Группа мышц">
          <Chips
            multi={false}
            options={EXERCISE_CATEGORIES}
            selected={muscleGroup ? [muscleGroup as typeof EXERCISE_CATEGORIES[number]] : []}
            onToggle={(v) => setMuscleGroup(v === muscleGroup ? null : v)}
          />
        </Field>
        <div>
          <div className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
            Упражнения {muscleGroup ? `«${muscleGroup}»` : ''}
          </div>
          {!muscleGroup && <div className="rounded-2xl bg-[var(--color-card)] py-6 text-center text-sm text-[var(--color-ink-muted)]">Выберите группу мышц</div>}
          {muscleGroup && (
            <ul className="space-y-2">
              {(exercises.data ?? []).map((ex) => {
                const picked = pickedIds.has(ex.id);
                const count = items.filter((i) => i.exerciseId === ex.id).length;
                return (
                  <li key={ex.id}>
                    <div className="flex w-full items-center gap-3 rounded-2xl bg-[var(--color-card)] px-3 py-2.5">
                      <button
                        onClick={() => toggle(ex.id)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${picked ? 'bg-[var(--color-accent)] text-[var(--color-accent-on)]' : 'bg-[var(--color-chip)]'}`}>
                          {picked ? '✓' : ''}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold">{ex.name}</div>
                          <div className="text-xs text-[var(--color-ink-muted)]">{ex.targetMuscles.join(', ')}</div>
                        </div>
                      </button>
                      {picked && (
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            onClick={() => updateCount(ex.id, count - 1)}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-chip)]"
                            aria-label="Меньше"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-4 text-center text-[14px] font-bold tabular-nums">{count}</span>
                          <button
                            onClick={() => updateCount(ex.id, count + 1)}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-chip)]"
                            aria-label="Больше"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
              {muscleGroup && exercises.data?.length === 0 && (
                <li className="rounded-2xl bg-[var(--color-card)] py-6 text-center text-sm text-[var(--color-ink-muted)]">В этой группе ещё нет упражнений</li>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function ExercisePicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (exs: { id: string; name: string; category: string; defaultReps: number | null; defaultWeightKg: number | null; defaultTimeSec: number | null }[]) => void }) {
  const [category, setCategory] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const exercises = useExercises('', category ?? undefined);

  useEffect(() => {
    if (open) { setPicked([]); setCategory(null); }
  }, [open]);

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="px-4 pt-2 pb-4 max-h-[70vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Добавить упражнение</h3>
          <button
            disabled={picked.length === 0}
            onClick={() => {
              const list = (exercises.data ?? []).filter((e) => picked.includes(e.id));
              onPick(list);
            }}
            className="text-sm font-semibold disabled:opacity-40"
          >
            Добавить ({picked.length})
          </button>
        </div>
        <div className="mt-3">
          <Chips
            multi={false}
            options={EXERCISE_CATEGORIES}
            selected={category ? [category as typeof EXERCISE_CATEGORIES[number]] : []}
            onToggle={(v) => setCategory(v === category ? null : v)}
          />
        </div>
        <ul className="mt-3 space-y-2">
          {(exercises.data ?? []).map((ex) => {
            const isPicked = picked.includes(ex.id);
            return (
              <li key={ex.id}>
                <button
                  onClick={() => setPicked((arr) => (isPicked ? arr.filter((i) => i !== ex.id) : [...arr, ex.id]))}
                  className="flex w-full items-center gap-3 rounded-2xl bg-[var(--color-card)] px-3 py-2.5 text-left"
                >
                  <div className={`flex h-5 w-5 items-center justify-center rounded ${isPicked ? 'bg-[var(--color-accent)] text-[var(--color-accent-on)]' : 'bg-[var(--color-chip)]'}`}>
                    {isPicked ? '✓' : ''}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{ex.name}</div>
                    <div className="text-xs text-[var(--color-ink-muted)]">{ex.category}{ex.targetMuscles.length > 0 ? ` · ${ex.targetMuscles.join(', ')}` : ''}</div>
                  </div>
                </button>
              </li>
            );
          })}
          {!category && <li className="py-6 text-center text-sm text-[var(--color-ink-muted)]">Выберите категорию</li>}
          {category && exercises.data?.length === 0 && <li className="py-6 text-center text-sm text-[var(--color-ink-muted)]">Нет упражнений</li>}
        </ul>
      </div>
    </BottomSheet>
  );
}
