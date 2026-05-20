import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { Session, SessionInput } from './types';

// Список занятий в диапазоне дат, опционально по конкретному клиенту.
export function useSessions(from: string, to: string, clientId?: string) {
  return useQuery({
    queryKey: ['sessions', from, to, clientId ?? ''],
    queryFn: () => {
      const params = new URLSearchParams({ from, to });
      if (clientId) params.set('clientId', clientId);
      return api.get<Session[]>(`/api/sessions?${params.toString()}`);
    },
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SessionInput) => api.post<Session>('/api/sessions', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
}

export function useUpdateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SessionInput }) => api.put<Session>(`/api/sessions/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/sessions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
}

// Карта {sessionId → true|false}: оплачена ли тренировка из активных пакетов клиента.
export function useSessionPaymentStatus(from: string, to: string) {
  return useQuery({
    queryKey: ['sessions-paid', from, to],
    queryFn: () => api.get<Record<string, boolean>>(`/api/sessions/payment-status?from=${from}&to=${to}`),
  });
}

// Имитация «получения» уведомления клиентом — ставит deliveredAt.
export function useDeliverSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch<Session>(`/api/sessions/${id}/deliver`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
}
