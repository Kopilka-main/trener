import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import type { AccountingSummary, IncomeItem } from './types';

export function useAccountingSummary(month: string) {
  return useQuery({
    queryKey: ['accounting-summary', month],
    queryFn: () => api.get<AccountingSummary>(`/api/accounting/summary?month=${month}`),
  });
}

export function useIncomeList(from: string, to: string) {
  return useQuery({
    queryKey: ['income', from, to],
    queryFn: () => api.get<IncomeItem[]>(`/api/accounting/income?from=${from}&to=${to}`),
  });
}
