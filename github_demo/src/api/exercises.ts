import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { Exercise, ExerciseInput } from './types';

export function useExercises(query?: string, category?: string) {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (category) params.set('category', category);
  const qs = params.toString();
  return useQuery({
    queryKey: ['exercises', query ?? '', category ?? ''],
    queryFn: () => api.get<Exercise[]>(`/api/exercises${qs ? `?${qs}` : ''}`),
  });
}

export function useExercise(id: string | undefined) {
  return useQuery({
    queryKey: ['exercise', id],
    enabled: !!id,
    queryFn: () => api.get<Exercise>(`/api/exercises/${id}`),
  });
}

export function useSaveExercise(id?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ExerciseInput) => (id ? api.put<Exercise>(`/api/exercises/${id}`, input) : api.post<Exercise>('/api/exercises', input)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exercises'] });
      if (id) qc.invalidateQueries({ queryKey: ['exercise', id] });
    },
  });
}

export function useDeleteExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/exercises/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercises'] }),
  });
}
