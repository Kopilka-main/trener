import { useState } from 'react';
import { BottomSheet } from './BottomSheet';
import { Chips } from './Chips';
import { useExercises } from '../api/exercises';
import { EXERCISE_CATEGORIES } from '../lib/catalog';

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (exerciseId: string) => void;
};

// Шторка выбора упражнения для добавления в тренировку.
export function AddExerciseSheet({ open, onClose, onPick }: Props) {
  const [category, setCategory] = useState<string | null>(null);
  const { data: exercises = [] } = useExercises('', category ?? undefined);

  return (
    <BottomSheet open={open} onClose={onClose}>
      {/* Фиксированная высота 3/4 экрана: шапка статична, список прокручивается. */}
      <div className="flex h-[75vh] flex-col px-4 pt-2 pb-4">
        <h3 className="shrink-0 text-base font-semibold">Добавить упражнение</h3>
        <div className="mt-3 shrink-0">
          <Chips
            multi={false}
            options={EXERCISE_CATEGORIES}
            selected={category ? [category as typeof EXERCISE_CATEGORIES[number]] : []}
            onToggle={(v) => setCategory(v === category ? null : v)}
          />
        </div>
        <ul className="mt-3 flex-1 space-y-2 overflow-y-auto">
          {exercises.map((ex) => (
            <li key={ex.id}>
              <button
                onClick={() => onPick(ex.id)}
                className="flex w-full items-center gap-3 rounded-2xl bg-[var(--color-card)] px-3 py-2.5 text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{ex.name}</div>
                  <div className="text-xs text-[var(--color-ink-muted)]">
                    {ex.category}{ex.targetMuscles.length > 0 ? ` · ${ex.targetMuscles.join(', ')}` : ''}
                  </div>
                </div>
              </button>
            </li>
          ))}
          {exercises.length === 0 && (
            <li className="py-6 text-center text-sm text-[var(--color-ink-muted)]">Нет упражнений</li>
          )}
        </ul>
      </div>
    </BottomSheet>
  );
}
