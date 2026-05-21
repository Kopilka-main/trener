import { NavLink } from 'react-router-dom';
import { CLIENT_BASE, DEMO_CLIENT_ID, TRAINER_BASE } from '../lib/routes';
import { useChatUnread } from '../api/chat';

type Tab = { to: string; label: string; key?: 'chat' };

const trainerTabs: Tab[] = [
  { to: `${TRAINER_BASE}/exercises`, label: 'Упражнения' },
  { to: `${TRAINER_BASE}/clients`, label: 'Клиенты' },
  { to: `${TRAINER_BASE}/chat`, label: 'Чат', key: 'chat' },
];

const clientTabs: Tab[] = [
  { to: `${CLIENT_BASE}/workouts`, label: 'Мои тренировки' },
  { to: `${CLIENT_BASE}/exercises`, label: 'Упражнения' },
  { to: `${CLIENT_BASE}/chat`, label: 'Чат', key: 'chat' },
];

export function BottomTabBar({ role }: { role: 'trainer' | 'client' }) {
  const tabs = role === 'client' ? clientTabs : trainerTabs;
  // Бейдж непрочитанных сообщений у таба «Чат» — обновляется раз в 60с.
  const { data: unread } = useChatUnread(role, role === 'client' ? DEMO_CLIENT_ID : undefined);
  return (
    <nav className="border-t border-[var(--color-line)] bg-[var(--color-bg)] pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <ul className="grid grid-cols-3">
        {tabs.map(({ to, label, key }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                `relative flex items-center justify-center py-3 text-sm ${isActive ? 'font-semibold text-ink' : 'text-[var(--color-ink-muted)]'}`
              }
            >
              {label}
              {key === 'chat' && unread && unread.unread > 0 && (
                <span
                  className="ml-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--color-accent)] px-1 text-[10px] font-bold text-[var(--color-accent-on)]"
                >
                  {unread.unread}
                </span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
