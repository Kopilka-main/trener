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

export type ExerciseOverview = {
  exerciseId: string;
  name: string;
  category: string | null;
  times: number;
  maxWeightKg: number | null;
  tonnage: number;
  maxTimeSec: number | null;
  totalTimeSec: number;
  /** Упражнение измеряется временем (тоннаж = 0, есть время) — растяжка/планка/кардио. */
  isTimeBased: boolean;
  lastDate: string | null;
  /** На последней тренировке побит хотя бы один рекорд (тоннаж / вес / время). */
  lastIsRecord: boolean;
};

export function useClientExercisesOverview(id: string | undefined) {
  return useQuery({
    queryKey: ['client-exercises-overview', id],
    enabled: !!id,
    queryFn: () => api.get<ExerciseOverview[]>(`/api/clients/${id}/stats/exercises`),
  });
}

export type ExerciseHistoryPoint = {
  workoutId: string;
  date: string | null;
  tonnage: number;
  maxWeightKg: number | null;
  bestReps: number | null;
  totalSets: number;
  maxTimeSec: number | null;
  totalTimeSec: number;
};

export type ExerciseHistory = {
  exercise: { id: string; name: string; category: string | null };
  isTimeBased: boolean;
  points: ExerciseHistoryPoint[];
};

export function useClientExerciseHistory(clientId: string | undefined, exerciseId: string | undefined) {
  return useQuery({
    queryKey: ['client-exercise-history', clientId, exerciseId],
    enabled: !!clientId && !!exerciseId,
    queryFn: () => api.get<ExerciseHistory>(`/api/clients/${clientId}/stats/exercises/${exerciseId}/history`),
  });
}
