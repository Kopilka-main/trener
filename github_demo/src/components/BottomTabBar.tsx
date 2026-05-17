import { NavLink } from 'react-router-dom';
import { CLIENT_BASE, TRAINER_BASE } from '../lib/routes';

const trainerTabs = [
  { to: `${TRAINER_BASE}/exercises`, label: 'Упражнения' },
  { to: `${TRAINER_BASE}/clients`, label: 'Клиенты' },
];

const clientTabs = [
  { to: `${CLIENT_BASE}/workouts`, label: 'Мои тренировки' },
  { to: `${CLIENT_BASE}/exercises`, label: 'Упражнения' },
];

export function BottomTabBar({ role }: { role: 'trainer' | 'client' }) {
  const tabs = role === 'client' ? clientTabs : trainerTabs;
  return (
    <nav className="border-t border-[var(--color-line)] bg-[var(--color-bg)] pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <ul className="grid grid-cols-2">
        {tabs.map(({ to, label }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                `flex items-center justify-center py-3 text-sm ${isActive ? 'font-semibold text-ink' : 'text-[var(--color-ink-muted)]'}`
              }
            >
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
