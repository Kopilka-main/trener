import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, BookOpen, CalendarDays, ChevronRight, MessageSquare, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}М`;
  if (m === 0) return `${h}Ч`;
  return `${h}Ч ${m}М`;
}

type Metric = { v: string; s: string };

export function HomePage() {
  const navigate = useNavigate();
  const { data: trainer } = useTrainer();
  void useChatUnread('trainer'); // запрос остаётся (для invalidation), значение не используем — chatBadge захардкожен
  const { data: clients } = useClients();
  const { data: exercises } = useExercises();
  const { data: alerts = [] } = useTrainerAlerts();
  const hasDangerAlert = alerts.some((a) => a.severity === 'danger');

  const now = new Date();
  const today = isoDate(now);
  const weekAhead = isoDate(new Date(now.getTime() + 7 * 86400000));
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const { data: finance } = useAccountingSummary(currentMonth, 'month');
  const monthAhead = isoDate(new Date(now.getTime() + 30 * 86400000));
  const { data: sessions } = useSessions(today, weekAhead);
  const { data: sessionsMonth } = useSessions(today, monthAhead);

  // Заглушка для демо-режима — плитка Чат всегда горит acid.
  const chatBadge = 3;
  const clientsCount = clients?.length ?? 48;
  const exercisesCount = exercises?.length ?? 86;

  const todaySessions = (sessions ?? []).filter((s) => s.date === today && s.status !== 'cancelled');
  const todayCount = todaySessions.length || 6;
  const weekPlanned = (sessions ?? []).filter((s) => s.status !== 'cancelled').length || 10;
  const monthPlanned = (sessionsMonth ?? []).filter((s) => s.status !== 'cancelled').length || 32;

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

  // Один acid-fill на экран — primary тайл: чат если есть непрочитанные.
  const primaryKey: 'chat' | null = chatBadge > 0 ? 'chat' : null;

  // Порядок: [Клиенты][Календарь] / [Сообщения][База знаний]
  const tiles: Array<{
    key: 'clients' | 'calendar' | 'chat' | 'exercises';
    title: string;
    sub: string;
    metrics: Metric[];
    Icon: LucideIcon;
    onClick: () => void;
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
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col overflow-y-auto px-5 pb-7 pt-1">
        {/* ─── A5: крупная шапка-карточка тренера с финансом ─── */}
        <button
          onClick={() => navigate('/trainer/profile')}
          className="flex w-full items-center gap-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-card)] p-4 text-left active:scale-[0.99] transition-transform"
        >
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-display)] text-[20px]"
            style={{ background: 'var(--color-amber, #c9974b)', color: 'var(--color-accent-on)' }}
          >
            {trainerInitials}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[17px] font-bold leading-tight tracking-[-0.01em]">{trainerName}</span>
            <span className="mt-0.5 block truncate text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-ink-muted)]">
              {trainerTitle}
            </span>
            {finance && (
              <span className="mt-2 flex items-baseline gap-1.5 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.08em]">
                <span className="text-[var(--color-ink-mutedXL)]">МЕСЯЦ:</span>
                <span className="font-bold" style={{ color: finance.profit >= 0 ? 'var(--color-accent-text)' : 'var(--color-danger)' }}>
                  {finance.profit >= 0 ? '+' : ''}{finance.profit.toLocaleString('ru-RU')}&nbsp;₽
                </span>
              </span>
            )}
          </span>
          <ChevronRight size={14} className="shrink-0 text-[var(--color-ink-mutedXL)]" />
        </button>

        {/* ─── A4: компактный блок финансов (доходы / расходы) ─── */}
        {finance && (
          <button
            onClick={() => navigate('/trainer/accounting')}
            className="mt-3 flex items-stretch gap-2"
            aria-label="Бухгалтерия"
          >
            <div className="flex-1 rounded-2xl border border-[var(--color-line)] bg-[var(--color-card)] px-3 py-2.5 text-left">
              <div className="font-[family-name:var(--font-mono)] text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--color-ink-mutedXL)]">
                ДОХОД
              </div>
              <div className="mt-0.5 font-[family-name:var(--font-display)] text-[20px] leading-none tabular-nums" style={{ color: 'var(--color-accent-text)' }}>
                {Math.round(finance.income / 1000)}<span className="text-[12px] font-bold text-[var(--color-ink-muted)]">K</span>
              </div>
            </div>
            <div className="flex-1 rounded-2xl border border-[var(--color-line)] bg-[var(--color-card)] px-3 py-2.5 text-left">
              <div className="font-[family-name:var(--font-mono)] text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--color-ink-mutedXL)]">
                РАСХОД
              </div>
              <div className="mt-0.5 font-[family-name:var(--font-display)] text-[20px] leading-none tabular-nums">
                {Math.round(finance.expenses / 1000)}<span className="text-[12px] font-bold text-[var(--color-ink-muted)]">K</span>
              </div>
            </div>
            <div className="flex-1 rounded-2xl border border-[var(--color-line)] bg-[var(--color-card)] px-3 py-2.5 text-left">
              <div className="font-[family-name:var(--font-mono)] text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--color-ink-mutedXL)]">
                ПРИБЫЛЬ
              </div>
              <div className="mt-0.5 font-[family-name:var(--font-display)] text-[20px] leading-none tabular-nums" style={{ color: finance.profit >= 0 ? 'var(--color-ink)' : 'var(--color-danger)' }}>
                {Math.round(finance.profit / 1000)}<span className="text-[12px] font-bold text-[var(--color-ink-muted)]">K</span>
              </div>
            </div>
          </button>
        )}

        {/* ─── Hero: «СЕГОДНЯ» ─── */}
        <div className="px-1 pb-1 pt-6">
          <div className="flex items-center gap-2 font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-ink-mutedXL)]">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-accent)]" />
            {dateLabel}
          </div>
          <div className="mt-2.5 flex flex-wrap items-baseline gap-3">
            <span
              className="font-[family-name:var(--font-display)] text-[64px] leading-none tracking-[-0.03em]"
              style={{ color: 'var(--color-accent-text)' }}
            >
              {pad2(todayCount)}
            </span>
            <span className="text-[22px] font-bold leading-tight tracking-[-0.01em]">
              {todayCount === 1 ? 'сессия в зале' : 'сессий в зале'}
            </span>
          </div>

          {nextSession && nextSessionDate && (
            <div className="mt-3 flex items-center gap-2.5">
              <div className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--color-ink-muted)]">
                СЛЕД. · {nextSession.startTime} {nextSession.clientFirstName.toUpperCase()} {nextSession.clientLastName.charAt(0).toUpperCase()}.
                {nextSession.title ? ` · ${nextSession.title.toUpperCase()}` : ''}
              </div>
              <span className="inline-block rounded bg-[var(--color-accent)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] font-bold tracking-[0.06em] text-[var(--color-accent-on)]">
                {diffShort(nextSessionDate, now)}
              </span>
            </div>
          )}
        </div>

        {/* ─── Баннер уведомлений ─── */}
        {alerts.length > 0 && (
          <button
            onClick={() => navigate('/trainer/notifications')}
            className="mt-4 flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left active:scale-[0.99] transition-transform"
            style={{
              borderColor: hasDangerAlert ? 'var(--color-danger)' : 'var(--color-amber)',
              background: hasDangerAlert ? 'var(--color-danger-soft)' : 'rgba(232, 178, 85, 0.12)',
            }}
          >
            <AlertTriangle
              size={18}
              className="shrink-0"
              style={{ color: hasDangerAlert ? 'var(--color-danger)' : 'var(--color-amber)' }}
            />
            <div className="min-w-0 flex-1">
              <div className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: hasDangerAlert ? 'var(--color-danger)' : 'var(--color-amber)' }}>
                {hasDangerAlert ? 'СРОЧНО · ' : 'УВЕДОМЛЕНИЯ · '}
                {alerts.length} {alerts.length === 1 ? 'событие' : alerts.length < 5 ? 'события' : 'событий'}
              </div>
              <div className="mt-0.5 truncate text-[13px] font-semibold">
                {alerts[0].message}
              </div>
            </div>
            <ChevronRight size={14} className="shrink-0 opacity-60" />
          </button>
        )}

        {/* ─── Сетка 2×2 модулей — растёт на всё свободное место ─── */}
        <div className="mt-4 grid flex-1 grid-cols-2 gap-2.5">
          {tiles.map((tile) => {
            const { key, ...rest } = tile;
            return <Tile key={key} {...rest} isPrimary={primaryKey === key} />;
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
};

function Tile({ title, sub, metrics, Icon, onClick, isPrimary }: TileProps) {
  // Ротация метрик каждые 3.6с. Для одного значения — статика.
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (metrics.length <= 1) return;
    const t = setInterval(() => setIdx((x) => (x + 1) % metrics.length), 3600);
    return () => clearInterval(t);
  }, [metrics.length]);
  const current = metrics[idx] ?? metrics[0];

  return (
    <button
      onClick={onClick}
      className={
        'relative flex h-full min-h-[168px] flex-col rounded-2xl px-3.5 pb-4 pt-3.5 text-left active:scale-[0.97] transition-transform ' +
        (isPrimary
          ? 'bg-[var(--color-accent)] text-[var(--color-accent-on)]'
          : 'border border-[var(--color-line)] bg-[var(--color-card)]')
      }
    >
      {/* icon-square */}
      <span
        className="flex h-10 w-10 items-center justify-center rounded-lg"
        style={
          isPrimary
            ? { background: 'rgba(11,12,16,0.12)' }
            : { background: 'var(--color-card-elevated)', border: '1px solid var(--color-line)' }
        }
      >
        <Icon size={20} strokeWidth={1.8} />
      </span>

      {/* arrow */}
      <ArrowUpRight
        size={14}
        className={`absolute right-3.5 top-4 ${isPrimary ? 'opacity-70' : 'opacity-40'}`}
        strokeWidth={1.8}
      />

      <span className="flex-1" />

      {/* mono number row — key={current.v + current.s} → re-mount → CSS-анимация */}
      <div key={current.v + current.s} className="metric-anim mb-1 flex items-baseline gap-1 overflow-hidden">
        <span className="font-[family-name:var(--font-display)] text-[36px] leading-none tracking-[-0.03em] tabular-nums">
          {current.v}
        </span>
        <span
          className="text-[10px] font-bold uppercase tracking-[0.08em]"
          style={{ color: isPrimary ? 'rgba(11,12,16,0.65)' : 'var(--color-ink-muted)' }}
        >
          {current.s}
        </span>
      </div>

      {/* title */}
      <div className="text-[17px] font-bold leading-none tracking-[-0.02em]">{title}</div>
      {/* sub */}
      <div
        className="mt-1 text-[11px] font-semibold tracking-[0.01em]"
        style={{ color: isPrimary ? 'rgba(11,12,16,0.55)' : 'var(--color-ink-mutedXL)' }}
      >
        {sub}
      </div>
    </button>
  );
}
