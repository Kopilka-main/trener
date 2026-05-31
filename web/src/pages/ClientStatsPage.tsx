import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, ChevronRight, ImagePlus, LineChart as LineChartIcon, Pencil, Plus, Trash2 } from 'lucide-react';
import { ScreenHeader } from '../components/ScreenHeader';
import { useClient } from '../api/clients';
import { fullName } from '../lib/initials';
import { useClientExercisesOverview, type ExerciseOverview } from '../api/client-stats';
import {
  useClientMeasurements,
  useCreateMeasurement,
  useDeleteMeasurement,
  useUpdateMeasurement,
  type Measurement,
  type MeasurementInput,
} from '../api/measurements';
import {
  useClientProgressPhotos,
  useDeleteProgressPhoto,
  useUploadProgressPhoto,
  type ProgressPhoto,
} from '../api/progress-photos';
import { useConfirm } from '../components/ConfirmProvider';

type Tab = 'exercises' | 'measurements' | 'photos';

/**
 * Подэкран статистики клиента. Три таба:
 *  • Упражнения — список упражнений + переход к графикам;
 *  • Замеры — таблица замеров тела с формой ввода;
 *  • Фото — галерея до/после.
 */
export function ClientStatsPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { data: client } = useClient(id);
  const [tab, setTab] = useState<Tab>('exercises');
  if (!client) return null;
  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title={`Статистика · ${fullName(client.firstName, client.lastName)}`} back />
      <div className="flex-shrink-0 px-4 pt-3">
        <div className="flex gap-1 rounded-xl bg-[var(--color-chip)] p-1">
          <TabButton active={tab === 'exercises'} onClick={() => setTab('exercises')}>Упражнения</TabButton>
          <TabButton active={tab === 'measurements'} onClick={() => setTab('measurements')}>Замеры</TabButton>
          <TabButton active={tab === 'photos'} onClick={() => setTab('photos')}>Фото</TabButton>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-3">
        {tab === 'exercises' && <ExercisesTab clientId={id} />}
        {tab === 'measurements' && <MeasurementsTab clientId={id} />}
        {tab === 'photos' && <PhotosTab clientId={id} />}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-lg px-3 py-2 text-[13px] font-semibold transition ${
        active
          ? 'bg-[var(--color-card)] text-[var(--color-ink)]'
          : 'text-[var(--color-ink-muted)]'
      }`}
    >
      {children}
    </button>
  );
}

// ─── Упражнения ─────────────────────────────────────────────────────────────

function ExercisesTab({ clientId }: { clientId: string }) {
  const { data: items = [], isLoading } = useClientExercisesOverview(clientId);
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string>('all');

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => i.category && set.add(i.category));
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((i) => (i.category ?? '') === filter);
  }, [items, filter]);

  if (isLoading) return <Empty>Загрузка…</Empty>;
  if (items.length === 0)
    return <Empty>Пока нет данных — клиент ещё не делал упражнений в проведённых тренировках.</Empty>;

  return (
    <div className="space-y-3">
      {categories.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-1">
          <Chip active={filter === 'all'} onClick={() => setFilter('all')}>Все</Chip>
          {categories.map((c) => (
            <Chip key={c} active={filter === c} onClick={() => setFilter(c)}>{c}</Chip>
          ))}
        </div>
      )}
      <div className="space-y-2">
        {filtered.map((ex) => (
          <ExerciseRow
            key={ex.exerciseId}
            ex={ex}
            onClick={() => navigate(`/trainer/clients/${clientId}/stats/exercises/${ex.exerciseId}`)}
          />
        ))}
        {filtered.length === 0 && <Empty>В этой группе пока пусто.</Empty>}
      </div>
    </div>
  );
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

function ExerciseRow({ ex, onClick }: { ex: ExerciseOverview; onClick: () => void }) {
  const TrendIcon = ex.lastIsRecord ? ArrowUp : ArrowDown;
  const trendColor = ex.lastIsRecord ? 'var(--color-accent)' : 'var(--color-ink-mutedXL)';
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-card)] p-4 text-left active:scale-[0.99] transition-transform"
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-bold">{ex.name}</div>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[11px] text-[var(--color-ink-muted)]">
          {ex.isTimeBased ? (
            <>
              {ex.maxTimeSec !== null && (
                <span>PR <b className="text-[var(--color-ink)]">{formatTime(ex.maxTimeSec)}</b></span>
              )}
              <span>время <b className="text-[var(--color-ink)]">{formatTime(ex.totalTimeSec)}</b></span>
            </>
          ) : (
            <>
              {ex.maxWeightKg !== null && <span>PR <b className="text-[var(--color-ink)]">{ex.maxWeightKg}</b> кг</span>}
              <span>тоннаж <b className="text-[var(--color-ink)]">{formatTonnage(ex.tonnage)}</b></span>
            </>
          )}
          {ex.lastDate && <span>· {formatRelativeDate(ex.lastDate)}</span>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <TrendIcon
          size={18}
          strokeWidth={2.4}
          style={{ color: trendColor }}
          aria-label={ex.lastIsRecord ? 'Рекорд' : 'Без рекорда'}
        />
        <ChevronRight size={18} className="text-[var(--color-ink-mutedXL)]" />
      </div>
    </button>
  );
}

function formatTonnage(t: number) {
  if (t >= 1000) return `${(t / 1000).toFixed(1).replace('.', ',')} т`;
  return `${t} кг`;
}

function formatTime(sec: number) {
  if (sec >= 3600) return `${(sec / 3600).toFixed(1).replace('.', ',')} ч`;
  if (sec >= 60) return `${Math.round(sec / 60)} мин`;
  return `${sec} с`;
}

function formatRelativeDate(iso: string) {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days === 0) return 'сегодня';
  if (days === 1) return 'вчера';
  if (days < 7) return `${days} дн назад`;
  if (days < 30) return `${Math.floor(days / 7)} нед назад`;
  if (days < 365) return `${Math.floor(days / 30)} мес назад`;
  return `${Math.floor(days / 365)} лет назад`;
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-[var(--color-card)] p-6 text-center text-[13px] text-[var(--color-ink-muted)]">
      {children}
    </div>
  );
}

// ─── Замеры ─────────────────────────────────────────────────────────────────

function MeasurementsTab({ clientId }: { clientId: string }) {
  const { data: items = [], isLoading } = useClientMeasurements(clientId);
  const navigate = useNavigate();
  const [editing, setEditing] = useState<Measurement | null>(null);
  const [adding, setAdding] = useState(false);
  return (
    <div className="space-y-3">
      {items.length >= 2 && (
        <button
          onClick={() => navigate(`/trainer/clients/${clientId}/stats/measurements`)}
          className="flex w-full items-center justify-between gap-3 rounded-2xl bg-[var(--color-card)] px-4 py-3 text-left"
        >
          <span className="flex items-center gap-2">
            <LineChartIcon size={18} strokeWidth={1.8} className="text-[var(--color-accent)]" />
            <span className="text-[14px] font-bold">Аналитика</span>
            <span className="text-[12px] text-[var(--color-ink-muted)]">графики веса и объёмов</span>
          </span>
          <ChevronRight size={18} className="text-[var(--color-ink-mutedXL)]" />
        </button>
      )}
      <button
        onClick={() => setAdding(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--color-line-strong)] bg-[var(--color-card)] py-3 text-[14px] font-medium text-[var(--color-ink)]"
      >
        <Plus size={16} /> Новый замер
      </button>

      {isLoading && <Empty>Загрузка…</Empty>}
      {!isLoading && items.length === 0 && <Empty>Замеров пока нет.</Empty>}

      {items.map((m, i) => (
        <MeasurementRow key={m.id} m={m} prev={items[i + 1]} onEdit={() => setEditing(m)} />
      ))}

      {adding && <MeasurementForm clientId={clientId} onClose={() => setAdding(false)} />}
      {editing && (
        <MeasurementForm clientId={clientId} measurement={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function MeasurementRow({ m, prev: _prev, onEdit }: { m: Measurement; prev: Measurement | undefined; onEdit: () => void }) {
  const fields: Array<{ label: string; v: number | null; suffix: string }> = [
    { label: 'Вес', v: m.weightKg, suffix: 'кг' },
    { label: '% жира', v: m.bodyFatPct, suffix: '' },
    { label: '% мышц', v: m.musclePct, suffix: '' },
    { label: '% воды', v: m.waterPct, suffix: '' },
    { label: 'Шея', v: m.neckCm, suffix: 'см' },
    { label: 'Плечи', v: m.shouldersCm, suffix: 'см' },
    { label: 'Грудь', v: m.chestCm, suffix: 'см' },
    { label: 'Талия', v: m.waistCm, suffix: 'см' },
    { label: 'Бёдра', v: m.hipsCm, suffix: 'см' },
    { label: 'Бицепс', v: avg(m.bicepsLCm, m.bicepsRCm), suffix: 'см' },
    { label: 'Бедро', v: avg(m.thighLCm, m.thighRCm), suffix: 'см' },
    { label: 'Икра', v: avg(m.calfLCm, m.calfRCm), suffix: 'см' },
  ];
  const present = fields.filter((f) => f.v !== null);
  return (
    <div className="rounded-2xl bg-[var(--color-card)] p-4">
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-semibold">{formatRuDate(m.date)}</div>
        <button
          onClick={onEdit}
          className="rounded-md p-1.5 text-[var(--color-ink-muted)] active:scale-95"
          aria-label="Редактировать"
        >
          <Pencil size={14} />
        </button>
      </div>
      {present.length > 0 && (
        <div className="mt-2 grid grid-cols-3 gap-y-2 text-[12px]">
          {present.map((f, i) => (
            <div key={i}>
              <div className="text-[10px] uppercase tracking-wider text-[var(--color-ink-mutedXL)]">{f.label}</div>
              <div className="tabular-nums">
                {f.v} <span className="text-[var(--color-ink-muted)]">{f.suffix}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {m.note && <div className="mt-2 text-[12px] text-[var(--color-ink-muted)]">{m.note}</div>}
    </div>
  );
}

function avg(a: number | null, b: number | null): number | null {
  if (a === null && b === null) return null;
  if (a === null) return b;
  if (b === null) return a;
  return Math.round(((a + b) / 2) * 10) / 10;
}

function formatRuDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  return `${d} ${months[m - 1]} ${y}`;
}

// Форма ввода замера. Не-модал — рендерится в потоке.
function MeasurementForm({
  clientId,
  measurement,
  onClose,
}: {
  clientId: string;
  measurement?: Measurement;
  onClose: () => void;
}) {
  const create = useCreateMeasurement(clientId);
  const update = useUpdateMeasurement(clientId);
  const remove = useDeleteMeasurement(clientId);
  const confirm = useConfirm();

  const [form, setForm] = useState<MeasurementInput>(() => ({
    date: measurement?.date ?? new Date().toISOString().slice(0, 10),
    weightKg: measurement?.weightKg ?? null,
    bodyFatPct: measurement?.bodyFatPct ?? null,
    musclePct: measurement?.musclePct ?? null,
    waterPct: measurement?.waterPct ?? null,
    chestCm: measurement?.chestCm ?? null,
    shouldersCm: measurement?.shouldersCm ?? null,
    waistCm: measurement?.waistCm ?? null,
    hipsCm: measurement?.hipsCm ?? null,
    bicepsLCm: measurement?.bicepsLCm ?? null,
    bicepsRCm: measurement?.bicepsRCm ?? null,
    thighLCm: measurement?.thighLCm ?? null,
    thighRCm: measurement?.thighRCm ?? null,
    calfLCm: measurement?.calfLCm ?? null,
    calfRCm: measurement?.calfRCm ?? null,
    neckCm: measurement?.neckCm ?? null,
    note: measurement?.note ?? null,
  }));

  function setField<K extends keyof MeasurementInput>(k: K, v: MeasurementInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSave() {
    if (measurement) {
      await update.mutateAsync({ id: measurement.id, input: form });
    } else {
      await create.mutateAsync(form);
    }
    onClose();
  }

  async function onDelete() {
    if (!measurement) return;
    const ok = await confirm('Удалить замер?', { confirmLabel: 'Удалить', danger: true });
    if (!ok) return;
    await remove.mutateAsync(measurement.id);
    onClose();
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-[var(--color-bg)]">
      <ScreenHeader title={measurement ? 'Редактировать замер' : 'Новый замер'} back={onClose} />
      <div className="flex-1 overflow-y-auto px-4 pb-24 pt-3 space-y-4">
        <FormGroup title="Дата">
          <input
            type="date"
            value={form.date}
            onChange={(e) => setField('date', e.target.value)}
            className="w-full rounded-xl bg-[var(--color-card)] px-3 py-2.5 text-[14px] focus:outline-none"
          />
        </FormGroup>

        <FormGroup title="Состав тела">
          <NumField label="Вес" suffix="кг" value={form.weightKg} onChange={(v) => setField('weightKg', v)} />
          <NumField label="% жира" suffix="%" value={form.bodyFatPct} onChange={(v) => setField('bodyFatPct', v)} />
          <NumField label="% мышц" suffix="%" value={form.musclePct} onChange={(v) => setField('musclePct', v)} />
          <NumField label="% воды" suffix="%" value={form.waterPct} onChange={(v) => setField('waterPct', v)} />
        </FormGroup>

        <FormGroup title="Обхваты">
          <NumField label="Шея" suffix="см" value={form.neckCm} onChange={(v) => setField('neckCm', v)} />
          <NumField label="Плечи" suffix="см" value={form.shouldersCm} onChange={(v) => setField('shouldersCm', v)} />
          <NumField label="Грудь" suffix="см" value={form.chestCm} onChange={(v) => setField('chestCm', v)} />
          <NumField label="Талия" suffix="см" value={form.waistCm} onChange={(v) => setField('waistCm', v)} />
          <NumField label="Бёдра" suffix="см" value={form.hipsCm} onChange={(v) => setField('hipsCm', v)} />
          <PairField
            label="Бицепс"
            suffix="см"
            l={form.bicepsLCm}
            r={form.bicepsRCm}
            onChange={(l, r) => setForm((f) => ({ ...f, bicepsLCm: l, bicepsRCm: r }))}
          />
          <PairField
            label="Бедро"
            suffix="см"
            l={form.thighLCm}
            r={form.thighRCm}
            onChange={(l, r) => setForm((f) => ({ ...f, thighLCm: l, thighRCm: r }))}
          />
          <PairField
            label="Икра"
            suffix="см"
            l={form.calfLCm}
            r={form.calfRCm}
            onChange={(l, r) => setForm((f) => ({ ...f, calfLCm: l, calfRCm: r }))}
          />
        </FormGroup>

        <FormGroup title="Заметка">
          <textarea
            value={form.note ?? ''}
            onChange={(e) => setField('note', e.target.value || null)}
            rows={3}
            className="w-full rounded-xl bg-[var(--color-card)] px-3 py-2.5 text-[14px] resize-none focus:outline-none"
            placeholder="Например: после диеты, утро натощак"
          />
        </FormGroup>
      </div>
      <div className="border-t border-[var(--color-line)] bg-[var(--color-bg)] p-4 flex gap-2">
        {measurement && (
          <button
            onClick={onDelete}
            className="flex items-center justify-center rounded-xl border border-[var(--color-line)] px-4 py-3 text-[var(--color-danger)]"
          >
            <Trash2 size={16} />
          </button>
        )}
        <button
          onClick={onSave}
          className="flex-1 rounded-xl bg-[var(--color-accent)] py-3 text-[15px] font-bold text-[var(--color-accent-on)]"
        >
          Сохранить
        </button>
      </div>
    </div>
  );
}

function FormGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h3 className="px-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">{title}</h3>
      <div className="overflow-hidden rounded-2xl bg-[var(--color-card)] divide-y divide-[var(--color-line)]">
        {children}
      </div>
    </div>
  );
}

function NumField({
  label,
  suffix,
  value,
  onChange,
}: {
  label: string;
  suffix: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 px-4 py-3 text-[14px]">
      <span className="text-[var(--color-ink-muted)]">{label}</span>
      <span className="flex items-baseline gap-1">
        <input
          type="number"
          step="0.1"
          inputMode="decimal"
          value={value ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === '' ? null : Number(v));
          }}
          className="w-24 bg-transparent text-right tabular-nums focus:outline-none"
          placeholder="—"
        />
        <span className="text-[12px] text-[var(--color-ink-mutedXL)]">{suffix}</span>
      </span>
    </label>
  );
}

function PairField({
  label,
  suffix,
  l,
  r,
  onChange,
}: {
  label: string;
  suffix: string;
  l: number | null;
  r: number | null;
  onChange: (l: number | null, r: number | null) => void;
}) {
  return (
    <div className="px-4 py-3 text-[14px] space-y-2">
      <div className="text-[var(--color-ink-muted)]">{label}</div>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex items-baseline justify-between gap-2 rounded-lg bg-[var(--color-card-elevated)] px-3 py-2">
          <span className="text-[11px] uppercase tracking-wider text-[var(--color-ink-mutedXL)]">Левая</span>
          <span className="flex items-baseline gap-1">
            <input
              type="number"
              step="0.1"
              inputMode="decimal"
              value={l ?? ''}
              onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value), r)}
              className="w-14 bg-transparent text-right tabular-nums focus:outline-none"
              placeholder="—"
            />
            <span className="text-[11px] text-[var(--color-ink-mutedXL)]">{suffix}</span>
          </span>
        </label>
        <label className="flex items-baseline justify-between gap-2 rounded-lg bg-[var(--color-card-elevated)] px-3 py-2">
          <span className="text-[11px] uppercase tracking-wider text-[var(--color-ink-mutedXL)]">Правая</span>
          <span className="flex items-baseline gap-1">
            <input
              type="number"
              step="0.1"
              inputMode="decimal"
              value={r ?? ''}
              onChange={(e) => onChange(l, e.target.value === '' ? null : Number(e.target.value))}
              className="w-14 bg-transparent text-right tabular-nums focus:outline-none"
              placeholder="—"
            />
            <span className="text-[11px] text-[var(--color-ink-mutedXL)]">{suffix}</span>
          </span>
        </label>
      </div>
    </div>
  );
}

// ─── Фото прогресса ─────────────────────────────────────────────────────────

function PhotosTab({ clientId }: { clientId: string }) {
  const { data: photos = [], isLoading } = useClientProgressPhotos(clientId);
  const upload = useUploadProgressPhoto(clientId);
  const remove = useDeleteProgressPhoto(clientId);
  const confirm = useConfirm();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [angle, setAngle] = useState<'front' | 'side' | 'back'>('front');

  // Группируем фото по дате (новые сверху).
  const groups = useMemo(() => {
    const map = new Map<string, ProgressPhoto[]>();
    for (const p of photos) {
      const arr = map.get(p.date) ?? [];
      arr.push(p);
      map.set(p.date, arr);
    }
    return Array.from(map.entries());
  }, [photos]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await upload.mutateAsync({ file, date, angle });
  }

  async function onDelete(id: string) {
    const ok = await confirm('Удалить фото?', { confirmLabel: 'Удалить', danger: true });
    if (ok) await remove.mutateAsync(id);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-[var(--color-card)] p-3 space-y-2">
        <div className="flex gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="flex-1 rounded-xl bg-[var(--color-card-elevated)] px-3 py-2 text-[14px] focus:outline-none"
          />
          <div className="flex rounded-xl bg-[var(--color-card-elevated)] p-0.5">
            {(['front', 'side', 'back'] as const).map((a) => (
              <button
                key={a}
                onClick={() => setAngle(a)}
                className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold ${
                  angle === a ? 'bg-[var(--color-accent)] text-[var(--color-accent-on)]' : 'text-[var(--color-ink-muted)]'
                }`}
              >
                {a === 'front' ? 'Фас' : a === 'side' ? 'Бок' : 'Спина'}
              </button>
            ))}
          </div>
        </div>
        <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-line-strong)] py-3 text-[13px] font-medium">
          <ImagePlus size={16} />
          {upload.isPending ? 'Загрузка…' : 'Выбрать фото'}
          <input type="file" accept="image/*" className="hidden" onChange={onPick} />
        </label>
      </div>

      {isLoading && <Empty>Загрузка…</Empty>}
      {!isLoading && photos.length === 0 && <Empty>Фотографий пока нет.</Empty>}

      {groups.map(([d, items]) => (
        <div key={d} className="space-y-2">
          <div className="px-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
            {formatRuDate(d)}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {items.map((p) => (
              <div key={p.id} className="relative aspect-square overflow-hidden rounded-xl bg-[var(--color-card)]">
                <img src={p.url} alt={p.angle} className="h-full w-full object-cover" />
                <div className="absolute left-1.5 top-1.5 rounded bg-black/50 px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[9px] font-bold uppercase tracking-wider text-white">
                  {p.angle === 'front' ? 'Фас' : p.angle === 'side' ? 'Бок' : 'Спина'}
                </div>
                <button
                  onClick={() => onDelete(p.id)}
                  className="absolute right-1.5 top-1.5 rounded bg-black/50 p-1 text-white"
                  aria-label="Удалить"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
