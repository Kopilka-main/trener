import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, BookOpen, CalendarDays, ChevronRight, MessageSquare, Users } from 'lucide-react';
import { useTrainer } from '../api/trainer';
import { useChatUnread } from '../api/chat';
import { useClients } from '../api/clients';
import { useSessions } from '../api/sessions';
import { useExercises } from '../api/exercises';

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

export function HomePage() {
  const navigate = useNavigate();
  const { data: trainer } = useTrainer();
  const { data: unread } = useChatUnread('trainer');
  const { data: clients } = useClients();
  const { data: exercises } = useExercises();

  const now = new Date();
  const today = isoDate(now);
  const weekAhead = isoDate(new Date(now.getTime() + 7 * 86400000));
  const { data: sessions } = useSessions(today, weekAhead);

  const chatBadge = unread?.unread ?? 0;
  const clientsCount = clients?.length ?? 0;
  const exercisesCount = exercises?.length ?? 0;

  const todaySessions = (sessions ?? []).filter((s) => s.date === today && s.status !== 'cancelled');
  const todayCount = todaySessions.length;
  const weekPlanned = (sessions ?? []).filter((s) => s.status !== 'cancelled').length;

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
  const trainerInitials = trainer ? `${trainer.firstName.charAt(0)}${trainer.lastName.charAt(0)}`.toUpperCase() : '';
  const trainerName = trainer ? `${trainer.firstName} ${trainer.lastName}` : '';

  // Один acid-fill на экран — primary тайл: чат если есть непрочитанные.
  const primaryKey: 'chat' | null = chatBadge > 0 ? 'chat' : null;

  const tiles = [
    {
      key: 'exercises' as const,
      title: 'Упражнения',
      sub: 'база и шаблоны',
      v: pad2(exercisesCount),
      s: 'в базе',
      Icon: BookOpen,
      onClick: () => navigate('/trainer/exercises'),
    },
    {
      key: 'calendar' as const,
      title: 'Календарь',
      sub: 'расписание занятий',
      v: pad2(weekPlanned),
      s: 'на 7 дней',
      Icon: CalendarDays,
      onClick: () => navigate('/trainer/calendar'),
    },
    {
      key: 'chat' as const,
      title: 'Чат',
      sub: 'клиенты и заметки',
      v: pad2(chatBadge),
      s: 'новых',
      Icon: MessageSquare,
      onClick: () => navigate('/trainer/chat'),
    },
    {
      key: 'clients' as const,
      title: 'Клиенты',
      sub: 'контакты и пакеты',
      v: pad2(clientsCount),
      s: 'активных',
      Icon: Users,
      onClick: () => navigate('/trainer/clients'),
    },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col overflow-y-auto px-5 pb-7 pt-1">
        {/* ─── Шапка-карточка тренера ─── */}
        {trainer && (
          <button
            onClick={() => navigate('/trainer/profile')}
            className="flex w-full items-center gap-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-card)] px-4 py-3.5 text-left active:scale-[0.99] transition-transform"
          >
            <span
              className="flex h-11 w-11 items-center justify-center rounded-full text-[15px] font-bold"
              style={{ background: 'var(--color-amber, #c9974b)', color: 'var(--color-accent-on)' }}
            >
              {trainerInitials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-bold leading-tight tracking-[-0.01em]">{trainerName}</span>
              <span className="mt-0.5 block truncate text-[11px] font-semibold tracking-[0.03em] text-[var(--color-ink-muted)]">
                {trainer.title ?? 'Персональный тренер'}
              </span>
            </span>
            <ChevronRight size={14} className="shrink-0 text-[var(--color-ink-mutedXL)]" />
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

        {/* ─── Сетка 2×2 модулей — растёт на всё свободное место ─── */}
        <div className="mt-5 grid flex-1 grid-cols-2 gap-2.5">
          {tiles.map((tile) => {
            const isPrimary = primaryKey === tile.key;
            return (
              <button
                key={tile.key}
                onClick={tile.onClick}
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
                  <tile.Icon size={20} strokeWidth={1.8} />
                </span>

                {/* arrow */}
                <ArrowUpRight
                  size={14}
                  className={`absolute right-3.5 top-4 ${isPrimary ? 'opacity-70' : 'opacity-40'}`}
                  strokeWidth={1.8}
                />

                <span className="flex-1" />

                {/* mono number row */}
                <div className="mb-1 flex items-baseline gap-1">
                  <span className="font-[family-name:var(--font-display)] text-[36px] leading-none tracking-[-0.03em] tabular-nums">
                    {tile.v}
                  </span>
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.08em]"
                    style={{ color: isPrimary ? 'rgba(11,12,16,0.65)' : 'var(--color-ink-muted)' }}
                  >
                    {tile.s}
                  </span>
                </div>

                {/* title */}
                <div className="text-[17px] font-bold leading-none tracking-[-0.02em]">{tile.title}</div>
                {/* sub */}
                <div
                  className="mt-1 text-[11px] font-semibold tracking-[0.01em]"
                  style={{ color: isPrimary ? 'rgba(11,12,16,0.55)' : 'var(--color-ink-mutedXL)' }}
                >
                  {tile.sub}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
