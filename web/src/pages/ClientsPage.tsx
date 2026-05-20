import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronDown, ChevronRight, ChevronUp, Plus, Search } from 'lucide-react';
import { useClients } from '../api/clients';
import { useTrainerAlerts, type TrainerAlert } from '../api/alerts';
import { Avatar } from '../components/Avatar';
import { AlphaIndex } from '../components/AlphaIndex';
import { appBase } from '../lib/routes';
import { fullName } from '../lib/initials';
import { formatSchedule } from '../lib/format';
import type { Client } from '../api/types';

export function ClientsPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const { data: clients = [], isLoading } = useClients(query);
  const { data: alerts = [] } = useTrainerAlerts();
  const listRef = useRef<HTMLDivElement>(null);

  const grouped = useMemo(() => {
    const sorted = [...clients].sort((a, b) => a.firstName.localeCompare(b.firstName, 'ru'));
    const map = new Map<string, Client[]>();
    for (const c of sorted) {
      const letter = (c.firstName[0] ?? '?').toUpperCase();
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter)!.push(c);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, 'ru'));
  }, [clients]);

  const availableLetters = useMemo(() => new Set(grouped.map(([l]) => l)), [grouped]);

  const scrollToLetter = (letter: string) => {
    const el = document.getElementById(`letter-${letter}`);
    if (!el || !listRef.current) return;
    listRef.current.scrollTo({ top: el.offsetTop - 8, behavior: 'smooth' });
  };

  return (
    <div className="flex h-full flex-col">
      {alerts.length > 0 && (
        <AlertsBanner
          alerts={alerts}
          onPick={(a) => navigate(`${appBase()}/clients/${a.clientId}`)}
        />
      )}
      <header className="px-5 pt-3 pb-3">
        <div className="flex items-start justify-between">
          <h1 className="text-[34px] font-bold leading-tight">Клиенты</h1>
          <button
            onClick={() => navigate(`${appBase()}/clients/new`)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ background: '#1a1a1a', color: '#ffffff' }}
            aria-label="Добавить клиента"
          >
            <Plus size={18} />
          </button>
        </div>
        <div className="mt-3 relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по имени, тегу"
            className="w-full rounded-2xl bg-[var(--color-chip)] py-3 pl-10 pr-4 text-sm placeholder:text-[var(--color-ink-muted)] focus:outline-none"
          />
        </div>
      </header>

      <div className="relative flex flex-1 overflow-hidden">
        <div ref={listRef} className="min-w-0 flex-1 overflow-y-auto pb-4 pl-4 pr-2">
          {isLoading && <div className="px-2 py-6 text-sm text-[var(--color-ink-muted)]">Загрузка…</div>}
          {!isLoading && grouped.length === 0 && (
            <div className="px-2 py-10 text-center text-sm text-[var(--color-ink-muted)]">
              {query ? 'Ничего не найдено' : 'Список пуст. Добавьте первого клиента.'}
            </div>
          )}
          {grouped.map(([letter, list]) => (
            <section key={letter} id={`letter-${letter}`} className="mb-1">
              <h2 className="px-1 pt-2 pb-1 text-[12px] font-medium text-[var(--color-ink-muted)]">{letter}</h2>
              <ul className="space-y-2">
                {list.map((c) => (
                  <ClientRow
                    key={c.id}
                    client={c}
                    onOpen={() => navigate(`${appBase()}/clients/${c.id}`)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
        <AlphaIndex available={availableLetters} onPick={scrollToLetter} />
      </div>
    </div>
  );
}

function AlertsBanner({ alerts, onPick }: { alerts: TrainerAlert[]; onPick: (a: TrainerAlert) => void }) {
  const [open, setOpen] = useState(false);
  const danger = alerts.some((a) => a.severity === 'danger');
  const color = danger ? 'var(--color-danger)' : '#d9912b';
  const label = danger
    ? `У ${alerts.length} ${plural(alerts.length, 'клиента', 'клиентов', 'клиентов')} проблема с оплатой`
    : `У ${alerts.length} ${plural(alerts.length, 'клиента', 'клиентов', 'клиентов')} скоро закончится пакет`;
  return (
    <div className="mx-4 mt-2 overflow-hidden rounded-2xl bg-[var(--color-card)]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        <AlertTriangle size={16} style={{ color }} className="shrink-0" />
        <span className="flex-1 text-[13px] font-medium">{label}</span>
        {open ? <ChevronUp size={16} className="shrink-0" /> : <ChevronDown size={16} className="shrink-0" />}
      </button>
      {open && (
        <ul className="border-t border-[var(--color-line)]">
          {alerts.map((a) => (
            <li key={`${a.type}-${a.clientId}`} className="border-b border-[var(--color-line)] last:border-b-0">
              <button
                onClick={() => onPick(a)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left active:bg-black/5"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: a.severity === 'danger' ? 'var(--color-danger)' : '#d9912b' }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold">{a.clientName}</span>
                  <span className="block truncate text-[11px] text-[var(--color-ink-muted)]">{a.message}</span>
                </span>
                <ChevronRight size={14} className="shrink-0 text-[var(--color-ink-muted)]" />
              </button>
            </li>
          ))}
        </ul>
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

function ClientRow({ client, onOpen }: { client: Client; onOpen: () => void }) {
  const schedule = formatSchedule(client.scheduleDay, client.scheduleTime);
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 rounded-2xl bg-[var(--color-card)] px-3 py-2.5 text-left active:scale-[0.99] transition-transform"
      >
        <Avatar firstName={client.firstName} lastName={client.lastName} size={44} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold">{fullName(client.firstName, client.lastName)}</div>
          {(client.currentTrainingType || schedule) && (
            <div className="truncate text-[12px] text-[var(--color-ink-muted)]">
              {[client.currentTrainingType, schedule].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
        <ChevronRight size={16} className="shrink-0 text-[var(--color-ink-muted)]" />
      </button>
    </li>
  );
}
