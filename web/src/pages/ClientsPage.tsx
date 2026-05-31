import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Plus, Search } from 'lucide-react';
import { useClients } from '../api/clients';
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
      <header className="px-5 pt-3 pb-3">
        <div className="flex items-start justify-between">
          <h1 className="text-[34px] font-bold leading-tight">Клиенты</h1>
          <button
            onClick={() => navigate(`${appBase()}/clients/new`)}
            className="tile-shadow-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full active:scale-[0.95]"
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
            className="shelf w-full rounded-2xl py-3 pl-10 pr-4 text-sm placeholder:text-[var(--color-ink-muted)] focus:outline-none"
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


function ClientRow({ client, onOpen }: { client: Client; onOpen: () => void }) {
  const schedule = formatSchedule(client.scheduleDay, client.scheduleTime);
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="row-glow flex w-full items-center gap-3 rounded-2xl bg-[var(--color-card)] px-3 py-2.5 text-left active:bg-[var(--color-card-elevated)] transition-colors"
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
        <ChevronRight size={16} className="tile-chevron shrink-0" />
      </button>
    </li>
  );
}
