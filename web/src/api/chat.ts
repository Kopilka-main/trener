import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export type ConversationListItem = {
  id: string;
  clientId: string;
  clientFirstName: string;
  clientLastName: string;
  lastBody: string | null;
  lastAt: string | null;
  lastSenderRole: 'trainer' | 'client' | null;
  unread: number;
};

export type Conversation = {
  id: string;
  clientId: string;
  trainerLastReadAt: string | null;
  clientLastReadAt: string | null;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderRole: 'trainer' | 'client';
  body: string;
  createdAt: string;
};

// Список диалогов (для тренера). Polling раз в 30с.
export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.get<ConversationListItem[]>('/api/conversations'),
    refetchInterval: 30_000,
  });
}

// Получить (или автосоздать) диалог по clientId.
export function useConversationByClient(clientId: string | undefined) {
  return useQuery({
    queryKey: ['conversation', clientId],
    enabled: !!clientId,
    queryFn: () => api.get<Conversation>(`/api/conversations/by-client/${clientId}`),
  });
}

// Сообщения диалога. Polling каждые 15с (можно сузить через since=).
export function useMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: ['messages', conversationId],
    enabled: !!conversationId,
    queryFn: () => api.get<ChatMessage[]>(`/api/conversations/${conversationId}/messages`),
    refetchInterval: 15_000,
  });
}

export function useSendMessage(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { senderRole: 'trainer' | 'client'; body: string }) =>
      api.post<ChatMessage>(`/api/conversations/${conversationId}/messages`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages', conversationId] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
      qc.invalidateQueries({ queryKey: ['chat-unread'] });
    },
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, role }: { conversationId: string; role: 'trainer' | 'client' }) =>
      api.patch<{ ok: true; at: string }>(`/api/conversations/${conversationId}/read`, { role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
      qc.invalidateQueries({ queryKey: ['chat-unread'] });
    },
  });
}

// Глобальный счётчик непрочитанных (для бейджа в таб-баре).
export function useChatUnread(role: 'trainer' | 'client', clientId?: string) {
  return useQuery({
    queryKey: ['chat-unread', role, clientId ?? ''],
    queryFn: () => {
      const params = new URLSearchParams({ role });
      if (clientId) params.set('clientId', clientId);
      return api.get<{ unread: number }>(`/api/conversations/unread?${params.toString()}`);
    },
    refetchInterval: 60_000,
  });
}
