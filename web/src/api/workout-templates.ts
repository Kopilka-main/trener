import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { WorkoutTemplate, WorkoutTemplateInput } from './types';

export function useWorkoutTemplates(query?: string) {
  return useQuery({
    queryKey: ['templates', query ?? ''],
    queryFn: () => api.get<WorkoutTemplate[]>(`/api/workout-templates${query ? `?q=${encodeURIComponent(query)}` : ''}`),
  });
}

export function useWorkoutTemplate(id: string | undefined) {
  return useQuery({
    queryKey: ['template', id],
    enabled: !!id,
    queryFn: () => api.get<WorkoutTemplate>(`/api/workout-templates/${id}`),
  });
}

export function useSaveWorkoutTemplate(id?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: WorkoutTemplateInput) =>
      id ? api.put<WorkoutTemplate>(`/api/workout-templates/${id}`, input) : api.post<WorkoutTemplate>('/api/workout-templates', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
      if (id) qc.invalidateQueries({ queryKey: ['template', id] });
    },
  });
}

export function useDeleteWorkoutTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/workout-templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  });
}
