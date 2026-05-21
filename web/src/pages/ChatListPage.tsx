import { useNavigate } from 'react-router-dom';
import { Bell, ChevronRight, MessageSquare } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { useConversations } from '../api/chat';
import { useTrainerAlerts } from '../api/alerts';
import { fullName } from '../lib/initials';

// Список диалогов тренера со всеми клиентами.
export function ChatListPage() {
  const navigate = useNavigate();
  const { data: conversations = [], isLoading } = useConversations();
  const { data: alerts = [] } = useTrainerAlerts();
  const hasDanger = alerts.some((a) => a.severity === 'danger');
  const alertPreview = alerts[0]?.message ?? 'Уведомлений нет';
  return (
    <div className="flex h-full flex-col">
      <header className="px-5 pt-3 pb-3">
        <h1 className="text-[34px] font-bold leading-tight">Чат</h1>
      </header>
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {/* Закреплённый «системный диалог» — уведомления */}
        <button
          onClick={() => navigate('/trainer/notifications')}
          className="flex w-full items-center gap-3 rounded-2xl bg-[var(--color-card)] px-3 py-3 text-left active:scale-[0.99] transition-transform"
        >
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
            style={{
              background: hasDanger ? 'rgba(200,57,44,0.12)' : 'rgba(217,145,43,0.12)',
              color: hasDanger ? 'var(--color-danger)' : '#d9912b',
            }}
          >
            <Bell size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-[14px] font-semibold">Уведомления</span>
              <span className="shrink-0 text-[11px] text-[var(--color-ink-muted)]">
                {alerts.length > 0 ? 'сейчас' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-[12px] text-[var(--color-ink-muted)]">
                {alertPreview}
              </span>
              {alerts.length > 0 && (
                <span
                  className="flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold"
                  style={{
                    background: hasDanger ? 'var(--color-danger)' : '#d9912b',
                    color: '#ffffff',
                  }}
                >
                  {alerts.length}
                </span>
              )}
            </div>
          </div>
          <ChevronRight size={16} className="shrink-0 text-[var(--color-ink-muted)]" />
        </button>

        {isLoading && <div className="py-6 text-center text-sm text-[var(--color-ink-muted)]">Загрузка…</div>}
        {!isLoading && conversations.length === 0 && (
          <div className="rounded-2xl bg-[var(--color-card)] p-6 text-center text-[13px] text-[var(--color-ink-muted)]">
            Диалогов пока нет. Они появятся, когда вы или клиент напишете первое сообщение.
          </div>
        )}
        <ul className="space-y-2">
          {conversations.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => navigate(`/trainer/chat/${c.clientId}`)}
                className="flex w-full items-center gap-3 rounded-2xl bg-[var(--color-card)] px-3 py-3 text-left active:scale-[0.99] transition-transform"
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
