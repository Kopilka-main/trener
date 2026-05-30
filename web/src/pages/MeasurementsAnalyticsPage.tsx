import { useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ScreenHeader } from '../components/ScreenHeader';
import { useClient } from '../api/clients';
import { useClientMeasurements, type Measurement } from '../api/measurements';
import { fullName } from '../lib/initials';

/**
 * Аналитика замеров клиента: два графика. Первый — динамика веса
 * (с переключателем «вес/мышцы/жир/вода»), второй — динамика объёмов
 * (переключатель по конкретному обхвату).
 */
export function MeasurementsAnalyticsPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { data: client } = useClient(id);
  const { data: items = [], isLoading } = useClientMeasurements(id);

  // Замеры в API отдаются от новых к старым — для графика инвертируем.
  const series = useMemo(() => [...items].reverse(), [items]);

  if (!client) return null;

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title={`Аналитика · ${fullName(client.firstName, client.lastName)}`}
        back
      />
      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-3 space-y-5">
        {isLoading && <Empty>Загрузка…</Empty>}
        {!isLoading && series.length < 2 && (
          <Empty>Чтобы построить графики, нужно минимум 2 замера.</Empty>
        )}
        {series.length >= 2 && (
          <>
            <WeightChart series={series} />
            <VolumeChart series={series} />
          </>
        )}
      </div>
    </div>
  );
}

// ─── График состава тела ────────────────────────────────────────────────────

const WEIGHT_METRICS = [
  { key: 'weightKg', label: 'Вес', suffix: 'кг' },
  { key: 'musclePct', label: 'Мышцы', suffix: '%' },
  { key: 'bodyFatPct', label: 'Жир', suffix: '%' },
  { key: 'waterPct', label: 'Вода', suffix: '%' },
] as const;

function WeightChart({ series }: { series: Measurement[] }) {
  const [metricKey, setMetricKey] = useState<(typeof WEIGHT_METRICS)[number]['key']>('weightKg');
  const metric = WEIGHT_METRICS.find((m) => m.key === metricKey)!;
  const points = series
    .map((m) => ({ date: m.date, value: m[metric.key] as number | null }))
    .filter((p): p is { date: string; value: number } => p.value !== null);
  return (
    <div className="rounded-2xl bg-[var(--color-card)] p-4 space-y-3">
      <div className="text-[13px] font-semibold">Состав тела</div>
      <ChipRow>
        {WEIGHT_METRICS.map((m) => (
          <Chip key={m.key} active={metricKey === m.key} onClick={() => setMetricKey(m.key)}>{m.label}</Chip>
        ))}
      </ChipRow>
      <Chart points={points} suffix={metric.suffix} color="var(--color-accent)" />
    </div>
  );
}

// ─── График объёмов ─────────────────────────────────────────────────────────

const VOLUME_METRICS = [
  { key: 'neckCm', label: 'Шея' },
  { key: 'shouldersCm', label: 'Плечи' },
  { key: 'chestCm', label: 'Грудь' },
  { key: 'waistCm', label: 'Талия' },
  { key: 'hipsCm', label: 'Бёдра' },
  { key: 'biceps', label: 'Бицепс', pair: ['bicepsLCm', 'bicepsRCm'] as const },
  { key: 'thigh', label: 'Бедро', pair: ['thighLCm', 'thighRCm'] as const },
  { key: 'calf', label: 'Икра', pair: ['calfLCm', 'calfRCm'] as const },
] as const;

function VolumeChart({ series }: { series: Measurement[] }) {
  const [metricKey, setMetricKey] = useState<(typeof VOLUME_METRICS)[number]['key']>('waistCm');
  const metric = VOLUME_METRICS.find((m) => m.key === metricKey)!;
  const points = series
    .map((m) => {
      let v: number | null = null;
      if ('pair' in metric && metric.pair) {
        const l = m[metric.pair[0]] as number | null;
        const r = m[metric.pair[1]] as number | null;
        if (l === null && r === null) v = null;
        else if (l === null) v = r;
        else if (r === null) v = l;
        else v = Math.round(((l + r) / 2) * 10) / 10;
      } else {
        v = m[metric.key as keyof Measurement] as number | null;
      }
      return { date: m.date, value: v };
    })
    .filter((p): p is { date: string; value: number } => p.value !== null);
  return (
    <div className="rounded-2xl bg-[var(--color-card)] p-4 space-y-3">
      <div className="text-[13px] font-semibold">Объёмы</div>
      <ChipRow>
        {VOLUME_METRICS.map((m) => (
          <Chip key={m.key} active={metricKey === m.key} onClick={() => setMetricKey(m.key)}>{m.label}</Chip>
        ))}
      </ChipRow>
      <Chart points={points} suffix="см" color="var(--color-coral)" />
    </div>
  );
}

// ─── Общие компоненты ───────────────────────────────────────────────────────

function ChipRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-1.5">{children}</div>;
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-semibold transition"
      style={{
        background: active ? 'var(--color-accent)' : 'var(--color-chip)',
        color: active ? 'var(--color-accent-on)' : 'var(--color-ink-muted)',
      }}
    >
      {children}
    </button>
  );
}

function Chart({ points, suffix, color }: { points: Array<{ date: string; value: number }>; suffix: string; color: string }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  if (points.length < 2) {
    return <div className="py-6 text-center text-[12px] text-[var(--color-ink-muted)]">Недостаточно данных</div>;
  }
  const W = 320;
  const H = 140;
  const PAD_X = 8;
  const PAD_Y = 12;
  const max = Math.max(...points.map((p) => p.value));
  const min = Math.min(...points.map((p) => p.value));
  const range = max - min;
  const stepX = (W - PAD_X * 2) / (points.length - 1);
  const pts = points.map((p, i) => {
    const x = PAD_X + i * stepX;
    const y = range > 0
      ? H - PAD_Y - ((p.value - min) / range) * (H - PAD_Y * 2)
      : H / 2;
    return { x, y, value: p.value, date: p.date };
  });
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${path} L${pts[pts.length - 1].x},${H - PAD_Y} L${pts[0].x},${H - PAD_Y} Z`;
  const last = points[points.length - 1];
  const first = points[0];
  const delta = last.value - first.value;
  const deltaPct = first.value > 0 ? Math.round((delta / first.value) * 100) : 0;
  const positive = delta >= 0;

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
    <div>
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-display)] text-[28px] leading-none tabular-nums">
            {active ? active.value : last.value}
          </span>
          <span className="text-[11px] text-[var(--color-ink-muted)]">{suffix}</span>
        </div>
        <div className="font-[family-name:var(--font-mono)] text-[11px] tabular-nums" style={{ color: positive ? 'var(--color-accent)' : 'var(--color-danger)' }}>
          {delta >= 0 ? '+' : ''}{Math.round(delta * 10) / 10} {suffix} ({deltaPct >= 0 ? '+' : ''}{deltaPct}%)
        </div>
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
        onPointerMove={(e) => handleMove(e.clientX)}
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

function formatRuDate(iso: string) {
  const d = new Date(iso);
  const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-[var(--color-card)] p-6 text-center text-[13px] text-[var(--color-ink-muted)]">
      {children}
    </div>
  );
}
