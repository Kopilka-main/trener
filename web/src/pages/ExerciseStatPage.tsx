import { useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ScreenHeader } from '../components/ScreenHeader';
import { useClient } from '../api/clients';
import { useClientExerciseHistory, type ExerciseHistoryPoint } from '../api/client-stats';
import { fullName } from '../lib/initials';

/**
 * Экран статистики по конкретному упражнению клиента: два графика
 * (тоннаж и max-вес) и таблица последних сессий.
 */
export function ExerciseStatPage() {
  const { id = '', exId = '' } = useParams<{ id: string; exId: string }>();
  const { data: client } = useClient(id);
  const { data, isLoading } = useClientExerciseHistory(id, exId);
  const [recordsOnly, setRecordsOnly] = useState(true);

  if (!client) return null;

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title={`${data?.exercise.name ?? 'Упражнение'} · ${fullName(client.firstName, client.lastName)}`}
        back
      />
      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-3 space-y-5">
        {isLoading && <Empty>Загрузка…</Empty>}
        {!isLoading && (!data || data.points.length === 0) && (
          <Empty>Клиент ещё не делал это упражнение в проведённых тренировках.</Empty>
        )}
        {data && data.points.length > 0 && (
          <>
            <label className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl bg-[var(--color-card)] px-4 py-3">
              <span className="text-[14px] font-semibold">Только рекорды</span>
              <Toggle checked={recordsOnly} onChange={setRecordsOnly} />
            </label>
            {data.isTimeBased ? (
              <>
                <ChartCard
                  title="Максимальное время"
                  suffix="с"
                  color="var(--color-accent)"
                  points={data.points.map((p) => ({ date: p.date, value: p.maxTimeSec ?? 0 }))}
                  recordsOnly={recordsOnly}
                  formatValue={formatSeconds}
                />
                <ChartCard
                  title="Суммарное время"
                  suffix="с"
                  color="var(--color-coral)"
                  points={data.points.map((p) => ({ date: p.date, value: p.totalTimeSec }))}
                  recordsOnly={recordsOnly}
                  formatValue={formatSeconds}
                />
              </>
            ) : (
              <>
                <ChartCard
                  title="Тоннаж"
                  suffix="кг"
                  color="var(--color-accent)"
                  points={data.points.map((p) => ({ date: p.date, value: p.tonnage }))}
                  recordsOnly={recordsOnly}
                />
                <ChartCard
                  title="Максимальный вес"
                  suffix="кг"
                  color="var(--color-coral)"
                  points={data.points.map((p) => ({ date: p.date, value: p.maxWeightKg ?? 0 }))}
                  recordsOnly={recordsOnly}
                />
              </>
            )}
            <HistoryTable points={data.points} isTimeBased={data.isTimeBased} />
          </>
        )}
      </div>
    </div>
  );
}

// Простой SVG-line-график без сторонних библиотек.
function ChartCard({
  title,
  suffix,
  color,
  points,
  recordsOnly,
  formatValue,
}: {
  title: string;
  suffix: string;
  color: string;
  points: Array<{ date: string | null; value: number }>;
  recordsOnly: boolean;
  formatValue?: (v: number) => string;
}) {
  const data = useMemo(() => {
    const cleaned = points.filter((p) => p.date && p.value > 0);
    if (!recordsOnly) return cleaned;
    // Оставляем только точки, на которых поставлен новый рекорд (значение >
    // всех предыдущих). Первая точка — всегда рекорд.
    let maxSoFar = -Infinity;
    return cleaned.filter((p) => {
      if (p.value > maxSoFar) {
        maxSoFar = p.value;
        return true;
      }
      return false;
    });
  }, [points, recordsOnly]);
  if (data.length === 0) {
    return (
      <div className="rounded-2xl bg-[var(--color-card)] p-4">
        <div className="text-[13px] font-semibold">{title}</div>
        <div className="mt-2 text-[12px] text-[var(--color-ink-muted)]">Нет данных</div>
      </div>
    );
  }
  const W = 320;
  const H = 140;
  const PAD_X = 8;
  const PAD_Y = 12;
  const max = Math.max(...data.map((p) => p.value));
  const min = Math.min(...data.map((p) => p.value));
  const range = max - min;
  const stepX = data.length > 1 ? (W - PAD_X * 2) / (data.length - 1) : 0;
  const pts = data.map((p, i) => {
    const x = PAD_X + i * stepX;
    // Если все значения равны — рисуем линию посередине области графика,
    // чтобы она не упиралась в нижний край.
    const y = range > 0
      ? H - PAD_Y - ((p.value - min) / range) * (H - PAD_Y * 2)
      : H / 2;
    return { x, y, value: p.value, date: p.date! };
  });
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${path} L${pts[pts.length - 1].x},${H - PAD_Y} L${pts[0].x},${H - PAD_Y} Z`;
  const last = data[data.length - 1];
  const first = data[0];
  const delta = last.value - first.value;
  const deltaPct = first.value > 0 ? Math.round((delta / first.value) * 100) : 0;

  // Интерактивный курсор: при движении мыши/пальца цепляемся к ближайшей точке.
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const handleMove = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const viewX = ((clientX - rect.left) / rect.width) * W;
    let bestI = 0;
    let bestD = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const d = Math.abs(pts[i].x - viewX);
      if (d < bestD) {
        bestD = d;
        bestI = i;
      }
    }
    setActiveIdx(bestI);
  };
  const active = activeIdx !== null ? pts[activeIdx] : null;

  return (
    <div className="rounded-2xl bg-[var(--color-card)] p-4">
      <div className="flex items-baseline justify-between">
        <div className="text-[13px] font-semibold">{title}</div>
        <div className="flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-display)] text-[22px] leading-none tabular-nums">
            {formatValue ? formatValue(active ? active.value : last.value) : (active ? active.value : last.value)}
          </span>
          {!formatValue && <span className="text-[11px] text-[var(--color-ink-muted)]">{suffix}</span>}
        </div>
      </div>
      <div className="mt-1 font-[family-name:var(--font-mono)] text-[11px]" style={{ color: delta >= 0 ? 'var(--color-accent)' : 'var(--color-danger)' }}>
        {delta >= 0 ? '+' : ''}{formatValue ? formatValue(Math.abs(delta)) : `${delta} ${suffix}`} ({deltaPct >= 0 ? '+' : ''}{deltaPct}%) с первой сессии
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="mt-3 w-full touch-none"
        style={{ height: 140 }}
        onPointerDown={(e) => {
          (e.target as Element).setPointerCapture?.(e.pointerId);
          handleMove(e.clientX);
        }}
        onPointerMove={(e) => {
          if (e.buttons !== 0 || e.pointerType !== 'mouse') handleMove(e.clientX);
          else handleMove(e.clientX);
        }}
        onPointerLeave={() => setActiveIdx(null)}
        onPointerUp={(e) => {
          if (e.pointerType !== 'mouse') setActiveIdx(null);
        }}
      >
        <path d={areaPath} fill={color} opacity={0.12} />
        <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill={color} />
        ))}
        {active && (
          <>
            <line
              x1={active.x}
              x2={active.x}
              y1={0}
              y2={H}
              stroke="var(--color-line-strong)"
              strokeWidth={1}
              strokeDasharray="2 3"
            />
            <circle cx={active.x} cy={active.y} r={6} fill={color} stroke="var(--color-bg)" strokeWidth={2} />
          </>
        )}
      </svg>
      <div className="mt-2 min-h-[18px] text-center font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-ink-muted)]">
        {active ? `${formatRuDate(active.date)} · ${active.value} ${suffix}` : 'Тяни по графику'}
      </div>
    </div>
  );
}

function HistoryTable({ points, isTimeBased }: { points: ExerciseHistoryPoint[]; isTimeBased: boolean }) {
  const sorted = [...points].reverse(); // новые сверху
  return (
    <div className="space-y-1.5">
      <h3 className="px-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
        История
      </h3>
      <div className="overflow-hidden rounded-2xl bg-[var(--color-card)] divide-y divide-[var(--color-line)]">
        {sorted.map((p) => (
          <div key={p.workoutId} className="flex items-baseline justify-between gap-3 px-4 py-3 text-[13px]">
            <div className="text-[var(--color-ink-muted)]">{p.date ? formatRuDate(p.date) : '—'}</div>
            <div className="flex items-baseline gap-3 text-[12px] tabular-nums">
              <span>{p.totalSets} ×</span>
              {isTimeBased ? (
                <>
                  {p.maxTimeSec !== null && <span>PR <b className="text-[var(--color-ink)]">{formatSeconds(p.maxTimeSec)}</b></span>}
                  <span>{formatSeconds(p.totalTimeSec)} <span className="text-[var(--color-ink-mutedXL)]">всего</span></span>
                </>
              ) : (
                <>
                  {p.maxWeightKg !== null && <span><b className="text-[var(--color-ink)]">{p.maxWeightKg}</b> кг</span>}
                  <span>{p.tonnage} <span className="text-[var(--color-ink-mutedXL)]">кг</span></span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatRuDate(iso: string) {
  const d = new Date(iso);
  const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatSeconds(sec: number): string {
  if (sec >= 3600) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h}ч ${m.toString().padStart(2, '0')}м`;
  }
  if (sec >= 60) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
  return `${sec}с`;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative inline-flex shrink-0 cursor-pointer rounded-full transition-colors"
      style={{
        width: 44,
        height: 24,
        background: checked ? 'var(--color-accent)' : 'var(--color-chip)',
        // «Вдавленный» track: тёмная inset-тень сверху + тонкий highlight снизу.
        boxShadow:
          'inset 0 1.5px 3px rgba(0,0,0,0.45), inset 0 -1px 0 rgba(255,255,255,0.06)',
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute rounded-full transition-transform"
        style={{
          top: 2,
          left: 2,
          width: 20,
          height: 20,
          background: 'linear-gradient(180deg, #ffffff 0%, #e6e6e6 100%)',
          // «Выпуклый» thumb: drop-тень + тонкий тёмный край снизу + highlight сверху изнутри.
          boxShadow:
            '0 2px 4px rgba(0,0,0,0.45), 0 1px 2px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 1px rgba(0,0,0,0.15)',
          transform: checked ? 'translateX(20px)' : 'translateX(0)',
        }}
      />
    </button>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-[var(--color-card)] p-6 text-center text-[13px] text-[var(--color-ink-muted)]">
      {children}
    </div>
  );
}
