import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  Cake,
  CalendarPlus,
  Check,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Dumbbell,
  Pencil,
  Trash2,
  Trophy,
  Wallet,
  X,
} from 'lucide-react';
import { ScreenHeader } from '../components/ScreenHeader';
import { useTrainerAlerts, type TrainerAlert } from '../api/alerts';
import { useTrainerEvents, type TrainerEvent } from '../api/events';

// Локально храним идентификаторы скрытых пользователем уведомлений, чтобы
// после удаления карточка не возвращалась при следующем перерасчёте на сервере.
const DISMISSED_KEY = 'notifications_dismissed';
function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch { return new Set(); }
}
function saveDismissed(set: Set<string>) {
  try { localStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(set))); } catch { /* приватный режим */ }
}
// Стабильный id для alert (там нет своего id) — по типу и клиенту.
function alertKey(a: TrainerAlert): string {
  return `alert:${a.type}:${a.clientId ?? 'sum'}`;
}

type RootTab = 'events' | 'action';
type EventsSubTab = 'system' | 'mine';

/**
 * Лента уведомлений тренера, разбитая на два раздела:
 *  • События (информационные) — две подвкладки: Система (произошло само)
 *    и Мои действия (что сделал тренер).
 *  • Требует действия — финансовые / чувствительные алерты, которые надо
 *    срочно разрулить (оплата, заканчивающиеся пакеты, простой клиента).
 */
export function NotificationsPage() {
  const { data: events, isLoading: eventsLoading } = useTrainerEvents();
  const { data: alerts = [], isLoading: alertsLoading } = useTrainerAlerts();
  const [root, setRoot] = useState<RootTab>('events');
  const [sub, setSub] = useState<EventsSubTab>('system');
  const [dismissed, setDismissed] = useState<Set<string>>(() => loadDismissed());
  // Анимация массового удаления: список id в процессе сворачивания.
  const [collapsing, setCollapsing] = useState<Set<string>>(new Set());
  const [clearOpen, setClearOpen] = useState(false);

  useEffect(() => { saveDismissed(dismissed); }, [dismissed]);
  const dismiss = (id: string) => setDismissed((prev) => {
    const next = new Set(prev);
    next.add(id);
    return next;
  });

  // «Требует действия» — берём из alerts только не-info уровни, плюс убираем скрытые.
  const actionItems = alerts.filter((a) => a.severity !== 'info' && !dismissed.has(alertKey(a)));
  const actionCount = actionItems.length;

  const sourceList: TrainerEvent[] | null = root === 'events'
    ? (sub === 'system' ? events?.system ?? null : events?.mine ?? null)
    : null;
  const list = sourceList?.filter((e) => !dismissed.has(`event:${e.id}`)) ?? null;

  // ID видимых сейчас карточек — для массового удаления через hold-to-confirm.
  const visibleIds = root === 'action'
    ? actionItems.map(alertKey)
    : (list ?? []).map((e) => `event:${e.id}`);

  // Запускаем анимацию сворачивания всех видимых карточек и через 320 мс
  // переводим их в dismissed (тогда они исчезают из DOM и больше не возвращаются).
  const clearAll = () => {
    if (visibleIds.length === 0) return;
    setCollapsing(new Set(visibleIds));
    setClearOpen(false);
    window.setTimeout(() => {
      setDismissed((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.add(id));
        return next;
      });
      setCollapsing(new Set());
    }, 320);
  };

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title={
          <span className="flex items-center justify-center gap-2">
            <Bell size={16} />
            <span>Уведомления</span>
          </span>
        }
        back
        right={
          visibleIds.length > 0 ? (
            <button
              type="button"
              onClick={() => setClearOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-ink-muted)] active:bg-black/10"
              aria-label="Очистить все"
            >
              <Trash2 size={16} />
            </button>
          ) : undefined
        }
      />

      <div className="flex-shrink-0 px-4 pt-2">
        <div className="flex gap-1 rounded-xl bg-[var(--color-chip)] p-1">
          <TabButton active={root === 'events'} onClick={() => setRoot('events')}>События</TabButton>
          <TabButton active={root === 'action'} onClick={() => setRoot('action')}>
            Требует действия
            {actionCount > 0 && (
              <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-danger)] px-1 text-[10px] font-bold text-white">
                {actionCount}
              </span>
            )}
          </TabButton>
        </div>
        {root === 'events' && (
          <div className="mt-2 flex gap-1.5">
            <Pill active={sub === 'system'} onClick={() => setSub('system')}>Система</Pill>
            <Pill active={sub === 'mine'} onClick={() => setSub('mine')}>Мои действия</Pill>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 pt-3 space-y-2">
        {root === 'action' && (
          <>
            {alertsLoading && <Loading />}
            {!alertsLoading && actionItems.length === 0 && (
              <Empty>Нет открытых задач — всё в порядке.</Empty>
            )}
            {actionItems.map((a, i) => {
              const id = alertKey(a);
              return (
                <CardWrap key={`${a.type}-${a.clientId ?? 'sum'}-${i}`} collapsing={collapsing.has(id)}>
                  <ActionCard alert={a} onDismiss={() => dismiss(id)} />
                </CardWrap>
              );
            })}
          </>
        )}
        {root === 'events' && (
          <>
            {eventsLoading && <Loading />}
            {!eventsLoading && list && list.length === 0 && (
              <Empty>Пока нет событий за последние две недели.</Empty>
            )}
            {list?.map((e) => {
              const id = `event:${e.id}`;
              return (
                <CardWrap key={e.id} collapsing={collapsing.has(id)}>
                  <EventCard event={e} onDismiss={() => dismiss(id)} />
                </CardWrap>
              );
            })}
          </>
        )}
      </div>

      {clearOpen && (
        <ClearAllOverlay
          onCancel={() => setClearOpen(false)}
          onConfirm={clearAll}
        />
      )}
    </div>
  );
}

// Обёртка вокруг карточки — позволяет применить анимацию сворачивания
// (max-height + opacity) при массовом удалении.
function CardWrap({ collapsing, children }: { collapsing: boolean; children: React.ReactNode }) {
  return <div className={collapsing ? 'card-collapse' : ''}>{children}</div>;
}

// Модальное окно «Очистить все»: hold-to-confirm.
// Удерживай большой крестик 3 секунды — заполняется круговой прогресс,
// потом крестик меняется на галочку и через 600 мс вызывается onConfirm.
function ClearAllOverlay({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const [pressing, setPressing] = useState(false);
  const [done, setDone] = useState(false);
  const timerRef = useRef<number | null>(null);
  const HOLD_MS = 3000;

  const start = () => {
    if (done) return;
    setPressing(true);
    timerRef.current = window.setTimeout(() => {
      setDone(true);
      // Дать пользователю увидеть галочку перед закрытием.
      window.setTimeout(onConfirm, 600);
    }, HOLD_MS);
  };
  const stop = () => {
    if (done) return;
    setPressing(false);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };
  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/60" onClick={done ? undefined : onCancel} />
      <div className="relative w-full max-w-[320px] rounded-3xl bg-[var(--color-card)] p-6 text-center">
        <h3 className="text-[16px] font-bold">Очистить все уведомления?</h3>
        <p className="mt-1.5 text-[12px] text-[var(--color-ink-muted)]">
          {done
            ? 'Готово'
            : 'Удерживайте крестик 3 секунды, чтобы подтвердить — действие нельзя отменить.'}
        </p>
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onPointerDown={start}
            onPointerUp={stop}
            onPointerLeave={stop}
            onPointerCancel={stop}
            className="relative flex h-24 w-24 items-center justify-center rounded-full bg-[var(--color-card-elevated)] active:scale-95 transition-transform"
            aria-label={done ? 'Удалено' : 'Удерживайте для подтверждения'}
          >
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 80 80" width={96} height={96}>
              <circle cx="40" cy="40" r="30" stroke="var(--color-line)" strokeWidth="3" fill="none" />
              <circle
                cx="40" cy="40" r="30"
                stroke={done ? 'var(--color-accent)' : 'var(--color-danger)'}
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                style={{
                  strokeDasharray: 188.5,
                  strokeDashoffset: done ? 0 : 188.5,
                  animation: pressing && !done ? `hold-progress ${HOLD_MS}ms linear forwards` : undefined,
                }}
              />
            </svg>
            {done
              ? <Check size={30} strokeWidth={2.4} style={{ color: 'var(--color-accent)' }} />
              : <X size={30} strokeWidth={2.4} style={{ color: 'var(--color-ink)' }} />
            }
          </button>
        </div>
        <div className="mt-4 text-[11px] uppercase tracking-wider text-[var(--color-ink-mutedXL)]">
          {done ? 'События очищены' : pressing ? 'Удерживайте…' : 'Нажмите и удерживайте'}
        </div>
        {!done && (
          <button
            type="button"
            onClick={onCancel}
            className="mt-5 text-[13px] text-[var(--color-ink-muted)]"
          >
            Отмена
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Tabs ───────────────────────────────────────────────────────────────────

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-[13px] font-semibold transition ${
        active ? 'bg-[var(--color-card)] text-[var(--color-ink)]' : 'text-[var(--color-ink-muted)]'
      }`}
    >
      {children}
    </button>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full px-3 py-1.5 text-[12px] font-semibold transition"
      style={{
        background: active ? 'var(--color-accent)' : 'var(--color-chip)',
        color: active ? 'var(--color-accent-on)' : 'var(--color-ink-muted)',
      }}
    >
      {children}
    </button>
  );
}

function Loading() {
  return <div className="py-6 text-center text-[13px] text-[var(--color-ink-muted)]">Загрузка…</div>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-[var(--color-card)] p-6 text-center text-[13px] text-[var(--color-ink-muted)]">
      {children}
    </div>
  );
}

// ─── Event card ─────────────────────────────────────────────────────────────

function EventCard({ event, onDismiss }: { event: TrainerEvent; onDismiss: () => void }) {
  const navigate = useNavigate();
  const palette = eventPalette(event.type);
  const Icon = palette.icon;
  return (
    <div className="relative flex items-start gap-3 rounded-2xl bg-[var(--color-card)] p-3 pr-9">
      <button
        type="button"
        aria-label="Удалить"
        onClick={(e) => { e.stopPropagation(); onDismiss(); }}
        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-[var(--color-ink-mutedXL)] active:bg-black/10"
      >
        <X size={14} />
      </button>
      <button
        type="button"
        onClick={() => event.clientId && navigate(`/trainer/clients/${event.clientId}`)}
        disabled={!event.clientId}
        className="flex min-w-0 flex-1 items-start gap-3 text-left disabled:cursor-default"
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center"
          style={{ color: palette.color }}
        >
          <Icon size={20} strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2 pr-4">
            <span className="truncate text-[14px] font-semibold">
              {event.clientName ?? 'Система'}
            </span>
            <span className="shrink-0 text-[11px] tabular-nums text-[var(--color-ink-mutedXL)]">
              {formatRelative(event.timestamp)}
            </span>
          </div>
          <div className="mt-0.5 text-[13px] text-[var(--color-ink-muted)]">{event.message}</div>
        </div>
      </button>
    </div>
  );
}

function eventPalette(type: TrainerEvent['type']): { icon: typeof Bell; color: string; bg: string } {
  switch (type) {
    case 'birthday':
      return { icon: Cake, color: '#c54a8a', bg: 'rgba(197,74,138,0.12)' };
    case 'session_completed':
      return { icon: CheckCircle2, color: 'var(--color-accent)', bg: 'rgba(212,255,61,0.14)' };
    case 'session_approved':
      return { icon: CheckCircle2, color: '#2f6fed', bg: 'rgba(47,111,237,0.12)' };
    case 'pr':
      return { icon: Trophy, color: '#d9a32b', bg: 'rgba(217,163,43,0.14)' };
    case 'session_added':
      return { icon: CalendarPlus, color: 'var(--color-ink)', bg: 'var(--color-card-elevated)' };
    case 'package_added':
      return { icon: CreditCard, color: 'var(--color-ink)', bg: 'var(--color-card-elevated)' };
    default:
      return { icon: Bell, color: 'var(--color-ink-muted)', bg: 'var(--color-chip)' };
  }
}

function formatRelative(iso: string): string {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return '';
  const diffMs = Date.now() - ts;
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return 'только что';
  if (min < 60) return `${min} мин`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ч`;
  const day = Math.floor(hr / 24);
  if (day === 1) return 'вчера';
  if (day < 7) return `${day} дн`;
  const d = new Date(iso);
  const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

// ─── Action card (alerts: danger/warn) ──────────────────────────────────────

function ActionCard({ alert, onDismiss }: { alert: TrainerAlert; onDismiss: () => void }) {
  const navigate = useNavigate();
  const isDanger = alert.severity === 'danger';
  // Цвет (красный / янтарный) применяем ТОЛЬКО к иконке-плашке.
  // Заголовок и CTA — нейтральные, чтобы не «кричать» в ленте.
  const accent = isDanger ? 'var(--color-danger)' : '#d9912b';
  const accentBg = isDanger ? 'rgba(200,57,44,0.12)' : 'rgba(217,145,43,0.12)';
  const headline = alertHeadline(alert);
  const Icon = alertIcon(alert);
  return (
    <div className="relative flex items-start gap-3 rounded-2xl bg-[var(--color-card)] p-3 pr-9">
      <button
        type="button"
        aria-label="Удалить"
        onClick={(e) => { e.stopPropagation(); onDismiss(); }}
        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-[var(--color-ink-mutedXL)] active:bg-black/10"
      >
        <X size={14} />
      </button>
      <button
        type="button"
        onClick={() => alert.clientId && navigate(`/trainer/clients/${alert.clientId}`)}
        disabled={!alert.clientId}
        className="flex min-w-0 flex-1 items-start gap-3 text-left disabled:cursor-default"
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center"
          style={{ color: accent }}
        >
          <Icon size={20} />
        </span>
        <div className="min-w-0 flex-1 space-y-0.5 pr-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-ink-mutedXL)]">{headline}</div>
          {alert.clientName && <div className="text-[14px] font-semibold">{alert.clientName}</div>}
          <div className="text-[13px] text-[var(--color-ink-muted)]">{alert.message}</div>
          {alert.clientId && (
            <div className="mt-1 inline-flex items-center gap-1 text-[12px] font-medium text-[var(--color-ink-muted)]">
              Открыть карточку <ChevronRight size={12} />
            </div>
          )}
        </div>
      </button>
    </div>
  );
}

function alertHeadline(alert: TrainerAlert): string {
  switch (alert.type) {
    case 'unpaid': return 'Требуется оплата';
    case 'no_upcoming': return 'Нет занятий на неделю';
    case 'low_balance': return 'Скоро закончится пакет';
    case 'online_today': return 'Онлайн-тренировки сегодня';
    case 'birthday': return 'День рождения';
  }
}

function alertIcon(alert: TrainerAlert) {
  switch (alert.type) {
    case 'unpaid':
    case 'low_balance':
      return Wallet;
    case 'no_upcoming':
      return Dumbbell;
    default:
      return AlertTriangle;
  }
}

// Гарантируем, что компонент Pencil тоже импортируется (используется в типе LucideIcon в палитре).
void Pencil;
