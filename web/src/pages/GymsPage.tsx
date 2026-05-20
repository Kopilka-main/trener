import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ScreenHeader } from '../components/ScreenHeader';
import { Field, TextArea, TextInput } from '../components/Field';
import { useConfirm } from '../components/ConfirmProvider';
import { useCreateGym, useDeleteGym, useGyms } from '../api/gyms';
import type { Gym } from '../api/types';

export function GymsPage() {
  const { data: gyms = [] } = useGyms();
  const deleteMut = useDeleteGym();
  const confirm = useConfirm();
  const [adding, setAdding] = useState(false);

  const onDelete = async (g: Gym) => {
    if (!(await confirm(`Удалить зал «${g.name}»?`, { confirmLabel: 'Удалить', danger: true }))) return;
    deleteMut.mutate(g.id);
  };

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title="Залы" back />
      <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-3">
        {gyms.length > 0 ? (
          <ul className="overflow-hidden rounded-2xl">
            {gyms.map((g, i) => (
              <li
                key={g.id}
                className={`flex items-center gap-3 bg-[var(--color-card)] px-3 py-3 ${
                  i < gyms.length - 1 ? 'border-b border-[var(--color-line)]' : ''
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold">{g.name}</div>
                  {(g.monthlyRent || g.note) && (
                    <div className="text-[11px] text-[var(--color-ink-muted)]">
                      {g.monthlyRent ? `${Math.round(g.monthlyRent).toLocaleString('ru-RU')} ₽/мес` : ''}
                      {g.monthlyRent && g.note ? ' · ' : ''}
                      {g.note ?? ''}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => onDelete(g)}
                  className="flex h-7 w-7 items-center justify-center text-[var(--color-ink-muted)]"
                  aria-label="Удалить"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="py-8 text-center text-[13px] text-[var(--color-ink-muted)]">Залов пока нет</div>
        )}
        {adding ? (
          <GymForm onClose={() => setAdding(false)} />
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--color-line)] py-3 text-[13px] font-medium text-[var(--color-ink-muted)]"
          >
            <Plus size={15} /> Добавить зал
          </button>
        )}
      </div>
    </div>
  );
}

function GymForm({ onClose }: { onClose: () => void }) {
  const createMut = useCreateGym();
  const [name, setName] = useState('');
  const [rent, setRent] = useState('');
  const [note, setNote] = useState('');

  const submit = async () => {
    if (!name.trim()) {
      alert('Укажите название зала');
      return;
    }
    await createMut.mutateAsync({
      name: name.trim(),
      monthlyRent: rent ? Number(rent) : null,
      note: note.trim() || null,
    });
    onClose();
  };

  return (
    <div className="rounded-2xl bg-[var(--color-card)] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[14px] font-semibold">Новый зал</h4>
        <button onClick={onClose} className="text-[12px] text-[var(--color-ink-muted)]">Отмена</button>
      </div>
      <Field label="Название">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="ClubAlex" />
      </Field>
      <Field label="Аренда в месяц, ₽">
        <TextInput inputMode="decimal" value={rent} onChange={(e) => setRent(e.target.value)} placeholder="0" />
      </Field>
      <Field label="Заметка">
        <TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <button
        onClick={submit}
        disabled={createMut.isPending}
        className="w-full rounded-2xl bg-ink py-3 text-[14px] font-semibold disabled:opacity-50"
        style={{ color: '#ffffff' }}
      >
        {createMut.isPending ? 'Сохранение…' : 'Сохранить'}
      </button>
    </div>
  );
}
