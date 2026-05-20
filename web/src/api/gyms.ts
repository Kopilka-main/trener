import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { Gym, GymInput } from './types';

export function useGyms() {
  return useQuery({ queryKey: ['gyms'], queryFn: () => api.get<Gym[]>('/api/gyms') });
}

export function useCreateGym() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: GymInput) => api.post<Gym>('/api/gyms', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gyms'] }),
  });
}

export function useUpdateGym(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: GymInput) => api.put<Gym>(`/api/gyms/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gyms'] }),
  });
}

export function useDeleteGym() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/gyms/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gyms'] }),
  });
}
