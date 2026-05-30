import { FileText } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { ScreenHeader } from '../components/ScreenHeader';
import { useClient } from '../api/clients';
import { fullName } from '../lib/initials';
import { Section } from './ClientCardPage';

/**
 * Подэкран медкарты клиента: заметки врача и (когда будет реализовано)
 * загруженные файлы, разбитые по дням.
 */
export function ClientMedicalPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { data: client } = useClient(id);
  if (!client) return null;
  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title={`Медкарта · ${fullName(client.firstName, client.lastName)}`} back />
      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-3 space-y-5">
        <Section title="Медицинская информация" indicator={!!client.medicalNotes}>
          <div className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-card)]">
            {client.medicalNotes ? (
              <div className="border-b border-[var(--color-line)] p-4 text-[14px] leading-relaxed whitespace-pre-line">
                {client.medicalNotes}
              </div>
            ) : (
              <div className="p-4 text-[13px] text-[var(--color-ink-muted)]">
                Заметок врача нет. Заполните их в разделе «Редактировать» данные клиента.
              </div>
            )}
            <div className="flex items-center gap-3 px-4 py-3 text-[12px] text-[var(--color-ink-muted)]">
              <FileText size={14} className="shrink-0 opacity-60" />
              <span className="flex-1">Файлы и заметки по дням</span>
              <span className="rounded bg-[var(--color-accent)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent-on)]">
                СКОРО
              </span>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
