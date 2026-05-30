import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export type ProgressPhoto = {
  id: string;
  clientId: string;
  date: string;
  angle: 'front' | 'side' | 'back';
  url: string;
  note: string | null;
  createdAt: string;
};

export function useClientProgressPhotos(clientId: string | undefined) {
  return useQuery({
    queryKey: ['progress-photos', clientId],
    enabled: !!clientId,
    queryFn: () => api.get<ProgressPhoto[]>(`/api/clients/${clientId}/progress-photos`),
  });
}

export function useUploadProgressPhoto(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      file,
      date,
      angle,
      note,
    }: {
      file: File;
      date: string;
      angle: 'front' | 'side' | 'back';
      note?: string;
    }) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('date', date);
      fd.append('angle', angle);
      if (note) fd.append('note', note);
      const res = await fetch(`/api/clients/${clientId}/progress-photos`, {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      return (await res.json()) as ProgressPhoto;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['progress-photos', clientId] }),
  });
}

export function useDeleteProgressPhoto(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/progress-photos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['progress-photos', clientId] }),
  });
}
