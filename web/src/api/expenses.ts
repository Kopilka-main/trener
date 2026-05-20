import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { Expense, ExpenseInput } from './types';

export function useExpenses(from: string, to: string) {
  return useQuery({
    queryKey: ['expenses', from, to],
    queryFn: () => api.get<Expense[]>(`/api/expenses?from=${from}&to=${to}`),
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
