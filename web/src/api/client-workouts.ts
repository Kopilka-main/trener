import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { ClientWorkout, ClientWorkoutsResponse } from './types';

export function useClientWorkouts(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-workouts', clientId],
    enabled: !!clientId,
    queryFn: () => api.get<ClientWorkoutsResponse>(`/api/clients/${clientId}/workouts`),
  });
}

export function useClientWorkout(workoutId: string | undefined) {
  return useQuery({
    queryKey: ['workout', workoutId],
    enabled: !!workoutId,
    queryFn: () => api.get<ClientWorkout>(`/api/client-workouts/${workoutId}`),
  });
}

type AssignBody = {
  sourceTemplateId?: string;
  cloneFromWorkoutId?: string;
  name?: string;
  categoryTag?: string | null;
  exercises?: Array<{ exerciseId: string; sets: number; reps: number | null; weightKg: number | null; timeSec: number | null; restSec: number }>;
};

export function useAssignWorkout(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AssignBody) => api.post<ClientWorkout>(`/api/clients/${clientId}/workouts`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client-workouts', clientId] }),
  });
}

export function useDeleteWorkout(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (workoutId: string) => api.delete(`/api/client-workouts/${workoutId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client-workouts', clientId] }),
  });
}

export function useStartWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (workoutId: string) => api.patch<ClientWorkout>(`/api/client-workouts/${workoutId}/start`),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['workout', data.id] });
      qc.invalidateQueries({ queryKey: ['client-workouts', data.clientId] });
    },
  });
}

type SetUpdate = { actualReps?: number | null; actualWeightKg?: number | null; actualTimeSec?: number | null; done?: boolean };

export function useUpdateSet(workoutId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ exPos, setIdx, body }: { exPos: number; setIdx: number; body: SetUpdate }) =>
      api.patch<ClientWorkout>(`/api/client-workouts/${workoutId}/sets/${exPos}/${setIdx}`, body),
    onSuccess: (data) => {
      qc.setQueryData(['workout', workoutId], data);
    },
  });
}

// Переупорядочивание упражнений в текущей тренировке.
// `order` — список текущих позиций упражнений в желаемой последовательности.
// Оптимистично обновляем кэш, чтобы перетаскивание не «прыгало» обратно.
export function useReorderWorkoutExercises(workoutId: string, clientId: string) {
  const qc = useQueryClient();
  const key = ['client-workouts', clientId];
  return useMutation({
    mutationFn: (order: number[]) => api.patch<ClientWorkout>(`/api/client-workouts/${workoutId}/reorder`, { order }),
    onMutate: async (order) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<ClientWorkoutsResponse>(key);
      if (prev?.current) {
        const byPos = new Map(prev.current.exercises.map((e) => [e.position, e]));
        const exercises = order
          .map((oldPos, i) => {
            const ex = byPos.get(oldPos);
            return ex ? { ...ex, position: i } : null;
          })
          .filter((e): e is NonNullable<typeof e> => e !== null);
        qc.setQueryData<ClientWorkoutsResponse>(key, { ...prev, current: { ...prev.current, exercises } });
      }
      return { prev };
    },
    onError: (_err, _order, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSuccess: (data) => {
      qc.setQueryData(['workout', workoutId], data);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}

// Добавление упражнения в текущую тренировку.
export function useAddWorkoutExercise(workoutId: string, clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (exerciseId: string) =>
      api.post<ClientWorkout>(`/api/client-workouts/${workoutId}/exercises`, { exerciseId }),
    onSuccess: (data) => {
      qc.setQueryData(['workout', workoutId], data);
      qc.invalidateQueries({ queryKey: ['client-workouts', clientId] });
    },
  });
}

// Удаление упражнения из текущей тренировки.
export function useRemoveWorkoutExercise(workoutId: string, clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (position: number) =>
      api.delete<ClientWorkout>(`/api/client-workouts/${workoutId}/exercises/${position}`),
    onSuccess: (data) => {
      qc.setQueryData(['workout', workoutId], data);
      qc.invalidateQueries({ queryKey: ['client-workouts', clientId] });
    },
  });
}

export function useFinishWorkout(workoutId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { trainerNote: string | null; rpe: number | null; durationSec: number }) =>
      api.patch<ClientWorkout>(`/api/client-workouts/${workoutId}/finish`, body),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['workout', workoutId] });
      qc.invalidateQueries({ queryKey: ['client-workouts', data.clientId] });
    },
  });
}
