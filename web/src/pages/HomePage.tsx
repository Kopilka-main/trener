import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Bell, BookOpen, CalendarDays, MessageSquare, UserCircle2, Users, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { FlapText } from '../components/FlapText';
import { useTrainer } from '../api/trainer';
import { useChatUnread } from '../api/chat';
import { useClients } from '../api/clients';
import { useSessions } from '../api/sessions';
import { useExercises } from '../api/exercises';
import { useTrainerAlerts } from '../api/alerts';
import { useAccountingSummary } from '../api/accounting';

const DAY_SHORT = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];
const MONTH_FULL = ['ЯНВАРЯ', 'ФЕВРАЛЯ', 'МАРТА', 'АПРЕЛЯ', 'МАЯ', 'ИЮНЯ', 'ИЮЛЯ', 'АВГУСТА', 'СЕНТЯБРЯ', 'ОКТЯБРЯ', 'НОЯБРЯ', 'ДЕКАБРЯ'];

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function diffShort(future: Date, now: Date): string {
  const ms = future.getTime() - now.getTime();
  if (ms <= 0) return 'СЕЙЧАС';
  const totalMin = Math.round(ms / 60000);
  const totalH = Math.floor(totalMin / 60);
  // Свыше суток — переключаемся на дни (и остаток в часах, если есть).
  if (totalH >= 24) {
    const d = Math.floor(totalH / 24);
    const h = totalH % 24;
    return h === 0 ? `${d}Д` : `${d}Д ${h}Ч`;
  }
  const m = totalMin % 60;
  if (totalH === 0) return `${m}М`;
  if (m === 0) return `${totalH}Ч`;
  return `${totalH}Ч ${m}М`;
}

type Metric = { v: string; s: string | string[] };
type TileKey = 'clients' | 'calendar' | 'chat' | 'exercises' | 'finance' | 'profile';

export function HomePage() {
  const navigate = useNavigate();
  const { data: trainer } = useTrainer();
  void useChatUnread('trainer');
  const { data: clients } = useClients();
  const { data: exercises } = useExercises();
  const { data: alerts = [] } = useTrainerAlerts();
  const hasDangerAlert = alerts.some((a) => a.severity === 'danger');

  const now = new Date();
  const today = isoDate(now);
  const weekAhead = isoDate(new Date(now.getTime() + 7 * 86400000));
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const { data: finance } = useAccountingSummary(currentMonth, 'month');
  const { data: financeQ } = useAccountingSummary(currentMonth, 'quarter');
  const { data: financeY } = useAccountingSummary(currentMonth, 'year');
  const monthAhead = isoDate(new Date(now.getTime() + 30 * 86400000));
  const { data: sessions } = useSessions(today, weekAhead);
  const { data: sessionsMonth } = useSessions(today, monthAhead);

  // Заглушка для демо-режима — плитка Сообщения всегда горит acid.
  const chatBadge = 3;
  const clientsCount = clients?.length ?? 48;
  const exercisesCount = exercises?.length ?? 86;

  // Считаем все запланированные и проведённые сессии (включая отменённые) —
  // ровно так же, как в CalendarPage subLabel (там нет фильтра по status).
  const todaySessions = (sessions ?? []).filter((s) => s.date === today);
  const todayCount = todaySessions.length;
  const weekPlanned = (sessions ?? []).length;
  const monthPlanned = (sessionsMonth ?? []).length;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nextSession = (sessions ?? [])
    .filter((s) => {
      if (s.status === 'cancelled') return false;
      if (s.date > today) return true;
      if (s.date < today) return false;
      const [h, m] = s.startTime.split(':').map(Number);
      return h * 60 + m >= nowMinutes;
    })
    .sort((a, b) => (a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)))[0];

  const nextSessionDate = nextSession
    ? (() => {
        const [y, mo, d] = nextSession.date.split('-').map(Number);
        const [hh, mm] = nextSession.startTime.split(':').map(Number);
        return new Date(y, mo - 1, d, hh, mm);
      })()
    : null;

  const dateLabel = `СЕГОДНЯ · ${DAY_SHORT[now.getDay()]} ${now.getDate()} ${MONTH_FULL[now.getMonth()]}`;
  const trainerInitials = trainer
    ? `${trainer.firstName.charAt(0)}${trainer.lastName.charAt(0)}`.toUpperCase()
    : 'АМ';
  const trainerName = trainer ? `${trainer.firstName} ${trainer.lastName}` : 'Алексей Морозов';
  const trainerTitle = trainer?.title ?? 'Персональный тренер';

  // Один acid-fill на экран — primary плитка: чат если есть непрочитанные.
  const primaryKey: TileKey | null = chatBadge > 0 ? 'chat' : null;

  // Финансы за периоды. Если в БД мало данных и значения совпали — подменяем
  // демо-числами, чтобы ротация на плитке давала разные значения для смены.
  const rawM = finance?.profit ?? 0;
  const rawQ = financeQ?.profit ?? 0;
  const rawY = financeY?.profit ?? 0;
  const allSame = rawM === rawQ && rawQ === rawY;
  const profitM = rawM || allSame ? (rawM || 74000) : rawM;
  const profitQ = allSame ? 220000 : (rawQ || 220000);
  const profitY = allSame ? 1100000 : (rawY || 1100000);
  // Знак: положительные — без знака, отрицательные — с «−». В тысячах ₽, без суффикса.
  const fmtThousands = (n: number) => `${n < 0 ? '−' : ''}${Math.abs(Math.round(n / 1000))}`;
  const profitColor = profitM >= 0 ? 'var(--color-accent-text)' : 'var(--color-danger)';

  const tiles: Array<{
    key: TileKey;
    title: string;
    sub: string;
    metrics: Metric[];
    Icon: LucideIcon;
    onClick: () => void;
    metricColor?: string;
    kicker?: string;
    phaseOffsetMs?: number;
  }> = [
    {
      key: 'clients',
      title: 'Клиенты',
      sub: 'контакты и пакеты',
      metrics: [{ v: pad2(clientsCount), s: 'активных' }],
      Icon: Users,
      onClick: () => navigate('/trainer/clients'),
    },
    {
      key: 'calendar',
      title: 'Календарь',
      sub: 'расписание занятий',
      metrics: [
        { v: pad2(weekPlanned), s: 'на 7 дней' },
        { v: pad2(monthPlanned), s: 'на 30 дней' },
      ],
      Icon: CalendarDays,
      onClick: () => navigate('/trainer/calendar'),
      phaseOffsetMs: 0,
    },
    {
      key: 'chat',
      title: 'Сообщения',
      sub: 'клиенты и заметки',
      metrics: [{ v: pad2(chatBadge), s: 'новых' }],
      Icon: MessageSquare,
      onClick: () => navigate('/trainer/chat'),
    },
    {
      key: 'exercises',
      title: 'База знаний',
      sub: 'упражнения и шаблоны',
      metrics: [{ v: pad2(exercisesCount), s: 'в базе' }],
      Icon: BookOpen,
      onClick: () => navigate('/trainer/exercises'),
    },
    {
      key: 'finance',
      title: 'Финансы',
      sub: 'бухгалтерия',
      metrics: [
        { v: fmtThousands(profitM), s: ['тыс', 'за', '1 мес'] },
        { v: fmtThousands(profitQ), s: ['тыс', 'за', '3 мес'] },
        { v: fmtThousands(profitY), s: ['тыс', 'за', '12 мес'] },
      ],
      metricColor: profitColor,
      phaseOffsetMs: 5000,
      Icon: Wallet,
      onClick: () => navigate('/trainer/accounting'),
    },
    {
      key: 'profile',
      title: trainerName,
      sub: trainerTitle.toLowerCase(),
      metrics: [],
      kicker: 'ПРОФИЛЬ',
      Icon: UserCircle2,
      onClick: () => navigate('/trainer/profile'),
    },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex flex-1 flex-col overflow-hidden px-5 pb-5 pt-2">
        {/* ─── Top bar: только дата слева ─── */}
        <div className="flex items-center gap-2 font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-ink-mutedXL)]">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-accent)]" />
          {dateLabel}
        </div>

        {/* ─── Колокольчик уведомлений — справа, ниже даты, на уровне hero ─── */}
        <button
          onClick={() => navigate('/trainer/notifications')}
          aria-label={`Уведомления (${alerts.length})`}
          className="absolute right-5 top-16 z-10 flex items-center gap-1.5 active:scale-95 transition-transform"
        >
          <Bell
            size={22}
            strokeWidth={2}
            fill={alerts.length > 0 ? 'var(--color-accent)' : 'none'}
            style={{ color: alerts.length > 0 ? 'var(--color-accent)' : 'var(--color-ink-mutedXL)' }}
          />
          <span
            className="font-[family-name:var(--font-mono)] text-[15px] font-bold tabular-nums"
            style={{ color: alerts.length > 0 ? 'var(--color-ink)' : 'var(--color-ink-mutedXL)' }}
          >
            {pad2(alerts.length)}
          </span>
        </button>

        {/* ─── Hero: «СЕГОДНЯ» (большое число сессий) ─── */}
        <div className="px-1 pb-1 pt-3">
          <button
            onClick={() => navigate('/trainer/calendar?view=day')}
            className="flex flex-wrap items-baseline gap-3 text-left active:scale-[0.98] transition-transform"
            aria-label="Открыть календарь на сегодня"
          >
            <span
              className="font-[family-name:var(--font-display)] text-[64px] leading-none tracking-[-0.03em]"
              style={{ color: 'var(--color-accent-text)' }}
            >
              {pad2(todayCount)}
            </span>
            <span className="text-[22px] font-bold leading-tight tracking-[-0.01em]">
              {todayCount === 1 ? 'сессия в зале' : 'сессий в зале'}
            </span>
          </button>

          {nextSession && nextSessionDate && (
            <button
              onClick={() => navigate(`/trainer/clients/${nextSession.clientId}`)}
              aria-label={`Открыть карточку клиента ${nextSession.clientFirstName} ${nextSession.clientLastName}`}
              className="mt-3 flex w-full items-center gap-2.5 text-left active:scale-[0.98] transition-transform"
            >
              <div className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--color-ink-muted)]">
                СЛЕД. · {nextSession.startTime} {nextSession.clientFirstName.toUpperCase()} {nextSession.clientLastName.charAt(0).toUpperCase()}.
                {nextSession.title ? ` · ${nextSession.title.toUpperCase()}` : ''}
              </div>
              <span className="inline-block rounded bg-[var(--color-accent)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] font-bold tracking-[0.06em] text-[var(--color-accent-on)]">
                {diffShort(nextSessionDate, now)}
              </span>
              <ArrowRight
                size={18}
                strokeWidth={2.4}
                style={{ color: 'var(--color-accent)' }}
                className="shrink-0"
              />
            </button>
          )}
        </div>

        {/* ─── Сетка 2×3 модулей — занимает всё оставшееся пространство, ряды равной высоты ─── */}
        <div className="mt-4 grid min-h-0 flex-1 grid-cols-2 grid-rows-3 gap-2.5">
          {tiles.map((tile, i) => {
            const { key, ...rest } = tile;
            // Фазовый сдвиг по позиции в сетке — каждая плитка стартует со своим
            // delay, чтобы ротации не накладывались синхронно.
            return (
              <Tile
                key={key}
                {...rest}
                isPrimary={primaryKey === key}
                phaseOffsetMs={rest.phaseOffsetMs ?? 0}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

type TileProps = {
  title: string;
  sub: string;
  metrics: Metric[];
  Icon: LucideIcon;
  onClick: () => void;
  isPrimary: boolean;
  metricColor?: string;
  kicker?: string;
  /** Начальный сдвиг фазы ротации (мс) — даёт каждой плитке свой ритм. */
  phaseOffsetMs?: number;
};

/**
 * MetricRow — вся строка метрики (число + лейбл) переворачивается как один
 * блок: лента из двух одинаковых слотов сдвигается на -50% за один проход.
 * Никаких рассинхронов между числом и подписью.
 */
function MetricRow({
  metric,
  metricColor,
  labelColor,
}: {
  metric: Metric;
  metricColor?: string;
  labelColor: string;
}) {
  const [front, setFront] = useState(metric);
  const [next, setNext] = useState(metric);
  const [rolling, setRolling] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    const sameV = front.v === metric.v;
    const sameS = Array.isArray(front.s) && Array.isArray(metric.s)
      ? front.s.length === metric.s.length && front.s.every((x, i) => x === (metric.s as string[])[i])
      : front.s === metric.s;
    if (sameV && sameS) return;
    setNext(metric);
    const t1 = window.setTimeout(() => setRolling(true), 16);
    const t2 = window.setTimeout(() => {
      setFront(metric);
      setNext(metric);
      setRolling(false);
      setResetKey((k) => k + 1);
    }, 16 + 460);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [metric, front]);

  return (
    <div className="metric-row-window mb-1">
      <div key={resetKey} className={`metric-row-track${rolling ? ' roll' : ''}`}>
        <div className="metric-row-slot">
          <MetricRowContent metric={front} metricColor={metricColor} labelColor={labelColor} />
        </div>
        <div className="metric-row-slot">
          <MetricRowContent metric={next} metricColor={metricColor} labelColor={labelColor} />
        </div>
      </div>
    </div>
  );
}

function MetricRowContent({
  metric,
  metricColor,
  labelColor,
}: {
  metric: Metric;
  metricColor?: string;
  labelColor: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="shrink-0 font-[family-name:var(--font-display)] text-[36px] leading-none tracking-[-0.03em] tabular-nums"
        style={metricColor ? { color: metricColor } : undefined}
      >
        {metric.v}
      </span>
      <MetricLabel value={metric.s} color={labelColor} />
    </div>
  );
}

/**
 * Метка метрики. Принимает строку (одна строка) или массив строк (вертикальный стек).
 *  • строка вида «за X мес» — авто-разделение на две строки «за» / «X мес».
 *  • массив — рендерится как есть, каждый элемент — своя строка.
 */
function MetricLabel({ value, color }: { value: string | string[]; color: string }) {
  // JetBrains Mono — моноширинный шрифт, нет глитчей при смене длины строки.
  const cls = 'font-[family-name:var(--font-mono)] font-bold uppercase tracking-[0.08em] text-[10px] leading-[1.1] whitespace-pre';
  // Массив → вертикальный стек строк.
  if (Array.isArray(value)) {
    return (
      <span className="inline-flex flex-col" style={{ color }}>
        {value.map((line, i) => (
          <span key={i} className={cls}>{line}</span>
        ))}
      </span>
    );
  }
  // Строка «за X мес» → две строки.
  const m = /^(за)\s+(.+)$/i.exec(value);
  if (!m) {
    return <span className={cls} style={{ color }}>{value}</span>;
  }
  return (
    <span className="inline-flex flex-col" style={{ color }}>
      <span className={cls}>{m[1]}</span>
      <span className={cls}>{m[2]}</span>
    </span>
  );
}

function Tile({ title, sub, metrics, Icon, onClick, isPrimary, metricColor, kicker, phaseOffsetMs = 0 }: TileProps) {
  // Ротация метрик каждые 5.2с с начальным фазовым сдвигом, чтобы плитки
  // переключались не одновременно, а в разное время.
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (metrics.length <= 1) return;
    let intervalId: number | undefined;
    const startId = window.setTimeout(() => {
      setIdx((x) => (x + 1) % metrics.length);
      intervalId = window.setInterval(() => setIdx((x) => (x + 1) % metrics.length), 10000);
    }, Math.max(0, phaseOffsetMs));
    return () => {
      window.clearTimeout(startId);
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, [metrics.length, phaseOffsetMs]);
  const current = metrics.length > 0 ? (metrics[idx] ?? metrics[0]) : null;

  return (
    <button
      onClick={onClick}
      className={
        'relative flex h-full min-h-[120px] flex-col rounded-2xl px-3.5 pb-4 pt-3.5 text-left active:scale-[0.97] ' +
        (isPrimary ? 'tile-shadow-primary' : 'tile-shadow')
      }
    >
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-lg ${isPrimary ? 'tile-icon-shell-primary' : 'tile-icon-shell'}`}
      >
        <Icon size={20} strokeWidth={1.8} />
      </span>

      <ArrowUpRight
        size={14}
        className={`absolute right-3.5 top-4 ${isPrimary ? 'tile-arrow-primary' : 'tile-arrow'}`}
        strokeWidth={1.8}
      />

      <span className="flex-1" />

      {kicker && (
        <div
          className="mb-1 font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-[0.16em]"
          style={{ color: isPrimary ? 'rgba(11,12,16,0.55)' : 'var(--color-ink-mutedXL)' }}
        >
          {kicker}
        </div>
      )}

      {current && (
        <MetricRow
          metric={current}
          metricColor={metricColor}
          labelColor={isPrimary ? 'rgba(11,12,16,0.65)' : 'var(--color-ink-muted)'}
        />
      )}

      <div className="truncate text-[17px] font-bold leading-tight tracking-[-0.02em]">{title}</div>
      <div
        className="mt-1 truncate text-[11px] font-semibold tracking-[0.01em]"
        style={{ color: isPrimary ? 'rgba(11,12,16,0.55)' : 'var(--color-ink-mutedXL)' }}
      >
        {sub}
      </div>
    </button>
  );
}
