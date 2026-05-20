import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, CheckCheck, ChevronLeft, ChevronRight, CircleDashed, Plus } from 'lucide-react';
import { ScreenHeader } from '../components/ScreenHeader';
import { BottomSheet } from '../components/BottomSheet';
import { useConfirm } from '../components/ConfirmProvider';
import { useSessions, useCreateSession, useUpdateSession, useDeleteSession } from '../api/sessions';
import { useClient, useClients } from '../api/clients';
import { useClientWorkouts } from '../api/client-workouts';
import { useWorkoutTemplates } from '../api/workout-templates';
import { Field, TextInput } from '../components/Field';
import { fullName } from '../lib/initials';
import { formatDate } from '../lib/format';
import {
  CAL_HOURS,
  CAL_START_HOUR,
  DAY_FULL,
  DAY_SHORT,
  MONTH_FULL,
  MONTH_GEN,
  addDays,
  addMonths,
  humanDuration,
  monthGrid,
  parseISO,
  sameDay,
  timeToMin,
  toISODate,
  weekDates,
  weekdayMon,
} from '../lib/calendar';
import type { Session, SessionApproval, SessionInput } from '../api/types';

type View = 'day' | 'week' | 'month';

export function CalendarPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const clientId = params.get('clientId') ?? undefined;
  const { data: filterClient } = useClient(clientId);

  const [view, setView] = useState<View>('day');
  const [creating, setCreating] = useState(false);
  const [anchor, setAnchor] = useState<Date>(new Date());
  const [editing, setEditing] = useState<Session | null>(null);
  // Тап по пустому слоту: открыть форму с предзаполненными датой и временем.
  const [createAt, setCreateAt] = useState<{ date: string; startTime: string } | null>(null);

  const openCreateAt = (date: Date, hour: number) => {
    setCreateAt({ date: toISODate(date), startTime: `${String(hour).padStart(2, '0')}:00` });
    setEditing(null);
    setCreating(false);
  };

  // Диапазон дат для загрузки занятий зависит от вида.
  const range = useMemo(() => {
    if (view === 'day') return { from: toISODate(anchor), to: toISODate(anchor) };
    if (view === 'week') {
      const w = weekDates(anchor);
      return { from: toISODate(w[0]), to: toISODate(w[6]) };
    }
    const g = monthGrid(anchor);
    return { from: toISODate(g[0]), to: toISODate(g[41]) };
  }, [view, anchor]);

  const { data: sessions = [] } = useSessions(range.from, range.to, clientId);

  const visible = useMemo(() => {
    if (view === 'day') return sessions.filter((s) => s.date === toISODate(anchor));
    return sessions;
  }, [sessions, view, anchor]);

  const totalMin = visible.reduce((acc, s) => acc + s.durationMin, 0);

  const shift = (dir: -1 | 1) => {
    if (view === 'day') setAnchor((d) => addDays(d, dir));
    else if (view === 'week') setAnchor((d) => addDays(d, dir * 7));
    else setAnchor((d) => addMonths(d, dir));
  };

  const periodLabel = useMemo(() => {
    if (view === 'day') return `${anchor.getDate()} ${MONTH_GEN[anchor.getMonth()]}`;
    if (view === 'week') {
      const w = weekDates(anchor);
      const a = w[0];
      const b = w[6];
      const sameMonth = a.getMonth() === b.getMonth();
      return sameMonth
        ? `${a.getDate()} – ${b.getDate()} ${MONTH_GEN[b.getMonth()]}`
        : `${a.getDate()} ${MONTH_GEN[a.getMonth()]} – ${b.getDate()} ${MONTH_GEN[b.getMonth()]}`;
    }
    return `${MONTH_FULL[anchor.getMonth()]} ${anchor.getFullYear()}`;
  }, [view, anchor]);

  const subLabel = useMemo(() => {
    const parts: string[] = [];
    if (view === 'day') parts.push(DAY_FULL[weekdayMon(anchor)]);
    parts.push(`${visible.length} ${plural(visible.length, 'тренировка', 'тренировки', 'тренировок')}`);
    if (totalMin > 0) parts.push(`~${humanDuration(totalMin)}`);
    return parts.join(' · ');
  }, [view, anchor, visible.length, totalMin]);

  const showForm = creating || editing !== null || createAt !== null;

  const closeForm = () => {
    setEditing(null);
    setCreating(false);
    setCreateAt(null);
  };

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title="Календарь"
        back
        right={
          <button
            onClick={() => { setCreating(true); setEditing(null); }}
            className="flex items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-[13px] font-semibold"
            style={{ color: '#ffffff' }}
          >
            <Plus size={14} /> Запись
          </button>
        }
      />

      {clientId && !showForm && (
        <div className="px-5 pt-1 pb-1 text-[12px] text-[var(--color-ink-muted)]">
          Занятия клиента: {filterClient ? fullName(filterClient.firstName, filterClient.lastName) : ''}
        </div>
      )}

      {showForm ? (
        <div className="flex-1 overflow-y-auto">
          <SessionForm
            session={editing}
            defaultDate={createAt?.date ?? toISODate(anchor)}
            defaultStartTime={createAt?.startTime}
            defaultClientId={clientId}
            onClose={closeForm}
          />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between px-4 pb-1">
            <div className="flex items-center gap-1">
              <button onClick={() => shift(-1)} className="flex h-8 w-8 items-center justify-center rounded-full active:bg-black/5" aria-label="Назад">
                <ChevronLeft size={18} />
              </button>
              <button onClick={() => setAnchor(new Date())} className="min-w-[96px] text-center" title="К сегодняшнему дню">
                <div className="text-[15px] font-bold leading-tight">{periodLabel}</div>
              </button>
              <button onClick={() => shift(1)} className="flex h-8 w-8 items-center justify-center rounded-full active:bg-black/5" aria-label="Вперёд">
                <ChevronRight size={18} />
              </button>
            </div>
            <Segmented<View>
              value={view}
              onChange={setView}
              options={[
                { value: 'day', label: 'День' },
                { value: 'week', label: 'Неделя' },
                { value: 'month', label: 'Месяц' },
              ]}
            />
          </div>
          <div className="px-5 pb-1 text-[12px] text-[var(--color-ink-muted)]">{subLabel}</div>
          {view === 'day' && <ApprovalLegend />}
          {view === 'week' && <WeekStripeLegend />}

          <div className="flex-1 overflow-y-auto pb-6">
            {view === 'day' && (
              <DayView
                date={anchor}
                sessions={sessions}
                onPick={setEditing}
                onSlot={(hour) => openCreateAt(anchor, hour)}
              />
            )}
            {view === 'week' && (
              <WeekView
                dates={weekDates(anchor)}
                sessions={sessions}
                onPick={setEditing}
                onPickDay={(d) => { setAnchor(d); setView('day'); }}
                onSlot={openCreateAt}
              />
            )}
            {view === 'month' && (
              <MonthView
                anchor={anchor}
                sessions={sessions}
                onPickDay={(d) => { setAnchor(d); setView('day'); }}
                onSlot={openCreateAt}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-full bg-[var(--color-chip)] p-0.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-medium ${active ? 'bg-ink' : 'text-[var(--color-ink-muted)]'}`}
            style={active ? { color: '#ffffff' } : undefined}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// Четыре состояния занятия с галочками «как в мессенджере».
type ApprovalStage = 'none' | 'sent' | 'delivered' | 'approved';
const APPROVED_BLUE = '#2f6fed';

function approvalStage(s: Session): ApprovalStage {
  if (s.approval === 'approved') return 'approved';
  if (s.approval === 'pending') return s.deliveredAt ? 'delivered' : 'sent';
  return 'none';
}

function ApprovalBadge({ session, size = 14 }: { session: Session; size?: number }) {
  const stage = approvalStage(session);
  if (stage === 'none') {
    return <CircleDashed size={size} className="shrink-0 text-[var(--color-ink-muted)]" aria-label="Не отправлено" />;
  }
  if (stage === 'sent') {
    return <Check size={size} className="shrink-0 text-[var(--color-ink-muted)]" aria-label="Отправлено" />;
  }
  if (stage === 'delivered') {
    return <CheckCheck size={size} className="shrink-0 text-[var(--color-ink-muted)]" aria-label="Получено клиентом" />;
  }
  return <CheckCheck size={size} className="shrink-0" style={{ color: APPROVED_BLUE }} aria-label="Согласовано клиентом" />;
}

// Статус согласования в форме занятия — не степпер, а индикатор.
// Тренер сам ничего не выставляет: статус продвигается автоматически
// (есть accountId у клиента → отправлено; клиент опросил → получено;
// клиент подтвердил → согласовано).
function ApprovalStatus({
  session,
  canSend,
  clientPicked,
  clientId,
}: {
  session: Session | null;
  canSend: boolean;
  clientPicked: boolean;
  clientId: string;
}) {
  const navigate = useNavigate();
  if (!clientPicked) return null;
  if (!canSend) {
    return (
      <div
        className="rounded-2xl px-4 py-3 text-[12px]"
        style={{ background: 'rgba(217,145,43,0.12)', color: '#7a4a14' }}
      >
        <div className="font-semibold">Не получится отправить на согласование</div>
        <div className="mt-0.5 opacity-90">
          Укажите «ID клиента» в его карточке — тогда занятия будут отправляться автоматически.
        </div>
        <button
          type="button"
          onClick={() => navigate(`/trainer/clients/${clientId}/edit`)}
          className="mt-1 text-[12px] font-semibold underline"
        >
          Открыть карточку клиента
        </button>
      </div>
    );
  }
  if (!session) {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-[var(--color-card)] px-4 py-3 text-[13px]">
        <Check size={14} className="text-[var(--color-ink-muted)]" />
        <span>Будет отправлено клиенту на согласование</span>
      </div>
    );
  }
  const stage = approvalStage(session);
  const label =
    stage === 'approved' ? 'Согласовано клиентом'
      : stage === 'delivered' ? 'Клиент получил уведомление'
      : stage === 'sent' ? 'Отправлено клиенту'
      : 'Не отправлено';
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-[var(--color-card)] px-4 py-3 text-[13px]">
      <ApprovalBadge session={session} size={16} />
      <span className="font-medium">{label}</span>
    </div>
  );
}

// Подпись-легенда — 4 состояния галочек.
function ApprovalLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-5 pb-1 text-[10px] text-[var(--color-ink-muted)]">
      <span className="flex items-center gap-1">
        <CircleDashed size={11} className="text-[var(--color-ink-muted)]" /> не отправлено
      </span>
      <span className="flex items-center gap-1">
        <Check size={11} className="text-[var(--color-ink-muted)]" /> отправлено
      </span>
      <span className="flex items-center gap-1">
        <CheckCheck size={11} className="text-[var(--color-ink-muted)]" /> получено
      </span>
      <span className="flex items-center gap-1">
        <CheckCheck size={11} style={{ color: APPROVED_BLUE }} /> согласовано
      </span>
    </div>
  );
}

// Цвет полоски занятия в недельном виде: зелёная — согласовано, красная — нет.
function approvalStripeColor(approval: SessionApproval): string {
  return approval === 'approved' ? 'var(--color-success)' : 'var(--color-danger)';
}

// Легенда цветных полосок — для недельного вида.
function WeekStripeLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-5 pb-1 text-[10px] text-[var(--color-ink-muted)]">
      <span className="flex items-center gap-1">
        <span className="h-2.5 w-1.5 rounded-sm" style={{ background: 'var(--color-success)' }} /> согласовано
      </span>
      <span className="flex items-center gap-1">
        <span className="h-2.5 w-1.5 rounded-sm" style={{ background: 'var(--color-danger)' }} /> не согласовано
      </span>
    </div>
  );
}

function DayView({
  date,
  sessions,
  onPick,
  onSlot,
}: {
  date: Date;
  sessions: Session[];
  onPick: (s: Session) => void;
  onSlot: (hour: number) => void;
}) {
  const HOUR_H = 56;
  const hours = Array.from({ length: CAL_HOURS }, (_, i) => CAL_START_HOUR + i);
  const items = sessions
    .filter((s) => s.date === toISODate(date))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const now = new Date();
  const showNow = sameDay(date, now);
  const nowTop = ((now.getHours() * 60 + now.getMinutes()) - CAL_START_HOUR * 60) / 60 * HOUR_H;
  const gridH = CAL_HOURS * HOUR_H;

  return (
    <div className="flex px-4 pt-3">
      <div className="relative w-10 shrink-0" style={{ height: gridH }}>
        {hours.map((h, i) => (
          <span
            key={h}
            className="absolute -translate-y-1/2 text-[10px] tabular-nums text-[var(--color-ink-muted)]"
            style={{ top: i * HOUR_H }}
          >
            {String(h).padStart(2, '0')}:00
          </span>
        ))}
      </div>
      <div className="relative flex-1 border-l border-[var(--color-line)]" style={{ height: gridH }}>
        {/* Кликабельные слоты по часам — за блоками занятий */}
        {hours.map((h, i) => (
          <button
            key={`slot-${h}`}
            type="button"
            onClick={() => onSlot(h)}
            className="absolute inset-x-0 border-t border-[var(--color-line)] hover:bg-black/[0.02] active:bg-black/[0.04]"
            style={{ top: i * HOUR_H, height: HOUR_H }}
            aria-label={`Добавить занятие на ${String(h).padStart(2, '0')}:00`}
          />
        ))}
        {showNow && nowTop >= 0 && nowTop <= gridH && (
          <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: nowTop }}>
            <div className="h-2 w-2 -translate-x-1 rounded-full bg-[var(--color-danger)]" />
            <div className="h-px flex-1 bg-[var(--color-danger)]" />
          </div>
        )}
        {items.map((s) => {
          const top = (timeToMin(s.startTime) - CAL_START_HOUR * 60) / 60 * HOUR_H;
          const height = Math.max((s.durationMin / 60) * HOUR_H - 4, 36);
          return (
            <button
              key={s.id}
              onClick={() => onPick(s)}
              className="absolute left-1.5 right-1.5 z-10 overflow-hidden rounded-xl border-l-[4px] bg-[var(--color-card)] px-2.5 py-1.5 text-left shadow-sm"
              style={{ top, height, borderLeftColor: approvalStripeColor(s.approval), opacity: s.status === 'completed' ? 0.5 : 1 }}
            >
              <div className="flex items-center gap-1.5">
                <span className="shrink-0 text-[12px] font-bold tabular-nums">{s.startTime}</span>
                <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">{fullName(s.clientFirstName, s.clientLastName)}</span>
                <ApprovalBadge session={s} />
              </div>
              <div className="truncate text-[11px] text-[var(--color-ink-muted)]">
                {[s.title, s.location, `${s.durationMin} мин`].filter(Boolean).join(' · ')}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({
  dates,
  sessions,
  onPick,
  onPickDay,
  onSlot,
}: {
  dates: Date[];
  sessions: Session[];
  onPick: (s: Session) => void;
  onPickDay: (d: Date) => void;
  onSlot: (date: Date, hour: number) => void;
}) {
  const HOUR_H = 48;
  const hours = Array.from({ length: CAL_HOURS }, (_, i) => CAL_START_HOUR + i);
  const now = new Date();
  const gridH = CAL_HOURS * HOUR_H;

  return (
    <div className="px-2 pt-2">
      <div className="flex">
        <div className="w-7 shrink-0" />
        {dates.map((d) => {
          const today = sameDay(d, now);
          return (
            <button key={toISODate(d)} onClick={() => onPickDay(d)} className="flex-1 pb-1.5 text-center">
              <div className="text-[10px] text-[var(--color-ink-muted)]">{DAY_SHORT[weekdayMon(d)]}</div>
              <div
                className={`mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold tabular-nums ${today ? 'bg-ink' : ''}`}
                style={today ? { color: '#ffffff' } : undefined}
              >
                {d.getDate()}
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex">
        <div className="relative w-7 shrink-0" style={{ height: gridH }}>
          {hours.map((h, i) => (
            <span
              key={h}
              className="absolute -translate-y-1/2 text-[9px] tabular-nums text-[var(--color-ink-muted)]"
              style={{ top: i * HOUR_H }}
            >
              {h}
            </span>
          ))}
        </div>
        <div className="grid flex-1 grid-cols-7">
          {dates.map((d) => {
            const items = sessions
              .filter((s) => s.date === toISODate(d))
              .sort((a, b) => a.startTime.localeCompare(b.startTime));
            return (
              <div
                key={toISODate(d)}
                className="relative border-l border-[var(--color-line)]"
                style={{ height: gridH }}
              >
                {/* Кликабельные слоты по часам */}
                {hours.map((h, i) => (
                  <button
                    key={`slot-${h}`}
                    type="button"
                    onClick={() => onSlot(d, h)}
                    className="absolute inset-x-0 border-t border-[var(--color-line)] hover:bg-black/[0.02] active:bg-black/[0.04]"
                    style={{ top: i * HOUR_H, height: HOUR_H }}
                    aria-label={`Добавить занятие ${DAY_SHORT[weekdayMon(d)]} ${d.getDate()} в ${String(h).padStart(2, '0')}:00`}
                  />
                ))}
                {items.map((s) => {
                  const top = (timeToMin(s.startTime) - CAL_START_HOUR * 60) / 60 * HOUR_H;
                  const height = Math.max((s.durationMin / 60) * HOUR_H - 2, 24);
                  return (
                    <button
                      key={s.id}
                      onClick={() => onPick(s)}
                      className="absolute inset-x-[2px] z-10 overflow-hidden rounded-md border-l-[3px] bg-[var(--color-card)] px-1 py-0.5 text-left"
                      style={{ top, height, borderLeftColor: approvalStripeColor(s.approval), opacity: s.status === 'completed' ? 0.5 : 1 }}
                    >
                      <div className="truncate text-[9px] font-bold leading-tight tabular-nums">{s.startTime}</div>
                      <div className="truncate text-[9px] leading-tight">{s.clientFirstName}</div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function loadColor(n: number): string {
  if (n <= 0) return 'transparent';
  if (n <= 1) return 'rgba(26,26,26,0.14)';
  if (n <= 2) return 'rgba(26,26,26,0.30)';
  if (n <= 3) return 'rgba(26,26,26,0.50)';
  if (n <= 4) return 'rgba(26,26,26,0.72)';
  return 'rgba(26,26,26,0.92)';
}

function MonthView({
  anchor,
  sessions,
  onPickDay,
  onSlot,
}: {
  anchor: Date;
  sessions: Session[];
  onPickDay: (d: Date) => void;
  onSlot: (date: Date, hour: number) => void;
}) {
  const cells = monthGrid(anchor);
  const month = anchor.getMonth();
  const now = new Date();
  const countByDate = new Map<string, number>();
  for (const s of sessions) countByDate.set(s.date, (countByDate.get(s.date) ?? 0) + 1);
  const monthTotal = sessions.filter((s) => parseISO(s.date).getMonth() === month).length;

  return (
    <div className="px-4 pt-3">
      <div className="grid grid-cols-7 gap-1 pb-1">
        {DAY_SHORT.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-[var(--color-ink-muted)]">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d) => {
          const iso = toISODate(d);
          const n = countByDate.get(iso) ?? 0;
          const inMonth = d.getMonth() === month;
          const today = sameDay(d, now);
          return (
            <div
              key={iso}
              className={`relative aspect-square rounded-xl ${inMonth ? 'bg-[var(--color-card)]' : ''} ${today ? 'ring-2 ring-ink' : ''}`}
            >
              <button
                type="button"
                onClick={() => onPickDay(d)}
                className="flex h-full w-full flex-col items-center justify-center gap-0.5"
              >
                <span className={`text-[12px] font-semibold tabular-nums ${inMonth ? '' : 'text-[var(--color-ink-muted)] opacity-50'}`}>
                  {d.getDate()}
                </span>
                {n > 0 && (
                  <span
                    className="flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums"
                    style={{ backgroundColor: loadColor(n), color: n >= 3 ? '#ffffff' : '#1a1a1a' }}
                  >
                    {n}
                  </span>
                )}
              </button>
              {inMonth && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onSlot(d, 10); }}
                  className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-chip)] opacity-70 active:opacity-100"
                  aria-label={`Добавить занятие ${d.getDate()}`}
                >
                  <Plus size={11} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-[var(--color-ink-muted)]">
        <span>нагрузка</span>
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className="flex h-4 min-w-[16px] items-center justify-center rounded-full px-1"
            style={{ backgroundColor: loadColor(n), color: n >= 3 ? '#ffffff' : '#1a1a1a' }}
          >
            {n}
            {n === 5 ? '+' : ''}
          </span>
        ))}
        <span className="ml-2">· {monthTotal} за месяц</span>
      </div>
    </div>
  );
}

const LOCATIONS = ['Зал · ClubAlex', 'Онлайн'];
const DURATIONS = [30, 45, 60, 90];

function SessionForm({
  session,
  defaultDate,
  defaultStartTime,
  defaultClientId,
  onClose,
}: {
  session: Session | null;
  defaultDate: string;
  defaultStartTime?: string;
  defaultClientId?: string;
  onClose: () => void;
}) {
  const { data: clients = [] } = useClients();
  const createMut = useCreateSession();
  const updateMut = useUpdateSession();
  const deleteMut = useDeleteSession();
  const confirm = useConfirm();

  const [clientId, setClientId] = useState(session?.clientId ?? defaultClientId ?? '');
  const [date, setDate] = useState(session?.date ?? defaultDate);
  const [time, setTime] = useState(session?.startTime ?? defaultStartTime ?? '10:00');
  const [duration, setDuration] = useState(session?.durationMin ?? 60);
  const [location, setLocation] = useState(session?.location ?? LOCATIONS[0]);
  const [title, setTitle] = useState(session?.title ?? '');
  const [typePickerOpen, setTypePickerOpen] = useState(false);

  // Тренер сам статус не выставляет. Логика: если у клиента есть accountId —
  // занятие автоматически уходит на согласование (approval='pending').
  // Если не подтверждено или ещё не отправлено — продвигается до 'pending';
  // 'approved' (клиент уже подтвердил) — оставляем как есть.
  const selectedClient = clients.find((c) => c.id === clientId);
  const canSend = !!selectedClient?.accountId;

  const computeApproval = (): SessionApproval => {
    if (session?.approval === 'approved') return 'approved';
    if (canSend) return 'pending';
    return session?.approval ?? 'none';
  };

  const save = async () => {
    if (!clientId) { alert('Выберите клиента'); return; }
    const input: SessionInput = {
      clientId,
      date,
      startTime: time,
      durationMin: duration,
      location: location || null,
      title: title.trim() || null,
      approval: computeApproval(),
      // deliveredAt не трогаем — undefined; сервер сохранит существующее.
    };
    if (session) await updateMut.mutateAsync({ id: session.id, input });
    else await createMut.mutateAsync(input);
    onClose();
  };

  const remove = async () => {
    if (!session) return;
    if (!(await confirm('Удалить занятие?', { confirmLabel: 'Удалить', danger: true }))) return;
    await deleteMut.mutateAsync(session.id);
    onClose();
  };

  const inputCls = 'w-full rounded-2xl bg-[var(--color-card)] px-4 py-3.5 text-[15px] outline-none focus:ring-2 focus:ring-ink/10';

  return (
    <div className="px-4 pb-8 pt-2 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-bold">{session ? 'Занятие' : 'Новое занятие'}</h2>
        <button onClick={onClose} className="text-[13px] text-[var(--color-ink-muted)]">Отмена</button>
      </div>

      <Field label="Клиент">
        <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputCls}>
          <option value="">— выберите клиента —</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{fullName(c.firstName, c.lastName)}</option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Дата">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Время">
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} />
        </Field>
      </div>

      <Field label="Длительность">
        <div className="flex gap-1.5">
          {DURATIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              className={`flex-1 rounded-2xl py-2.5 text-[13px] font-medium ${duration === d ? 'bg-ink' : 'bg-[var(--color-chip)]'}`}
              style={duration === d ? { color: '#ffffff' } : undefined}
            >
              {d} мин
            </button>
          ))}
        </div>
      </Field>

      <Field label="Место">
        <div className="flex gap-1.5">
          {LOCATIONS.map((loc) => (
            <button
              key={loc}
              onClick={() => setLocation(loc)}
              className={`rounded-full px-4 py-2 text-[13px] font-medium ${location === loc ? 'bg-ink' : 'bg-[var(--color-chip)]'}`}
              style={location === loc ? { color: '#ffffff' } : undefined}
            >
              {loc}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Тип тренировки">
        <div className="flex gap-2">
          <div className="flex-1">
            <TextInput placeholder="Низ · Гипертрофия" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <button
            type="button"
            onClick={() => setTypePickerOpen(true)}
            className="shrink-0 rounded-2xl bg-[var(--color-chip)] px-4 text-[13px] font-medium"
          >
            Выбрать
          </button>
        </div>
      </Field>

      <ApprovalStatus session={session} canSend={canSend} clientPicked={!!clientId} clientId={clientId} />


      <button
        onClick={save}
        className="w-full rounded-2xl bg-ink py-3.5 text-[15px] font-semibold"
        style={{ color: '#ffffff' }}
      >
        {session ? 'Сохранить' : 'Создать занятие'}
      </button>

      {session && (
        <button
          onClick={remove}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-card)] py-3.5 text-[14px] font-medium text-[var(--color-danger)]"
        >
          Удалить занятие
        </button>
      )}

      <WorkoutTypePicker
        open={typePickerOpen}
        clientId={clientId}
        onClose={() => setTypePickerOpen(false)}
        onPick={(name) => { setTitle(name); setTypePickerOpen(false); }}
      />
    </div>
  );
}

function WorkoutTypePicker({
  open,
  clientId,
  onClose,
  onPick,
}: {
  open: boolean;
  clientId: string;
  onClose: () => void;
  onPick: (name: string) => void;
}) {
  const { data: templates = [] } = useWorkoutTemplates();
  const { data: workouts } = useClientWorkouts(clientId || undefined);
  const history = workouts?.history ?? [];

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="px-4 pt-2 pb-4 max-h-[70vh] overflow-y-auto">
        <h3 className="text-base font-semibold">Выбрать тренировку</h3>

        {clientId && history.length > 0 && (
          <>
            <div className="mt-3 px-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
              История клиента
            </div>
            <ul className="mt-1.5 space-y-1.5">
              {history.map((w) => (
                <li key={w.id}>
                  <button
                    onClick={() => onPick(w.name)}
                    className="flex w-full items-center gap-2 rounded-2xl bg-[var(--color-card)] px-3 py-2.5 text-left"
                  >
                    <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{w.name}</span>
                    <span className="shrink-0 text-[11px] text-[var(--color-ink-muted)]">
                      {formatDate(w.completedAt ?? w.createdAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="mt-3 px-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
          Из базы знаний
        </div>
        <ul className="mt-1.5 space-y-1.5">
          {templates.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => onPick(t.name)}
                className="flex w-full items-center gap-3 rounded-2xl bg-[var(--color-card)] px-3 py-2.5 text-left"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-chip)] text-[12px] font-bold tabular-nums">
                  {t.exercises.length}
                </span>
                <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{t.name}</span>
              </button>
            </li>
          ))}
          {templates.length === 0 && (
            <li className="py-4 text-center text-sm text-[var(--color-ink-muted)]">В базе нет тренировок</li>
          )}
        </ul>
      </div>
    </BottomSheet>
  );
}
