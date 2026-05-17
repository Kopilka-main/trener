import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { Trainer, TrainerInput } from './types';

export function useTrainer() {
  return useQuery({
    queryKey: ['trainer'],
    queryFn: () => api.get<Trainer>('/api/trainer'),
  });
}

export function useUpdateTrainer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TrainerInput) => api.put<Trainer>('/api/trainer', input),
    onSuccess: (data) => qc.setQueryData(['trainer'], data),
  });
}
