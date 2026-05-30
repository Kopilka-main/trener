import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export type Measurement = {
  id: string;
  clientId: string;
  date: string;
  weightKg: number | null;
  bodyFatPct: number | null;
  musclePct: number | null;
  waterPct: number | null;
  chestCm: number | null;
  shouldersCm: number | null;
  waistCm: number | null;
  hipsCm: number | null;
  bicepsLCm: number | null;
  bicepsRCm: number | null;
  thighLCm: number | null;
  thighRCm: number | null;
  calfLCm: number | null;
  calfRCm: number | null;
  neckCm: number | null;
  note: string | null;
  createdAt: string;
};

export type MeasurementInput = Omit<Measurement, 'id' | 'clientId' | 'createdAt'>;

export function useClientMeasurements(clientId: string | undefined) {
  return useQuery({
    queryKey: ['measurements', clientId],
    enabled: !!clientId,
    queryFn: () => api.get<Measurement[]>(`/api/clients/${clientId}/measurements`),
  });
}

export function useCreateMeasurement(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MeasurementInput) =>
      api.post<Measurement>(`/api/clients/${clientId}/measurements`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['measurements', clientId] }),
  });
}

export function useUpdateMeasurement(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: MeasurementInput }) =>
      api.put<Measurement>(`/api/measurements/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['measurements', clientId] }),
  });
}

export function useDeleteMeasurement(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/measurements/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['measurements', clientId] }),
  });
}
