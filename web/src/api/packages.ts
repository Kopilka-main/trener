import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { PaymentPackage, PaymentPackageInput } from './types';

export function useClientPackages(clientId: string | undefined) {
  return useQuery({
    queryKey: ['packages', clientId],
    enabled: !!clientId,
    queryFn: () => api.get<PaymentPackage[]>(`/api/clients/${clientId}/packages`),
  });
}

// Изменение пакетов влияет на остаток, цвета занятий в календаре и алерты.
function invalidatePackageRelated(qc: ReturnType<typeof useQueryClient>, clientId: string) {
  qc.invalidateQueries({ queryKey: ['packages', clientId] });
  qc.invalidateQueries({ queryKey: ['balance', clientId] });
  qc.invalidateQueries({ queryKey: ['sessions-paid'] });
  qc.invalidateQueries({ queryKey: ['alerts'] });
}

export function useCreatePackage(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PaymentPackageInput) =>
      api.post<PaymentPackage>(`/api/clients/${clientId}/packages`, input),
    onSuccess: () => invalidatePackageRelated(qc, clientId),
  });
}

export function useUpdatePackage(packageId: string, clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PaymentPackageInput) =>
      api.put<PaymentPackage>(`/api/packages/${packageId}`, input),
    onSuccess: () => invalidatePackageRelated(qc, clientId),
  });
}

export function useDeletePackage(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (packageId: string) => api.delete(`/api/packages/${packageId}`),
    onSuccess: () => invalidatePackageRelated(qc, clientId),
  });
}
