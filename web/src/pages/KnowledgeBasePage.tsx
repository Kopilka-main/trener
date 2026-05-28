import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ChevronRight } from 'lucide-react';
import { useExercises } from '../api/exercises';
import { useWorkoutTemplates } from '../api/workout-templates';
import { CATEGORY_GROUPS, EQUIPMENT } from '../lib/catalog';
import { appBase } from '../lib/routes';

type Tab = 'workouts' | 'exercises' | 'flex';

export function KnowledgeBasePage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('workouts');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<string | null>(null);
  // На табе exercises видны силовые категории; на flex — растяжка/кардио/йога; на workouts — нет фильтра по категории.
  const activeCats = tab === 'flex' ? CATEGORY_GROUPS.flexCardio : CATEGORY_GROUPS.power;
  const apiCategory = category && activeCats.includes(category as never) ? category : undefined;
  // На табе flex — если не выбрана конкретная категория, берём все три (Кардио, Растяжка, Йога).
  // Поскольку API возвращает за раз одну — фильтруем на клиенте через category-list.
  const exercises = useExercises(query, apiCategory, equipment ?? undefined);
  const templates = useWorkoutTemplates(query);
  const filteredTemplates = (templates.data ?? []).filter((t) => !category || t.muscleGroup === category);

  const flexExercises = (exercises.data ?? []).filter((e) =>
    (CATEGORY_GROUPS.flexCardio as readonly string[]).includes(e.category)
  );
  const powerExercises = (exercises.data ?? []).filter((e) =>
    !(CATEGORY_GROUPS.flexCardio as readonly string[]).includes(e.category)
  );

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
        <div className="mt-3 grid grid-cols-3 rounded-2xl bg-[var(--color-chip)] p-1">
          <SegmentTab active={tab === 'workouts'} onClick={() => { setTab('workouts'); setCategory(null); setEquipment(null); }} count={filteredTemplates.length}>
            Тренировки
          </SegmentTab>
          <SegmentTab active={tab === 'exercises'} onClick={() => { setTab('exercises'); setCategory(null); setEquipment(null); }} count={powerExercises.length}>
            Упражнения
          </SegmentTab>
          <SegmentTab active={tab === 'flex'} onClick={() => { setTab('flex'); setCategory(null); setEquipment(null); }} count={flexExercises.length}>
            Растяжка
          </SegmentTab>
        </div>

        {/* Фильтр по группам мышц / категории */}
        <div className="mt-3 -mx-5 flex gap-1.5 overflow-x-auto px-5 pb-2">
          <FilterChip active={category === null} onClick={() => setCategory(null)}>Все</FilterChip>
          {activeCats.map((c) => (
            <FilterChip key={c} active={category === c} onClick={() => setCategory(c)}>{c}</FilterChip>
          ))}
        </div>

        {/* Фильтр по тренажёру — только для табов exercises/flex */}
        {(tab === 'exercises' || tab === 'flex') && (
          <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-2">
            <FilterChip active={equipment === null} onClick={() => setEquipment(null)}>
              <span className="opacity-60">Снаряд:</span> все
            </FilterChip>
            {EQUIPMENT.map((eq) => (
              <FilterChip key={eq} active={equipment === eq} onClick={() => setEquipment(eq)}>
                {eq}
              </FilterChip>
            ))}
          </div>
        )}
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
        {(tab === 'exercises' || tab === 'flex') && (
          <ul className="space-y-2">
            {(tab === 'flex' ? flexExercises : powerExercises).map((ex) => (
              <li key={ex.id}>
                <button
                  onClick={() => navigate(`${appBase()}/exercises/${ex.id}/edit`)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-[var(--color-card)] px-4 py-3 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-semibold leading-tight">{ex.name}</div>
                    <div className="mt-0.5 text-[12px] text-[var(--color-ink-muted)]">
                      {ex.category}
                      {ex.equipment ? ` · ${ex.equipment}` : ''}
                      {ex.targetMuscles.length > 0 ? ` · ${ex.targetMuscles.join(', ')}` : ''}
                    </div>
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-[var(--color-ink-muted)]" />
                </button>
              </li>
            ))}
            {(tab === 'flex' ? flexExercises : powerExercises).length === 0 && (
              <Empty text={query || category || equipment ? 'Ничего не найдено' : 'Упражнений пока нет'} />
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

function CreateTile({ title, sub, onClick }: { title: string; sub: string; dark?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative flex h-[112px] flex-col items-start justify-end rounded-2xl border border-[var(--color-line)] bg-[var(--color-card)] p-3 text-left"
    >
      <span className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-chip)]">
        <Plus size={16} />
      </span>
      <span className="text-[14px] font-semibold leading-tight text-[var(--color-ink)]">{title}</span>
      <span className="mt-0.5 text-[11px] text-[var(--color-ink-muted)]">{sub}</span>
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
      className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] transition-colors ${active ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-chip)]'}`}
      style={{ color: active ? 'var(--color-accent-on)' : 'var(--color-ink)' }}
    >
      {children}
    </button>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="px-4 py-10 text-center text-sm text-[var(--color-ink-muted)]">{text}</div>;
}
