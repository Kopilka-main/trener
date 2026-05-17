import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, Trash2 } from 'lucide-react';
import { ScreenHeader } from '../components/ScreenHeader';
import { Field, TextArea, TextInput } from '../components/Field';
import { Chips } from '../components/Chips';
import { Stepper } from '../components/Stepper';
import { BottomSheet } from '../components/BottomSheet';
import { useDeleteExercise, useExercise, useExercises, useSaveExercise } from '../api/exercises';
import { useConfirm } from '../components/ConfirmProvider';
import { EXERCISE_CATEGORIES, musclesForCategory } from '../lib/catalog';
import type { Exercise, ExerciseInput } from '../api/types';

const empty: ExerciseInput = {
  name: '',
  shortDescription: null,
  description: null,
  category: 'Грудь',
  targetMuscles: [],
  defaultReps: 10,
  defaultWeightKg: null,
  defaultTimeSec: null,
  note: null,
};

type Props = { mode: 'create' | 'edit' };

export function ExerciseEditorPage({ mode }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const editing = mode === 'edit';
  const { data: existing } = useExercise(editing ? id : undefined);
  const saveMut = useSaveExercise(editing ? id : undefined);
  const deleteMut = useDeleteExercise();
  const confirm = useConfirm();

  const [form, setForm] = useState<ExerciseInput>(empty);
  const [pickerOpen, setPickerOpen] = useState(false);
  const { data: categoryExercises = [] } = useExercises('', form.category);

  useEffect(() => {
    if (editing && existing) {
      const { id: _id, ...rest } = existing;
      setForm(rest);
    }
  }, [editing, existing]);

  const setField = <K extends keyof ExerciseInput>(k: K, v: ExerciseInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  // При смене категории оставляем только мышцы, релевантные новой категории.
  const onCategoryChange = (category: string) => {
    const allowed = musclesForCategory(category);
    setForm((f) => ({ ...f, category, targetMuscles: f.targetMuscles.filter((m) => allowed.includes(m)) }));
  };

  // Готовые упражнения выбранной категории — можно подставить их название и описания.
  const readyExercises = categoryExercises.filter((e) => e.id !== id);
  const prefillFrom = (ex: Exercise) => {
    setForm((f) => ({ ...f, name: ex.name, shortDescription: ex.shortDescription, description: ex.description }));
    setPickerOpen(false);
  };

  const submit = async () => {
    if (!form.name.trim()) {
      alert('Название обязательно');
      return;
    }
    await saveMut.mutateAsync(form);
    navigate(-1);
  };

  const remove = async () => {
    if (!id) return;
    if (!(await confirm('Удалить упражнение?', { confirmLabel: 'Удалить', danger: true }))) return;
    await deleteMut.mutateAsync(id);
    navigate(-1);
  };

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title={editing ? 'Упражнение' : 'Новое упражнение'}
        back
        closeIcon
        right={<button onClick={submit} className="text-[14px] font-semibold">Сохранить</button>}
      />
      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-5">
        <Field label="Категория">
          <Chips
            multi={false}
            options={EXERCISE_CATEGORIES}
            selected={[form.category as typeof EXERCISE_CATEGORIES[number]]}
            onToggle={(v) => onCategoryChange(v)}
          />
        </Field>

        <Field label="Целевые мышцы">
          <Chips
            options={musclesForCategory(form.category)}
            selected={form.targetMuscles}
            onToggle={(v) => {
              const has = form.targetMuscles.includes(v);
              setField('targetMuscles', has ? form.targetMuscles.filter((m) => m !== v) : [...form.targetMuscles, v]);
            }}
          />
        </Field>

        {readyExercises.length > 0 && (
          <button
            onClick={() => setPickerOpen(true)}
            className="flex w-full items-center justify-between rounded-2xl bg-[var(--color-card)] px-4 py-3"
          >
            <span className="text-[14px] font-medium">Готовые упражнения</span>
            <span className="flex items-center gap-1.5 text-[13px] text-[var(--color-ink-muted)]">
              {readyExercises.length}
              <ChevronRight size={15} />
            </span>
          </button>
        )}

        <Field label="Название">
          <TextInput placeholder="Жим ногами под углом 45°" value={form.name} onChange={(e) => setField('name', e.target.value)} />
        </Field>

        <Field label="Краткое описание">
          <TextArea rows={2} value={form.shortDescription ?? ''} onChange={(e) => setField('shortDescription', e.target.value || null)} placeholder="Базовое упражнение для…" />
        </Field>
        <Field label="Описание">
          <TextArea rows={5} value={form.description ?? ''} onChange={(e) => setField('description', e.target.value || null)} placeholder="↩ добавить технику…" />
        </Field>

        <section>
          <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">Параметры подхода</div>
          <div className="space-y-2">
            <Stepper value={form.defaultReps} onChange={(v) => setField('defaultReps', v)} unit="повт" unitLabel="повторы" />
            <Stepper value={form.defaultWeightKg ?? 0} step={2.5} onChange={(v) => setField('defaultWeightKg', v)} unit="кг" unitLabel="вес" />
            <Stepper value={form.defaultTimeSec ?? 0} step={5} onChange={(v) => setField('defaultTimeSec', v)} unit="сек" unitLabel="время" />
          </div>
        </section>

        <Field label="Заметка">
          <TextArea rows={3} value={form.note ?? ''} onChange={(e) => setField('note', e.target.value || null)} placeholder="↩ добавить заметку…" />
        </Field>

        {editing && (
          <button
            onClick={remove}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-card)] py-3.5 text-[14px] font-medium text-[var(--color-danger)]"
          >
            <Trash2 size={16} /> Удалить упражнение
          </button>
        )}
      </div>

      <BottomSheet open={pickerOpen} onClose={() => setPickerOpen(false)}>
        <div className="px-4 pt-2 pb-4 max-h-[70vh] overflow-y-auto">
          <h3 className="text-base font-semibold">Готовые упражнения · {form.category}</h3>
          <div className="text-[12px] text-[var(--color-ink-muted)]">Выберите — название и описания подставятся в форму.</div>
          <ul className="mt-3 space-y-2">
            {readyExercises.map((ex) => (
              <li key={ex.id}>
                <button
                  onClick={() => prefillFrom(ex)}
                  className="flex w-full flex-col gap-0.5 rounded-2xl bg-[var(--color-card)] px-3 py-2.5 text-left"
                >
                  <div className="text-sm font-semibold">{ex.name}</div>
                  {ex.shortDescription && (
                    <div className="line-clamp-2 text-xs text-[var(--color-ink-muted)]">{ex.shortDescription}</div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </BottomSheet>
    </div>
  );
}
