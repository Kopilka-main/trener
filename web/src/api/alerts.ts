import { useQuery } from '@tanstack/react-query';
import { api } from './client';

export type TrainerAlert = {
  type: 'low_balance' | 'unpaid' | 'no_upcoming' | 'online_today' | 'birthday';
  severity: 'warn' | 'danger' | 'info';
  clientId: string | null;
  clientName: string | null;
  remaining: number;
  message: string;
  clientNames?: string[];
};

export function useTrainerAlerts() {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: () => api.get<TrainerAlert[]>('/api/trainer/alerts'),
    refetchInterval: 60_000,
  });
}
