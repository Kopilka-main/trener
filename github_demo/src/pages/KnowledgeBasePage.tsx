import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ChevronRight } from 'lucide-react';
import { useExercises } from '../api/exercises';
import { useWorkoutTemplates } from '../api/workout-templates';
import { EXERCISE_CATEGORIES } from '../lib/catalog';
import { appBase } from '../lib/routes';

type Tab = 'workouts' | 'exercises';

export function KnowledgeBasePage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('workouts');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const exercises = useExercises(query, category ?? undefined);
  const templates = useWorkoutTemplates(query);
  const filteredTemplates = (templates.data ?? []).filter((t) => !category || t.muscleGroup === category);

  return (
    <div className="flex h-full flex-col">
      <header className="px-5 pt-3">
        <h1 className="text-[34px] font-bold leading-tight">База знаний</h1>
        <div className="mt-3 relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск тренировок, упражнений, статей"
            className="w-full rounded-2xl bg-[var(--color-chip)] py-3 pl-10 pr-4 text-sm placeholder:text-[var(--color-ink-muted)] focus:outline-none"
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <CreateTile
            dark
            title="Создать тренировку"
            sub="набор упражнений"
            onClick={() => navigate(`${appBase()}/templates/new`)}
          />
          <CreateTile
            title="Создать упражнение"
            sub="карточка с настройками"
            onClick={() => navigate(`${appBase()}/exercises/new`)}
          />
        </div>
        <div className="mt-3 grid grid-cols-2 rounded-2xl bg-[var(--color-chip)] p-1">
          <SegmentTab active={tab === 'workouts'} onClick={() => setTab('workouts')} count={filteredTemplates.length}>
            Тренировки
          </SegmentTab>
          <SegmentTab active={tab === 'exercises'} onClick={() => setTab('exercises')} count={exercises.data?.length ?? 0}>
            Упражнения
          </SegmentTab>
        </div>
        <div className="mt-3 -mx-5 flex gap-1.5 overflow-x-auto px-5 pb-2">
          <FilterChip active={category === null} onClick={() => setCategory(null)}>Все</FilterChip>
          {EXERCISE_CATEGORIES.map((c) => (
            <FilterChip key={c} active={category === c} onClick={() => setCategory(c)}>{c}</FilterChip>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-3">
        {tab === 'workouts' && (
          <ul className="space-y-2">
            {filteredTemplates.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => navigate(`${appBase()}/templates/${t.id}/edit`)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-[var(--color-card)] px-3 py-3 text-left"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-chip)] text-sm font-bold tabular-nums">{t.exercises.length}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-semibold leading-tight">{t.name}</div>
                    {t.shortDescription && <div className="mt-0.5 line-clamp-2 text-[12px] text-[var(--color-ink-muted)]">{t.shortDescription}</div>}
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-[var(--color-ink-muted)]" />
                </button>
              </li>
            ))}
            {filteredTemplates.length === 0 && <Empty text={query || category ? 'Ничего не найдено' : 'Тренировок пока нет'} />}
          </ul>
        )}
        {tab === 'exercises' && (
          <ul className="space-y-2">
            {(exercises.data ?? []).map((ex) => (
              <li key={ex.id}>
                <button
                  onClick={() => navigate(`${appBase()}/exercises/${ex.id}/edit`)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-[var(--color-card)] px-4 py-3 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-semibold leading-tight">{ex.name}</div>
                    <div className="mt-0.5 text-[12px] text-[var(--color-ink-muted)]">{ex.category}{ex.targetMuscles.length > 0 ? ` · ${ex.targetMuscles.join(', ')}` : ''}</div>
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-[var(--color-ink-muted)]" />
                </button>
              </li>
            ))}
            {exercises.data?.length === 0 && <Empty text={query || category ? 'Ничего не найдено' : 'Упражнений пока нет'} />}
          </ul>
        )}
      </div>
    </div>
  );
}

function CreateTile({ title, sub, dark, onClick }: { title: string; sub: string; dark?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex h-[112px] flex-col items-start justify-end rounded-2xl p-3 text-left ${dark ? 'bg-ink' : 'bg-[var(--color-card)]'}`}
      style={{ color: dark ? '#ffffff' : '#1a1a1a' }}
    >
      <span className={`absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full ${dark ? 'bg-white/10' : 'bg-[var(--color-chip)]'}`}>
        <Plus size={16} />
      </span>
      <span className="text-[14px] font-semibold leading-tight" style={{ color: dark ? '#ffffff' : '#1a1a1a' }}>{title}</span>
      <span className="mt-0.5 text-[11px]" style={{ color: dark ? 'rgba(255,255,255,0.6)' : 'var(--color-ink-muted)' }}>{sub}</span>
    </button>
  );
}

function SegmentTab({ active, onClick, count, children }: { active: boolean; onClick: () => void; count: number; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm transition-colors ${active ? 'bg-[var(--color-card)] font-semibold text-ink' : 'text-[var(--color-ink-muted)]'}`}
    >
      <span>{children}</span>
      <span className={`tabular-nums text-[12px] ${active ? 'text-[var(--color-ink-muted)]' : ''}`}>{count}</span>
    </button>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] transition-colors ${active ? 'bg-ink' : 'bg-[var(--color-chip)]'}`}
      style={{ color: active ? '#ffffff' : '#1a1a1a' }}
    >
      {children}
    </button>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="px-4 py-10 text-center text-sm text-[var(--color-ink-muted)]">{text}</div>;
}
