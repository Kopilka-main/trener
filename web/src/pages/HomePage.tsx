import { useNavigate } from 'react-router-dom';
import { BookOpen, CalendarDays, ChevronRight, MessageSquare, Users } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { useTrainer } from '../api/trainer';
import { useChatUnread } from '../api/chat';

// Главный экран тренера: четыре крупные плитки + блок с самим тренером сверху.
export function HomePage() {
  const navigate = useNavigate();
  const { data: trainer } = useTrainer();
  const { data: unread } = useChatUnread('trainer');
  const chatBadge = unread?.unread ?? 0;

  return (
    <div className="flex h-full flex-col">
      <header className="px-5 pt-3 pb-3">
        {trainer && (
          <button
            onClick={() => navigate('/trainer/profile')}
            className="flex w-full items-center gap-3 rounded-2xl bg-[var(--color-card)] p-3 text-left active:scale-[0.99] transition-transform"
          >
            <Avatar firstName={trainer.firstName} lastName={trainer.lastName} size={44} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-semibold">
                {trainer.firstName} {trainer.lastName}
              </div>
              <div className="truncate text-[12px] text-[var(--color-ink-muted)]">
                {trainer.title ?? 'Профиль и настройки'}
              </div>
            </div>
            <ChevronRight size={16} className="shrink-0 text-[var(--color-ink-muted)]" />
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        <div className="grid grid-cols-2 gap-3">
          <Tile
            icon={Users}
            label="Клиенты"
            sub="контакты и пакеты"
            onClick={() => navigate('/trainer/clients')}
          />
          <Tile
            icon={CalendarDays}
            label="Календарь"
            sub="расписание занятий"
            onClick={() => navigate('/trainer/calendar')}
          />
          <Tile
            icon={BookOpen}
            label="Упражнения"
            sub="база и шаблоны"
            onClick={() => navigate('/trainer/exercises')}
          />
          <Tile
            icon={MessageSquare}
            label="Чат"
            sub="клиенты и уведомления"
            badge={chatBadge}
            badgeTone="ink"
            onClick={() => navigate('/trainer/chat')}
          />
        </div>

      </div>
    </div>
  );
}

type LucideIcon = typeof Users;

function Tile({
  icon: Icon,
  label,
  sub,
  badge,
  badgeTone,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  sub: string;
  badge?: number;
  badgeTone?: 'ink' | 'warn' | 'danger';
  onClick: () => void;
}) {
  const badgeColor =
    badgeTone === 'danger' ? 'var(--color-danger)' : badgeTone === 'warn' ? '#d9912b' : 'var(--color-ink)';
  return (
    <button
      onClick={onClick}
      className="relative flex aspect-square flex-col items-start justify-between rounded-2xl bg-[var(--color-card)] p-4 text-left active:scale-[0.99] transition-transform"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-chip)]">
        <Icon size={22} />
      </span>
      <span className="block">
        <span className="block text-[15px] font-bold leading-tight">{label}</span>
        <span className="mt-0.5 block text-[11px] text-[var(--color-ink-muted)]">{sub}</span>
      </span>
      {badge !== undefined && badge > 0 && (
        <span
          className="absolute right-3 top-3 flex h-6 min-w-[24px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold"
          style={{ background: badgeColor, color: '#ffffff' }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

