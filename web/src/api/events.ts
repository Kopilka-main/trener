import { useQuery } from '@tanstack/react-query';
import { api } from './client';

export type TrainerEvent = {
  id: string;
  type:
    | 'birthday'
    | 'session_completed'
    | 'session_approved'
    | 'pr'
    | 'session_added'
    | 'package_added';
  category: 'system' | 'mine';
  timestamp: string;
  clientId: string | null;
  clientName: string | null;
  message: string;
};

export type TrainerEvents = {
  system: TrainerEvent[];
  mine: TrainerEvent[];
};

export function useTrainerEvents() {
  return useQuery({
    queryKey: ['trainer-events'],
    queryFn: () => api.get<TrainerEvents>('/api/trainer/events'),
    refetchInterval: 60_000,
  });
}
