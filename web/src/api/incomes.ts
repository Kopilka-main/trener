import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export type IncomeRecord = {
  id: string;
  category: string;
  amount: number;
  date: string;
  note: string | null;
  createdAt: string;
};

export type IncomeRecordInput = {
  category: string;
  amount: number;
  date: string;
  note?: string | null;
};

export function useIncomeRecords(from: string, to: string) {
  return useQuery({
    queryKey: ['income-records', from, to],
    queryFn: () => api.get<IncomeRecord[]>(`/api/incomes?from=${from}&to=${to}`),
  });
}

export function useCreateIncomeRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: IncomeRecordInput) => api.post<IncomeRecord>('/api/incomes', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['income-records'] });
      qc.invalidateQueries({ queryKey: ['income'] });
      qc.invalidateQueries({ queryKey: ['accounting-summary'] });
    },
  });
}
