import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Trash2, X } from 'lucide-react';
import { ScreenHeader } from '../components/ScreenHeader';
import { Field, TextArea, TextInput } from '../components/Field';
import { Avatar } from '../components/Avatar';
import { api } from '../api/client';
import { useClient, useCreateClient, useDeleteClient, useUpdateClient } from '../api/clients';
import { useConfirm } from '../components/ConfirmProvider';
import { appBase, DEMO_CLIENT_ID } from '../lib/routes';
import type { Client, ClientInput } from '../api/types';

const empty: ClientInput = {
  firstName: '',
  lastName: '',
  birthDate: null,
  heightCm: null,
  weightKg: null,
  phone: null,
  telegram: null,
  whatsapp: null,
  instagram: null,
  max: null,
  hashtags: null,
  notes: null,
  medicalNotes: null,
  restingPulse: null,
  scheduleDay: null,
  scheduleTime: null,
  currentTrainingType: null,
  accountId: null,
  onlineUntil: null,
};

type Props = { mode: 'create' | 'edit' };

export function ClientEditPage({ mode }: Props) {
  // У клиента маршрут /client/profile/edit без id — правим демо-клиента.
  const { id: routeId } = useParams<{ id: string }>();
  const isClient = localStorage.getItem('app_role') === 'client';
  const id = routeId ?? (isClient ? DEMO_CLIENT_ID : undefined);
  const navigate = useNavigate();
  const editing = mode === 'edit';
  const { data: existing } = useClient(editing ? id : undefined);
  const createMut = useCreateClient();
  const updateMut = useUpdateClient(id ?? '');
  const deleteMut = useDeleteClient();
  const confirm = useConfirm();

  const [form, setForm] = useState<ClientInput>(empty);
  const [loadId, setLoadId] = useState('');
  const loadMut = useMutation({ mutationFn: (cid: string) => api.get<Client>(`/api/clients/${cid}`) });

  // Подтянуть данные существующего клиента по ID в форму.
  const loadById = async () => {
    const cid = loadId.trim();
    if (!cid) return;
    try {
      const c = await loadMut.mutateAsync(cid);
      const { id: _id, createdAt: _ca, ...rest } = c;
      setForm(rest);
    } catch {
      alert('Клиент с таким ID не найден');
    }
  };

  useEffect(() => {
    if (editing && existing) {
      const { id: _id, createdAt: _ca, ...rest } = existing;
      setForm(rest);
    }
  }, [editing, existing]);

  const setField = <K extends keyof ClientInput>(k: K, v: ClientInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      alert('Имя и фамилия обязательны');
      return;
    }
    if (editing) {
      await updateMut.mutateAsync(form);
    } else {
      await createMut.mutateAsync(form);
    }
    navigate(-1);
  };

  const remove = async () => {
    if (!id) return;
    if (!(await confirm('Удалить клиента и все связанные тренировки?', { confirmLabel: 'Удалить', danger: true }))) return;
    await deleteMut.mutateAsync(id);
    navigate(`${appBase()}/clients`);
  };

  const tags = (form.hashtags ?? '').split(/\s+/).filter(Boolean);
  const removeTag = (t: string) => setField('hashtags', tags.filter((x) => x !== t).join(' ') || null);

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title={editing ? (isClient ? 'Мой профиль' : 'Редактирование') : 'Новый клиент'}
        back
        right={<button onClick={submit} className="text-[14px] font-semibold">Сохранить</button>}
      />
      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-4">
        {!editing && (
          <Section title="Загрузить клиента по ID">
            <div className="flex gap-2">
              <div className="flex-1">
                <TextInput placeholder="ID клиента" value={loadId} onChange={(e) => setLoadId(e.target.value)} />
              </div>
              <button
                onClick={loadById}
                disabled={!loadId.trim() || loadMut.isPending}
                className="shrink-0 rounded-2xl bg-[var(--color-accent)] px-5 text-[13px] font-semibold text-[var(--color-accent-on)] disabled:opacity-40"
              >
                {loadMut.isPending ? '…' : 'Загрузить'}
              </button>
            </div>
          </Section>
        )}
        <div className="flex flex-col items-center pt-2">
          <Avatar firstName={form.firstName || 'И'} lastName={form.lastName || 'Ф'} size={88} />
          <button className="mt-2 text-[12px] font-medium text-[var(--color-ink-muted)]">Изменить фото</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Имя">
            <TextInput value={form.firstName} onChange={(e) => setField('firstName', e.target.value)} />
          </Field>
          <Field label="Фамилия">
            <TextInput value={form.lastName} onChange={(e) => setField('lastName', e.target.value)} />
          </Field>
        </div>

        <Section title="ID клиента">
          <div className="overflow-hidden rounded-2xl">
            <RowInput
              label="ID клиента"
              placeholder="укажите ID клиента"
              value={form.accountId ?? ''}
              onChange={(v) => setField('accountId', v || null)}
              last
            />
          </div>
          <p className="px-1 text-[11px] leading-relaxed text-[var(--color-ink-muted)]">
            Личный код из приложения клиента. Нужен, чтобы отправлять занятия клиенту на согласование.
          </p>
        </Section>

        <Section title="Связь">
          <div className="overflow-hidden rounded-2xl">
            <RowInput label="Телефон" value={form.phone ?? ''} onChange={(v) => setField('phone', v || null)} />
            <RowInput label="Telegram" placeholder="@username" value={form.telegram ?? ''} onChange={(v) => setField('telegram', v || null)} />
            <RowInput label="WhatsApp" placeholder="+7 ..." value={form.whatsapp ?? ''} onChange={(v) => setField('whatsapp', v || null)} />
            <RowInput label="Instagram" placeholder="@username" value={form.instagram ?? ''} onChange={(v) => setField('instagram', v || null)} />
            <RowInput label="MAX" placeholder="username" value={form.max ?? ''} onChange={(v) => setField('max', v || null)} last />
          </div>
        </Section>

        <Section title="Личное">
          <div className="overflow-hidden rounded-2xl">
            <RowInput label="Дата рождения" type="date" value={form.birthDate ?? ''} onChange={(v) => setField('birthDate', v || null)} />
            <RowInput label="Рост" suffix="см" inputMode="numeric" value={form.heightCm?.toString() ?? ''} onChange={(v) => setField('heightCm', v ? Number(v) : null)} />
            <RowInput label="Вес" suffix="кг" inputMode="decimal" value={form.weightKg?.toString() ?? ''} onChange={(v) => setField('weightKg', v ? Number(v) : null)} last />
          </div>
        </Section>

        <Section title="Тренировки">
          <div className="overflow-hidden rounded-2xl">
            <RowInput label="Тип" placeholder="Сила, Гипертрофия…" value={form.currentTrainingType ?? ''} onChange={(v) => setField('currentTrainingType', v || null)} />
            <RowInput label="День (0–6)" inputMode="numeric" value={form.scheduleDay?.toString() ?? ''} onChange={(v) => setField('scheduleDay', v === '' ? null : Number(v))} />
            <RowInput label="Время" placeholder="18:00" value={form.scheduleTime ?? ''} onChange={(v) => setField('scheduleTime', v || null)} last />
          </div>
        </Section>

        <Section title="Хэштеги">
          <div className="rounded-2xl bg-[var(--color-card)] p-3">
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 rounded-full bg-[var(--color-chip)] px-2.5 py-1 text-[12px]">
                  {t} <button onClick={() => removeTag(t)} aria-label="Убрать"><X size={12} /></button>
                </span>
              ))}
              <input
                placeholder="+ добавить"
                className="min-w-[80px] flex-1 rounded-full px-2 py-1 text-[12px] focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    const v = e.currentTarget.value.trim().replace(/^#?/, '#');
                    setField('hashtags', [...tags, v].join(' '));
                    e.currentTarget.value = '';
                  }
                }}
              />
            </div>
          </div>
        </Section>

        <Section title="Заметки">
          <TextArea
            rows={4}
            placeholder="↩ добавить заметку…"
            value={form.notes ?? ''}
            onChange={(e) => setField('notes', e.target.value || null)}
          />
        </Section>

        <Section title="Медицинская информация" indicator>
          <TextArea
            rows={4}
            placeholder="↩ добавить заметку…"
            value={form.medicalNotes ?? ''}
            onChange={(e) => setField('medicalNotes', e.target.value || null)}
          />
          <Field label="Пульс покоя, уд/мин">
            <TextInput inputMode="numeric" value={form.restingPulse ?? ''} onChange={(e) => setField('restingPulse', e.target.value ? Number(e.target.value) : null)} />
          </Field>
        </Section>

        {editing && !isClient && (
          <button
            onClick={remove}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-card)] py-3.5 text-[14px] font-medium text-[var(--color-danger)]"
          >
            <Trash2 size={16} /> Удалить клиента
          </button>
        )}
      </div>
    </div>
  );
}

function Section({ title, children, indicator }: { title: string; children: React.ReactNode; indicator?: boolean }) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
        {indicator && <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-danger)]" />}
        {title}
      </h3>
      {children}
    </section>
  );
}

function RowInput({
  label,
  value,
  onChange,
  type = 'text',
  inputMode,
  placeholder,
  suffix,
  last,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  inputMode?: 'numeric' | 'decimal' | 'tel' | 'text';
  placeholder?: string;
  suffix?: string;
  last?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 bg-[var(--color-card)] px-4 py-3 ${last ? 'rounded-b-2xl' : 'border-b border-[var(--color-line)]'}`}>
      <div className="text-[13px] text-[var(--color-ink-muted)] shrink-0">{label}</div>
      <input
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-transparent text-right text-[14px] font-semibold focus:outline-none"
      />
      {suffix && <span className="text-[12px] text-[var(--color-ink-muted)]">{suffix}</span>}
    </div>
  );
}

// rounded-top для первой row внутри секции
// hack: применяем rounded к контейнеру через wrapper в Section было бы чище;
// сейчас полагаемся на каскад: bg одинаковый, разделители только border-b
