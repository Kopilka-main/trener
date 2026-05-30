import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { Expense, ExpenseInput } from './types';

export function useExpenses(from: string, to: string) {
  return useQuery({
    queryKey: ['expenses', from, to],
    queryFn: () => api.get<Expense[]>(`/api/expenses?from=${from}&to=${to}`),
  });
}

export function useClientExpenses(clientId: string | undefined) {
  return useQuery({
    queryKey: ['expenses', 'by-client', clientId ?? ''],
    enabled: !!clientId,
    queryFn: () => api.get<Expense[]>(`/api/expenses?clientId=${clientId}`),
  });
}

export function useGymExpenses(gymId: string | undefined) {
  return useQuery({
    queryKey: ['expenses', 'by-gym', gymId ?? ''],
    enabled: !!gymId,
    queryFn: () => api.get<Expense[]>(`/api/expenses?gymId=${gymId}`),
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ExpenseInput) => api.post<Expense>('/api/expenses', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/expenses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}
