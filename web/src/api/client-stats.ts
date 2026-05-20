import { useQuery } from '@tanstack/react-query';
import { api } from './client';

export type ClientStats = {
  total: number;
  avgPerWeek: number;
  frequency: Array<{ week: string; count: number }>;
  records: Array<{ exerciseName: string; weightKg: number; reps: number; date: string | null }>;
  totals: Array<{ month: string; tonnage: number }>;
};

export function useClientStats(id: string | undefined) {
  return useQuery({
    queryKey: ['client-stats', id],
    enabled: !!id,
    queryFn: () => api.get<ClientStats>(`/api/clients/${id}/stats`),
  });
}
