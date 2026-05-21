import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Check, CheckCheck, Send } from 'lucide-react';
import { ScreenHeader } from '../components/ScreenHeader';
import { Avatar } from '../components/Avatar';
import { useClient } from '../api/clients';
import { useTrainer } from '../api/trainer';
import { useConversation, useConversationByClient, useMarkRead, useMessages, useSendMessage } from '../api/chat';
import { DEMO_CLIENT_ID } from '../lib/routes';
import { fullName } from '../lib/initials';
import type { ChatMessage, Conversation } from '../api/chat';

const READ_BLUE = '#2f6fed';

// Окно диалога. Тренер: /trainer/chat/:clientId; клиент: /client/chat (id = демо).
export function ChatPage() {
  const params = useParams<{ clientId: string }>();
  const isClient = localStorage.getItem('app_role') === 'client';
  const role: 'trainer' | 'client' = isClient ? 'client' : 'trainer';
  const clientId = params.clientId || DEMO_CLIENT_ID;

  const { data: conv } = useConversationByClient(clientId);
  const { data: messages = [] } = useMessages(conv?.id, role);
  // Состояние диалога (timestamps received/read обеих сторон) — для галочек.
  const { data: convState } = useConversation(conv?.id);
  const sendMut = useSendMessage(conv?.id ?? '');
  const markRead = useMarkRead();
  const { data: client } = useClient(clientId);
  const { data: trainer } = useTrainer();

  const counterpart = isClient
    ? trainer
      ? { firstName: trainer.firstName, lastName: trainer.lastName, title: 'Тренер' }
      : null
    : client
      ? { firstName: client.firstName, lastName: client.lastName, title: 'Клиент' }
      : null;

  // Помечаем прочитанным каждый раз, как пришли новые сообщения от собеседника.
  useEffect(() => {
    if (!conv) return;
    const fromOther = messages.filter((m) => m.senderRole !== role);
    if (fromOther.length === 0) return;
    markRead.mutate({ conversationId: conv.id, role });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conv?.id, messages.length]);

  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  // Автоскролл вниз при появлении новых сообщений.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !conv) return;
    setDraft('');
    try {
      await sendMut.mutateAsync({ senderRole: role, body });
    } catch (e) {
      setDraft(body);
      throw e;
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title={
          counterpart ? (
            <span className="flex items-center justify-center gap-2">
              <Avatar firstName={counterpart.firstName} lastName={counterpart.lastName} size={28} />
              <span className="truncate">{fullName(counterpart.firstName, counterpart.lastName)}</span>
            </span>
          ) : (
            'Чат'
          )
        }
        back
      />

      <div ref={listRef} className="flex-1 overflow-y-auto px-3 pb-3 pt-2 space-y-1.5">
        {messages.length === 0 && (
          <div className="py-10 text-center text-[13px] text-[var(--color-ink-muted)]">
            Сообщений ещё нет
          </div>
        )}
        {messages.map((m) => (
          <Bubble key={m.id} message={m} mine={m.senderRole === role} conv={convState} role={role} />
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-end gap-2 border-t border-[var(--color-line)] px-3 py-2"
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          rows={1}
          placeholder="Сообщение…"
          className="max-h-32 min-h-[40px] flex-1 resize-none rounded-2xl bg-[var(--color-chip)] px-4 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-ink/10"
        />
        <button
          type="submit"
          disabled={!draft.trim() || sendMut.isPending}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-on)] disabled:opacity-30"
          aria-label="Отправить"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

function Bubble({
  message,
  mine,
  conv,
  role,
}: {
  message: ChatMessage;
  mine: boolean;
  conv: Conversation | undefined;
  role: 'trainer' | 'client';
}) {
  const status = mine ? messageStatus(message, conv, role) : null;
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 text-[14px] ${
          mine ? 'bg-[var(--color-accent)] text-[var(--color-accent-on)]' : 'bg-[var(--color-card)]'
        }`}
      >
        <div className="whitespace-pre-wrap break-words">{message.body}</div>
        <div
          className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${mine ? 'text-[var(--color-accent-on)] opacity-60' : 'text-[var(--color-ink-muted)]'}`}
        >
          <span>{formatHM(message.createdAt)}</span>
          {mine && status && <StatusTick status={status} />}
        </div>
      </div>
    </div>
  );
}

function StatusTick({ status }: { status: 'sent' | 'delivered' | 'read' }) {
  if (status === 'sent') return <Check size={12} className="shrink-0" />;
  if (status === 'delivered') return <CheckCheck size={12} className="shrink-0" />;
  return <CheckCheck size={12} className="shrink-0" style={{ color: READ_BLUE }} />;
}

function messageStatus(
  msg: ChatMessage,
  conv: Conversation | undefined,
  role: 'trainer' | 'client'
): 'sent' | 'delivered' | 'read' {
  if (!conv) return 'sent';
  // Смотрим timestamps другой стороны.
  const otherReceivedAt = role === 'trainer' ? conv.clientLastReceivedAt : conv.trainerLastReceivedAt;
  const otherReadAt = role === 'trainer' ? conv.clientLastReadAt : conv.trainerLastReadAt;
  if (otherReadAt && msg.createdAt <= otherReadAt) return 'read';
  if (otherReceivedAt && msg.createdAt <= otherReceivedAt) return 'delivered';
  return 'sent';
}

function formatHM(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}
