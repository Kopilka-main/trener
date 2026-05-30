import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, MessageSquare, Search, X } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { useConversations } from '../api/chat';
import { useClients } from '../api/clients';
import { fullName } from '../lib/initials';

// Список диалогов тренера. Снизу — раздел поиска контакта для нового сообщения.
export function ChatListPage() {
  const navigate = useNavigate();
  const { data: conversations = [], isLoading } = useConversations();

  // Режим поиска нового контакта.
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const { data: clients = [] } = useClients(searching ? query : undefined);

  // Клиенты, у которых уже есть диалог — чтобы пометить «уже в чате».
  const existingClientIds = useMemo(
    () => new Set(conversations.map((c) => c.clientId)),
    [conversations],
  );

  // В режиме поиска по умолчанию (query=='') показываем тех клиентов, с которыми
  // ещё нет диалога — иначе быстрее открыть существующий из списка выше.
  const candidates = useMemo(() => {
    if (query) return clients;
    return clients.filter((c) => !existingClientIds.has(c.id));
  }, [clients, query, existingClientIds]);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 px-4 pt-3 pb-3">
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--color-line)] active:scale-90 transition-transform"
          aria-label="Назад"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-ink-mutedXL)]">
          Диалоги
        </span>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {/* Поиск контакта — кнопка/инпут переключаются по тапу */}
        {!searching ? (
          <button
            onClick={() => setSearching(true)}
            className="flex w-full items-center gap-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-card)] px-4 py-3 text-left active:scale-[0.99] transition-transform"
          >
            <Search size={16} className="shrink-0 text-[var(--color-ink-muted)]" />
            <span className="flex-1 text-[14px] text-[var(--color-ink-muted)]">
              Найти клиента и написать
            </span>
            <ChevronRight size={16} className="shrink-0 text-[var(--color-ink-mutedXL)]" />
          </button>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]"
              />
              <input
                type="search"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск по имени, тегу"
                className="w-full rounded-2xl border border-[var(--color-line)] bg-[var(--color-card)] py-3 pl-10 pr-12 text-sm placeholder:text-[var(--color-ink-mutedXL)] focus:border-[var(--color-line-strong)] focus:outline-none"
              />
              <button
                onClick={() => {
                  setSearching(false);
                  setQuery('');
                }}
                className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[var(--color-ink-muted)] active:scale-90 transition-transform"
                aria-label="Закрыть поиск"
              >
                <X size={16} />
              </button>
            </div>

            <ul className="space-y-1.5">
              {candidates.length === 0 && (
                <li className="rounded-2xl bg-[var(--color-card)] p-6 text-center text-[13px] text-[var(--color-ink-muted)]">
                  {query ? 'Ничего не найдено' : 'Все клиенты уже в чате'}
                </li>
              )}
              {candidates.map((cl) => (
                <li key={cl.id}>
                  <button
                    onClick={() => navigate(`/trainer/chat/${cl.id}`)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-card)] px-3 py-2.5 text-left active:scale-[0.99] transition-transform"
                  >
                    <Avatar firstName={cl.firstName} lastName={cl.lastName} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-semibold">
                        {fullName(cl.firstName, cl.lastName)}
                      </div>
                      {(cl.currentTrainingType || cl.hashtags) && (
                        <div className="truncate text-[11px] text-[var(--color-ink-muted)]">
                          {[cl.currentTrainingType, cl.hashtags].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </div>
                    <ChevronRight size={14} className="shrink-0 text-[var(--color-ink-mutedXL)]" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Существующие диалоги */}
        {!searching && (
          <>
            {isLoading && (
              <div className="py-6 text-center text-sm text-[var(--color-ink-muted)]">Загрузка…</div>
            )}
            {!isLoading && conversations.length === 0 && (
              <div className="rounded-2xl bg-[var(--color-card)] p-6 text-center text-[13px] text-[var(--color-ink-muted)]">
                Диалогов пока нет. Найдите клиента через поиск, чтобы начать первый.
              </div>
            )}
            <ul className="space-y-2">
              {conversations.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => navigate(`/trainer/chat/${c.clientId}`)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-card)] px-3 py-3 text-left active:scale-[0.99] transition-transform"
                  >
                    <Avatar firstName={c.clientFirstName} lastName={c.clientLastName} size={44} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[14px] font-semibold">
                          {fullName(c.clientFirstName, c.clientLastName)}
                        </span>
                        <span className="shrink-0 text-[11px] text-[var(--color-ink-muted)]">
                          {c.lastAt ? formatTimeShort(c.lastAt) : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-[12px] text-[var(--color-ink-muted)]">
                          {c.lastSenderRole === 'trainer' && c.lastBody ? 'Вы: ' : ''}
                          {c.lastBody || (
                            <span className="italic">
                              <MessageSquare size={11} className="mr-1 inline-block" /> начать
                            </span>
                          )}
                        </span>
                        {c.unread > 0 && (
                          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--color-accent)] px-1.5 text-[11px] font-bold text-[var(--color-accent-on)]">
                            {c.unread}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={16} className="shrink-0 text-[var(--color-ink-muted)]" />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function formatTimeShort(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  if (sameDay) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}
