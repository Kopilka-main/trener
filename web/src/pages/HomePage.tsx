import { useNavigate } from 'react-router-dom';
import { BookOpen, CalendarDays, ChevronRight, MessageSquare, Users } from 'lucide-react';
import { Avatar } from '../components/Avatar';
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

  const todaySessions = (sessions ?? []).filter((s) => s.date === today);
  const todayCount = todaySessions.length;

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

  const dateLabel = `СЕГОДНЯ · ${DAY_SHORT[now.getDay()]} ${now.getDate()} ${MONTH_FULL[now.getMonth()]}`;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-4 pb-6 pt-4">
        {trainer && (
          <button
            data-theme="dark"
            onClick={() => navigate('/trainer/profile')}
            className="mb-4 flex w-full items-center gap-3 rounded-2xl bg-[var(--color-card)] p-4 text-left active:scale-[0.99] transition-transform"
          >
            <Avatar firstName={trainer.firstName} lastName={trainer.lastName} size={56} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-[family-name:var(--font-display)] text-[22px] leading-[1.05]">
                {trainer.firstName} {trainer.lastName}
              </div>
              <div className="mt-1 inline-flex items-center rounded-full bg-[var(--color-chip)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
                {trainer.title ?? 'Персональный тренер'}
              </div>
            </div>
            <ChevronRight size={16} className="shrink-0 text-[var(--color-ink-muted)]" />
          </button>
        )}

        <div className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
          {dateLabel}
        </div>

        {nextSession && (
          <button
            onClick={() => navigate('/trainer/calendar')}
            className="mb-4 flex w-full items-center justify-between gap-3 rounded-2xl bg-[var(--color-accent)] p-4 text-left text-[var(--color-accent-on)] active:scale-[0.99] transition-transform"
          >
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">
                СЛЕД. · {nextSession.startTime}
              </div>
              <div className="mt-1 truncate font-[family-name:var(--font-display)] text-[20px] leading-[1.1]">
                {nextSession.clientFirstName.toUpperCase()} {nextSession.clientLastName.charAt(0).toUpperCase()}.
                {nextSession.title ? ` · ${nextSession.title.toUpperCase()}` : ''}
              </div>
            </div>
            <ChevronRight size={18} className="shrink-0" />
          </button>
        )}

        <div className="grid grid-cols-2 gap-3">
          <MetricTile
            icon={CalendarDays}
            value={todayCount}
            label="Календарь"
            sub={todayCount === 1 ? 'занятие сегодня' : 'занятий сегодня'}
            highlight={todayCount > 0}
            onClick={() => navigate('/trainer/calendar')}
          />
          <MetricTile
            icon={Users}
            value={clientsCount}
            label="Клиенты"
            sub="активных"
            onClick={() => navigate('/trainer/clients')}
          />
          <MetricTile
            icon={BookOpen}
            value={exercisesCount}
            label="Упражнения"
            sub="в базе"
            onClick={() => navigate('/trainer/exercises')}
          />
          <MetricTile
            icon={MessageSquare}
            value={chatBadge}
            label="Чат"
            sub={chatBadge === 0 ? 'клиенты и заметки' : chatBadge === 1 ? 'новое сообщение' : 'новых сообщений'}
            highlight={chatBadge > 0}
            onClick={() => navigate('/trainer/chat')}
          />
        </div>
      </div>
    </div>
  );
}

type LucideIcon = typeof Users;

function MetricTile({
  icon: Icon,
  value,
  label,
  sub,
  highlight,
  onClick,
}: {
  icon: LucideIcon;
  value: number;
  label: string;
  sub: string;
  highlight?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      data-theme="dark"
      onClick={onClick}
      className="relative flex aspect-square flex-col items-start justify-between rounded-2xl bg-[var(--color-card)] p-4 text-left active:scale-[0.99] transition-transform"
    >
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-full ${highlight ? 'bg-[var(--color-accent)] text-[var(--color-accent-on)]' : 'bg-[var(--color-chip)]'}`}
      >
        <Icon size={20} />
      </span>
      <div className="block w-full">
        <div className="font-[family-name:var(--font-display)] text-[42px] leading-none tabular-nums">{value}</div>
        <div className="mt-1 flex items-baseline justify-between gap-2">
          <span className="text-[14px] font-semibold leading-tight">{label}</span>
          <span className="truncate text-[10px] font-medium uppercase tracking-wider text-[var(--color-ink-muted)]">
            {sub}
          </span>
        </div>
      </div>
    </button>
  );
}
