import { Pencil } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { ScreenHeader } from '../components/ScreenHeader';
import { ContactLink, contactList } from '../components/ContactLink';
import { useClient } from '../api/clients';
import { calcAge, formatBirth } from '../lib/format';
import { fullName } from '../lib/initials';
import { Row, Section } from './ClientCardPage';

/**
 * Подэкран профиля клиента: связь, персональные данные, заметки + кнопка
 * редактирования (открывает форму ClientEditPage).
 */
export function ClientProfileDetailsPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: client } = useClient(id);
  if (!client) return null;
  const age = calcAge(client.birthDate);
  const contacts = contactList(client);
  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title={`Профиль · ${fullName(client.firstName, client.lastName)}`} back />
      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-3 space-y-5">
        {contacts.length > 0 && (
          <Section title="Связь">
            <div className="overflow-hidden rounded-2xl">
              {contacts.map((c, i) => (
                <ContactLink key={c.kind} kind={c.kind} value={c.value} last={i === contacts.length - 1} />
              ))}
            </div>
          </Section>
        )}

        <Section title="Персональные данные">
          <div className="overflow-hidden rounded-2xl">
            <Row
              label="Дата рождения"
              value={
                client.birthDate
                  ? `${formatBirth(client.birthDate)}${age !== null ? ` · ${age} лет` : ''}`
                  : '—'
              }
            />
            <Row label="Рост / вес" value={`${client.heightCm ?? '—'} см · ${client.weightKg ?? '—'} кг`} />
            <Row label="ID клиента" value={client.accountId ?? '—'} last />
          </div>
        </Section>

        {client.notes && (
          <Section title="Заметки">
            <div className="rounded-2xl bg-[var(--color-card)] p-4 text-[14px] leading-relaxed whitespace-pre-line">
              {client.notes}
            </div>
          </Section>
        )}

        <button
          onClick={() => navigate(`/trainer/clients/${id}/edit`)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--color-line)] bg-[var(--color-card)] py-3.5 text-[14px] font-medium"
        >
          <Pencil size={16} /> Редактировать данные
        </button>
      </div>
    </div>
  );
}
