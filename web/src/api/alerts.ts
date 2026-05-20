import { useQuery } from '@tanstack/react-query';
import { api } from './client';

export type TrainerAlert = {
  type: 'low_balance' | 'unpaid' | 'no_upcoming';
  severity: 'warn' | 'danger';
  clientId: string;
  clientName: string;
  remaining: number;
  message: string;
};

export function useTrainerAlerts() {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: () => api.get<TrainerAlert[]>('/api/trainer/alerts'),
    refetchInterval: 60_000,
  });
}
