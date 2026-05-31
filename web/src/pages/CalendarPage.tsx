import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight, CircleDashed, Plus } from 'lucide-react';
import { ScreenHeader } from '../components/ScreenHeader';
import { BottomSheet } from '../components/BottomSheet';
import { useConfirm } from '../components/ConfirmProvider';
import { useSessions, useCreateSession, useUpdateSession, useDeleteSession, useSessionPaymentStatus } from '../api/sessions';
import { useClient, useClients } from '../api/clients';
import { useClientWorkouts } from '../api/client-workouts';
import { useWorkoutTemplates } from '../api/workout-templates';
import { useGyms } from '../api/gyms';
import { useTrainer } from '../api/trainer';
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

  // У клиента по умолчанию показываем месяц (общая картина),
  // в общем календаре — неделю (компромисс между обзором и детализацией).
  // Можно переопределить через ?view=day|week|month.
  const initialViewParam = params.get('view');
  const initialView: View =
    initialViewParam === 'day' || initialViewParam === 'week' || initialViewParam === 'month'
      ? initialViewParam
      : clientId
        ? 'month'
        : 'week';
  const [view, setView] = useState<View>(initialView);
  const [creating, setCreating] = useState(false);
  // ?date=YYYY-MM-DD — открыть календарь на конкретной дате (например, из «след.» на карточке клиента).
  const initialDateParam = params.get('date');
  const initialAnchor = initialDateParam && /^\d{4}-\d{2}-\d{2}$/.test(initialDateParam)
    ? (() => { const [y, mo, d] = initialDateParam.split('-').map(Number); return new Date(y, mo - 1, d); })()
    : new Date();
  const [anchor, setAnchor] = useState<Date>(initialAnchor);
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
  const { data: paidMap = {} } = useSessionPaymentStatus(range.from, range.to);

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

  const closeForm = (saved?: boolean) => {
    setEditing(null);
    setCreating(false);
    setCreateAt(null);
    // После сохранения занятия возвращаем тренера в месячный обзор —
    // обычно дальше хочется видеть всю сетку, а не один день.
    if (saved) setView('month');
  };

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title={clientId && filterClient ? `Календарь · ${filterClient.firstName} ${filterClient.lastName}` : 'Календарь'}
        back
      />

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
          <div className="px-5 pt-1 text-[12px] text-[var(--color-ink-muted)]">{subLabel}</div>
          {(view === 'day' || view === 'week') && <ApprovalLegend />}

          <ScrollableTimeGrid view={view} anchor={anchor} onSwipe={shift}>
            {view === 'day' && (
              <DayView
                date={anchor}
                sessions={sessions}
                paidMap={paidMap}
                onPick={setEditing}
                onSlot={(hour) => openCreateAt(anchor, hour)}
              />
            )}
            {view === 'week' && (
              <WeekView
                dates={weekDates(anchor)}
                sessions={sessions}
                paidMap={paidMap}
                onPick={setEditing}
                onPickDay={(d) => { setAnchor(d); setView('day'); }}
                onSlot={openCreateAt}
              />
            )}
            {view === 'month' && (
              <MonthView
                anchor={anchor}
                sessions={sessions}
                paidMap={paidMap}
                singleClient={!!clientId}
                onPickDay={(d) => { setAnchor(d); setView('day'); }}
              />
            )}
          </ScrollableTimeGrid>

          {/* Нижняя панель управления: две строки.
                Верхняя — крупный лейбл периода (тап → к сегодня) + FAB.
                Нижняя — segmented-табы вида (День/Неделя/Месяц).
              Свайп влево/вправо тоже переключает период. */}
          <div className="sticky bottom-0 z-20 border-t border-[var(--color-line)] bg-[var(--color-bg)] px-4 pb-3 pt-2 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => setAnchor(new Date())}
                className="min-w-0 flex-1 rounded-lg py-1 text-left active:opacity-70"
                title="К сегодняшнему дню"
              >
                <div className="truncate text-[20px] font-bold leading-tight">{periodLabel}</div>
              </button>
              <button
                onClick={() => { setCreating(true); setEditing(null); }}
                className="tile-shadow-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-full active:scale-[0.95]"
                aria-label="Запись"
              >
                <Plus size={22} />
              </button>
            </div>
            <Segmented<View>
              value={view}
              onChange={setView}
              fullWidth
              options={[
                { value: 'day', label: 'День' },
                { value: 'week', label: 'Неделя' },
                { value: 'month', label: 'Месяц' },
              ]}
            />
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Скроллируемый контейнер для day/week видов — при монтаже автоматически
 * прокручивается до уровня текущего часа (минус 1 час сверху для контекста).
 * Срабатывает при смене view и якорной даты.
 */
function ScrollableTimeGrid({
  view,
  anchor,
  children,
  onSwipe,
}: {
  view: View;
  anchor: Date;
  children: React.ReactNode;
  onSwipe?: (dir: -1 | 1) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Стартовые координаты touch-жеста для распознавания горизонтального свайпа.
  const touchRef = useRef<{ x: number; y: number; t: number } | null>(null);

  useEffect(() => {
    if (view !== 'day' && view !== 'week') return;
    const el = ref.current;
    if (!el) return;
    const HOUR_H = 56;
    const now = new Date();
    const currentHour = now.getHours();
    const scrollHour = Math.max(0, currentHour - 1);
    el.scrollTo({ top: (scrollHour - CAL_START_HOUR) * HOUR_H, behavior: 'auto' });
  }, [view, anchor]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return; // мышью — только клик/скролл, без свайпа
    touchRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const start = touchRef.current;
    touchRef.current = null;
    if (!start || !onSwipe) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const dt = Date.now() - start.t;
    // Свайп: горизонтальный, быстрый, амплитуда ≥ 60px, доминирует над вертикалью.
    if (Math.abs(dx) < 60) return;
    if (Math.abs(dx) < Math.abs(dy) * 1.4) return;
    if (dt > 600) return;
    onSwipe(dx > 0 ? -1 : 1);
  };

  return (
    <div
      ref={ref}
      className="flex-1 overflow-y-auto pb-6"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { touchRef.current = null; }}
    >
      {children}
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
  fullWidth,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  fullWidth?: boolean;
}) {
  return (
    <div className={`${fullWidth ? 'flex' : 'inline-flex'} rounded-full bg-[var(--color-chip)] p-1`}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`${fullWidth ? 'flex-1' : 'shrink-0'} rounded-full px-3 py-1.5 text-[13px] font-medium ${active ? 'bg-[var(--color-accent)] text-[var(--color-accent-on)]' : 'text-[var(--color-ink-muted)]'}`}
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

// Иконка статуса для плитки в календаре: цвет наследует от фона плитки.
//   • online plate    — белая иконка
//   • approved offline — тёмная иконка на лайме
//   • остальные        — тёмная иконка на белой/кремовой
function SessionStatusIcon({ session, size, approved }: { session: Session; size: number; approved: boolean }) {
  const stage = approvalStage(session);
  const Icon =
    stage === 'none' ? CircleDashed
      : stage === 'sent' ? Check
      : CheckCheck;
  const color = session.isOnline
    ? '#ffffff'
    : (approved ? 'var(--color-accent-on)' : 'var(--color-bg)');
  return <Icon size={size} strokeWidth={2.4} style={{ color }} className="shrink-0" />;
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

// Фоновые цвета занятия по статусу оплаты — лёгкие подсветки.
const PAID_BG = 'rgba(46,125,79,0.10)';      // зелёный (оплачено)
const UNPAID_BG = 'rgba(200,57,44,0.08)';    // красный (не оплачено)
const PAID_BORDER = 'rgba(46,125,79,0.45)';
const UNPAID_BORDER = 'rgba(200,57,44,0.35)';

function paymentBg(isPaid: boolean) {
  return isPaid ? PAID_BG : UNPAID_BG;
}
function paymentBorder(isPaid: boolean) {
  return isPaid ? PAID_BORDER : UNPAID_BORDER;
}

// Цвета занятия по статусу согласования:
//  • approved (offline) — акцентный лайм (подтверждено клиентом)
//  • online            — целиком синяя плитка
//  • остальные offline — нейтральная белая/кремовая плитка
const ONLINE_BLUE = '#2f6fed';
function sessionTileBg(session: Session) {
  if (session.isOnline) return ONLINE_BLUE;
  return session.approval === 'approved' ? 'var(--color-accent)' : 'var(--color-ink)';
}
function sessionTileFg(session: Session) {
  if (session.isOnline) return '#ffffff';
  return session.approval === 'approved' ? 'var(--color-accent-on)' : 'var(--color-bg)';
}
function sessionTileBorder(session: Session) {
  if (session.isOnline) return ONLINE_BLUE;
  return session.approval === 'approved' ? 'var(--color-accent)' : 'rgba(0,0,0,0.06)';
}

// «10:00» + 45 мин → «10:45»; помогает в подписях занятий «начало-конец».
function endTime(startTime: string, durationMin: number): string {
  const [h, m] = startTime.split(':').map(Number);
  const total = h * 60 + m + durationMin;
  const eh = Math.floor(total / 60) % 24;
  const em = total % 60;
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
}

function DayView({
  date,
  sessions,
  paidMap,
  onPick,
  onSlot,
}: {
  date: Date;
  sessions: Session[];
  paidMap: Record<string, boolean>;
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
          const startMin = Math.round(timeToMin(s.startTime) / 15) * 15;
          const durMin = Math.round(s.durationMin / 15) * 15;
          const top = (startMin - CAL_START_HOUR * 60) / 60 * HOUR_H;
          const height = (durMin / 60) * HOUR_H - 2;
          const approved = s.approval === 'approved';
          const subColor = approved ? 'rgba(11,12,16,0.6)' : 'rgba(11,12,16,0.55)';
          return (
            <button
              key={s.id}
              onClick={() => onPick(s)}
              className="absolute left-1.5 right-1.5 z-10 overflow-hidden rounded-xl border px-2.5 py-1.5 text-left shadow-sm"
              style={{
                top,
                height,
                background: sessionTileBg(s),
                borderColor: sessionTileBorder(s),
                color: sessionTileFg(s),
                opacity: s.status === 'completed' ? 0.6 : 1,
              }}
            >
              <div className="flex items-center gap-1.5">
                <SessionStatusIcon session={s} size={14} approved={approved} />
                <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">
                  {fullName(s.clientFirstName, s.clientLastName)}
                </span>
              </div>
              <div className="truncate text-[11px]" style={{ color: subColor }}>
                {[s.title, s.location].filter(Boolean).join(' · ')}
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
  paidMap,
  onPick,
  onPickDay,
  onSlot,
}: {
  dates: Date[];
  sessions: Session[];
  paidMap: Record<string, boolean>;
  onPick: (s: Session) => void;
  onPickDay: (d: Date) => void;
  onSlot: (date: Date, hour: number) => void;
}) {
  const HOUR_H = 48;
  const hours = Array.from({ length: CAL_HOURS }, (_, i) => CAL_START_HOUR + i);
  const now = new Date();
  const gridH = CAL_HOURS * HOUR_H;
  // Индикатор «сейчас»: показываем только если в выбранной неделе есть сегодня.
  const todayIndex = dates.findIndex((d) => sameDay(d, now));
  const nowTop = ((now.getHours() * 60 + now.getMinutes()) - CAL_START_HOUR * 60) / 60 * HOUR_H;

  return (
    <div className="px-2 pt-2">
      <div
        className="sticky top-0 z-20 flex border-b border-[var(--color-line)] bg-[var(--color-bg)] pb-1.5 pt-1"
      >
        <div className="w-7 shrink-0" />
        {dates.map((d) => {
          const today = sameDay(d, now);
          return (
            <button key={toISODate(d)} onClick={() => onPickDay(d)} className="flex-1 text-center">
              <div className="text-[10px] text-[var(--color-ink-muted)]">{DAY_SHORT[weekdayMon(d)]}</div>
              <div
                className={`mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold tabular-nums ${today ? 'bg-[var(--color-accent)] text-[var(--color-accent-on)]' : ''}`}
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
        <div className="relative grid flex-1 grid-cols-7">
          {/* Индикатор текущего времени — горизонтальная линия + точка над колонкой «сегодня» */}
          {todayIndex >= 0 && (
            <>
              <div
                className="pointer-events-none absolute left-0 right-0 h-px bg-[var(--color-coral)]"
                style={{ top: nowTop, zIndex: 5 }}
              />
              <div
                className="pointer-events-none absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-coral)]"
                style={{
                  top: nowTop,
                  left: `${((todayIndex + 0.5) / 7) * 100}%`,
                  zIndex: 6,
                }}
              />
            </>
          )}
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
                  // Плитка занимает точный промежуток времени с округлением до 15 мин.
                  const startMin = Math.round(timeToMin(s.startTime) / 15) * 15;
                  const durMin = Math.round(s.durationMin / 15) * 15;
                  const top = (startMin - CAL_START_HOUR * 60) / 60 * HOUR_H;
                  const height = (durMin / 60) * HOUR_H - 1;
                  const approved = s.approval === 'approved';
                  return (
                    <button
                      key={s.id}
                      onClick={() => onPick(s)}
                      className="absolute inset-x-[1px] z-10 flex items-center justify-center overflow-hidden rounded-md border text-left"
                      style={{
                        top,
                        height,
                        background: sessionTileBg(s),
                        borderColor: sessionTileBorder(s),
                        color: sessionTileFg(s),
                        opacity: s.status === 'completed' ? 0.6 : 1,
                      }}
                    >
                      <SessionStatusIcon session={s} size={height < 18 ? 10 : 14} approved={approved} />
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

// Иконка статуса в ячейке месячного календаря, когда выбран конкретный
// клиент. С `onTile` — ячейка-плитка (лайм/бежевая) и иконка тёмная.
//   • online → синий кружок с белой иконкой внутри (как в недельной плитке)
//   • offline → CircleDashed / Check / CheckCheck тёмным цветом
function DayStatusIcon({ session, onTile }: { session: Session; onTile?: boolean }) {
  const stage = approvalStage(session);
  const Icon = stage === 'none' ? CircleDashed : stage === 'sent' ? Check : CheckCheck;
  // Online — иконка белая (плитка полностью синяя в sessionTileBg).
  if (session.isOnline) {
    return <Icon size={14} strokeWidth={2.4} style={{ color: '#ffffff' }} />;
  }
  const color = onTile
    ? (stage === 'approved' ? 'var(--color-accent-on)' : 'var(--color-bg)')
    : (stage === 'approved' ? 'var(--color-accent)' : 'var(--color-ink-muted)');
  return <Icon size={14} strokeWidth={2.2} style={{ color }} />;
}

// Бейдж-счётчик на ячейке месяца: только оффлайн-тренировки.
//   offApproved (лайм) / offPending (белый), разделитель «/» серый.
// Онлайн-тренировки в счётчике не отображаются — у них своя визуализация
// в плитке/иконке статуса.
function DayCountsBadge({ counts }: {
  counts: { offApproved: number; offPending: number; onlineDone: number; onlineWait: number };
}) {
  const { offApproved, offPending } = counts;
  if (offApproved === 0 && offPending === 0) return null;
  return (
    <span className="font-[family-name:var(--font-mono)] text-[10px] font-bold leading-none tabular-nums">
      <span style={{ color: 'var(--color-accent)' }}>{offApproved}</span>
      {offPending > 0 && (
        <>
          <span className="text-[var(--color-ink-mutedXL)]">/</span>
          <span style={{ color: 'var(--color-ink)' }}>{offPending}</span>
        </>
      )}
    </span>
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
  paidMap,
  singleClient,
  onPickDay,
}: {
  anchor: Date;
  sessions: Session[];
  paidMap: Record<string, boolean>;
  singleClient: boolean;          // фильтр по конкретному клиенту → показываем статус, не счётчик
  onPickDay: (d: Date) => void;
}) {
  const cells = monthGrid(anchor);
  const month = anchor.getMonth();
  const now = new Date();
  // Группируем сессии дня по 4 категориям для badge на месячном виде:
  //   offApproved — оффлайн, согласовано клиентом
  //   offPending  — оффлайн, ещё ждёт подтверждения (любой не-approved статус)
  //   onlineDone  — онлайн, клиент получил уведомление (delivered/approved)
  //   onlineWait  — онлайн, ещё не получено (none/sent без delivered_at)
  type DayCounts = { offApproved: number; offPending: number; onlineDone: number; onlineWait: number };
  const countByDate = new Map<string, DayCounts>();
  for (const s of sessions) {
    const c = countByDate.get(s.date) ?? { offApproved: 0, offPending: 0, onlineDone: 0, onlineWait: 0 };
    const stage = approvalStage(s);
    if (s.isOnline) {
      if (stage === 'delivered' || stage === 'approved') c.onlineDone++;
      else c.onlineWait++;
    } else {
      if (stage === 'approved') c.offApproved++;
      else c.offPending++;
    }
    countByDate.set(s.date, c);
  }
  // Для singleClient: первый session дня (для значка согласования и оплаты).
  const firstByDate = new Map<string, Session>();
  if (singleClient) {
    const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
    for (const s of sorted) if (!firstByDate.has(s.date)) firstByDate.set(s.date, s);
  }
  const monthTotal = sessions.filter((s) => parseISO(s.date).getMonth() === month).length;
  void monthTotal;

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
          const counts = countByDate.get(iso);
          const inMonth = d.getMonth() === month;
          const today = sameDay(d, now);
          const first = singleClient ? firstByDate.get(iso) : undefined;
          // В режиме одного клиента — фон ячейки как у плитки в недельном виде:
          //   approved → акцент-лайм, остальные с занятием → бежевая (ink), без занятия → card.
          const dayBg = singleClient && first
            ? sessionTileBg(first)
            : inMonth ? 'var(--color-card)' : 'transparent';
          const dayFg = singleClient && first ? sessionTileFg(first) : 'var(--color-ink)';
          return (
            <button
              key={iso}
              onClick={() => onPickDay(d)}
              className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl ${today ? 'ring-2 ring-ink' : ''}`}
              style={{ background: dayBg }}
            >
              <span
                className={`text-[12px] font-semibold tabular-nums ${inMonth ? '' : 'opacity-50'}`}
                style={{ color: inMonth ? dayFg : 'var(--color-ink-muted)' }}
              >
                {d.getDate()}
              </span>
              {singleClient ? (
                first ? <DayStatusIcon session={first} onTile /> : null
              ) : (
                counts && <DayCountsBadge counts={counts} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

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
  onClose: (saved?: boolean) => void;
}) {
  const { data: clients = [] } = useClients();
  const { data: gyms = [] } = useGyms();
  const { data: trainer } = useTrainer();
  const createMut = useCreateSession();
  const updateMut = useUpdateSession();
  const deleteMut = useDeleteSession();
  const confirm = useConfirm();

  // Тип места: gym (один из залов тренера) или online. Хранится в state отдельно,
  // на сохранении конвертируется в location string + isOnline.
  const initialLocation = session?.location ?? null;
  const initialIsOnline = session?.isOnline ?? initialLocation === 'Онлайн';
  // При создании нового занятия предлагаем последний выбранный зал из localStorage,
  // чтобы тренеру не приходилось каждый раз листать список.
  const lastUsedGym = typeof window !== 'undefined' ? localStorage.getItem('last_used_gym') : null;
  const [placeMode, setPlaceMode] = useState<'gym' | 'online'>(initialIsOnline ? 'online' : 'gym');
  const [gymName, setGymName] = useState<string>(
    initialIsOnline ? '' : (initialLocation ?? (session ? '' : lastUsedGym ?? ''))
  );
  // Последний выбранный клиент: берётся, только если создаётся новая сессия и
  // не передан defaultClientId (контекстный — например, при создании из карточки клиента).
  const lastUsedClientId = typeof window !== 'undefined' ? localStorage.getItem('last_used_client') : null;
  const [clientId, setClientId] = useState(
    session?.clientId ?? defaultClientId ?? (session ? '' : lastUsedClientId ?? '')
  );
  const [date, setDate] = useState(session?.date ?? defaultDate);
  const [time, setTime] = useState(session?.startTime ?? defaultStartTime ?? '10:00');
  const [duration, setDuration] = useState(session?.durationMin ?? 60);
  const [title, setTitle] = useState(session?.title ?? '');
  const [typePickerOpen, setTypePickerOpen] = useState(false);

  // При появлении списка залов автоматически выбираем первый, если ничего не выбрано.
  useEffect(() => {
    if (placeMode === 'gym' && !gymName && gyms.length > 0) {
      setGymName(gyms[0].name);
    }
  }, [gyms, gymName, placeMode]);

  const location = placeMode === 'online' ? 'Онлайн' : gymName;

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
    const isOnline = placeMode === 'online';
    const input: SessionInput = {
      clientId,
      date,
      startTime: time,
      durationMin: duration,
      location: location || null,
      title: title.trim() || null,
      // У онлайн-тренировок нет статуса «согласовано» — максимум «получено».
      approval: isOnline ? (session?.approval === 'approved' ? 'approved' : 'pending') : computeApproval(),
      isOnline,
      // deliveredAt не трогаем — undefined; сервер сохранит существующее.
    };
    if (session) await updateMut.mutateAsync({ id: session.id, input });
    else await createMut.mutateAsync(input);
    // Запоминаем последний выбранный зал и клиента — для удобства следующего ввода.
    try {
      if (!isOnline && gymName) localStorage.setItem('last_used_gym', gymName);
      if (clientId) localStorage.setItem('last_used_client', clientId);
    } catch { /* приватный режим */ }
    onClose(true);
  };

  const remove = async () => {
    if (!session) return;
    if (!(await confirm('Удалить занятие?', { confirmLabel: 'Удалить', danger: true }))) return;
    await deleteMut.mutateAsync(session.id);
    onClose();
  };

  const inputCls = 'w-full rounded-2xl bg-[var(--color-card)] px-4 py-3.5 text-[15px] outline-none focus:ring-2 focus:ring-ink/10';
  // Внутренний select: убираем системную стрелку, оставляем место под кастомный chip справа.
  const selectInnerCls = 'w-full appearance-none rounded-2xl bg-[var(--color-card)] pl-4 pr-14 py-3.5 text-[15px] outline-none focus:ring-2 focus:ring-ink/10';

  return (
    <div className="px-4 pb-8 pt-2 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-bold">{session ? 'Занятие' : 'Новое занятие'}</h2>
        <button onClick={() => onClose()} className="text-[13px] text-[var(--color-ink-muted)]">Отмена</button>
      </div>

      <Field label="Клиент">
        <CustomSelect
          value={clientId}
          onChange={setClientId}
          placeholder="— выберите клиента —"
          options={clients.map((c) => ({ value: c.id, label: fullName(c.firstName, c.lastName) }))}
        />
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
              className={`flex-1 rounded-2xl py-2.5 text-[13px] font-medium ${duration === d ? 'bg-[var(--color-accent)] text-[var(--color-accent-on)]' : 'bg-[var(--color-chip)]'}`}
            >
              {d} мин
            </button>
          ))}
        </div>
      </Field>

      <Field label="Место">
        <div className="space-y-2">
          <div className="flex gap-1.5">
            <button
              onClick={() => setPlaceMode('gym')}
              className={`rounded-full px-4 py-2 text-[13px] font-medium ${placeMode === 'gym' ? 'bg-[var(--color-accent)] text-[var(--color-accent-on)]' : 'bg-[var(--color-chip)]'}`}
            >
              Зал
            </button>
            {trainer?.worksOnline && (
              <button
                onClick={() => setPlaceMode('online')}
                className={`rounded-full px-4 py-2 text-[13px] font-medium ${placeMode === 'online' ? 'bg-[var(--color-accent)] text-[var(--color-accent-on)]' : 'bg-[var(--color-chip)]'}`}
              >
                Онлайн
              </button>
            )}
          </div>
          {placeMode === 'gym' && (
            gyms.length === 0 ? (
              <div className="rounded-2xl bg-[var(--color-card)] px-4 py-3 text-[12px] text-[var(--color-ink-muted)]">
                Нет залов. Добавьте их в карточке тренера → «Залы».
              </div>
            ) : (
              <CustomSelect
                value={gymName}
                onChange={setGymName}
                options={gyms.map((g) => ({ value: g.name, label: g.name }))}
              />
            )
          )}
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
        className="w-full rounded-2xl bg-[var(--color-accent)] py-3.5 text-[15px] font-semibold text-[var(--color-accent-on)]"
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

// Кастомный селект. Стилизован под тёмную тему приложения:
//  • триггер — та же плашка, что у текстового инпута;
//  • кружок-чип со стрелкой вниз, который плавно поворачивается вверх при открытии;
//  • выпадающий список — анимация opacity + scale, скролл при большом числе опций;
//  • при клике вне или Escape — закрывается.
type CustomSelectOption = { value: string; label: string };
function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  const current = options.find((o) => o.value === value);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl bg-[var(--color-card)] px-4 py-3.5 text-left text-[15px]"
      >
        <span className={current ? '' : 'text-[var(--color-ink-muted)]'}>
          {current?.label ?? placeholder ?? '—'}
        </span>
        <span
          aria-hidden
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-card-elevated)] transition-transform"
          style={{
            border: '1px solid var(--color-line)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          <ChevronDown size={14} strokeWidth={2.2} className="text-[var(--color-ink-muted)]" />
        </span>
      </button>
      {open && (
        <div
          className="absolute left-0 right-0 top-full z-30 mt-2 origin-top overflow-hidden rounded-2xl bg-[var(--color-card-elevated)] shadow-2xl"
          style={{
            border: '1px solid var(--color-line)',
            animation: 'select-pop 160ms cubic-bezier(0.2, 0.8, 0.2, 1)',
            maxHeight: 320,
          }}
        >
          <div className="max-h-[320px] overflow-y-auto py-1">
            {options.length === 0 && (
              <div className="px-4 py-3 text-[13px] text-[var(--color-ink-muted)]">Пусто</div>
            )}
            {options.map((o) => {
              const selected = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { onChange(o.value); setOpen(false); }}
                  className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-[14px] hover:bg-black/10 active:bg-black/20"
                  style={{
                    background: selected ? 'rgba(212,255,61,0.10)' : 'transparent',
                    color: selected ? 'var(--color-accent-text)' : 'var(--color-ink)',
                    fontWeight: selected ? 600 : 400,
                  }}
                >
                  <span className="truncate">{o.label}</span>
                  {selected && <Check size={14} strokeWidth={2.4} style={{ color: 'var(--color-accent-text)' }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
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
