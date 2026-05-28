import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import type { AccountingSummary, IncomeItem } from './types';

export type AccountingRange = 'month' | 'quarter' | 'year' | 'custom';

export function useAccountingSummary(month: string, range: AccountingRange = 'month', customFrom?: string, customTo?: string) {
  const params = new URLSearchParams({ month });
  if (range === 'custom' && customFrom && customTo) {
    params.set('from', customFrom);
    params.set('to', customTo);
  } else if (range !== 'custom') {
    params.set('range', range);
  }
  const key = range === 'custom' ? `custom:${customFrom}:${customTo}` : range;
  return useQuery({
    queryKey: ['accounting-summary', month, key],
    queryFn: () => api.get<AccountingSummary>(`/api/accounting/summary?${params.toString()}`),
  });
}

export function useIncomeList(from: string, to: string) {
  return useQuery({
    queryKey: ['income', from, to],
    queryFn: () => api.get<IncomeItem[]>(`/api/accounting/income?from=${from}&to=${to}`),
  });
}
