import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { ScreenHeader } from '../components/ScreenHeader';
import { Avatar } from '../components/Avatar';
import { Field, TextArea, TextInput } from '../components/Field';
import { useTrainer, useUpdateTrainer } from '../api/trainer';
import type { TrainerInput } from '../api/types';

export function TrainerEditPage() {
  const navigate = useNavigate();
  const { data: trainer } = useTrainer();
  const updateMut = useUpdateTrainer();
  const [form, setForm] = useState<TrainerInput | null>(null);

  useEffect(() => {
    if (trainer) {
      const { id: _id, ...rest } = trainer;
      setForm(rest);
    }
  }, [trainer]);

  if (!form) return null;

  const setField = <K extends keyof TrainerInput>(k: K, v: TrainerInput[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const submit = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      alert('Имя и фамилия обязательны');
      return;
    }
    await updateMut.mutateAsync(form);
    navigate(-1);
  };

  const tags = (form.hashtags ?? '').split(/\s+/).filter(Boolean);

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title="Карточка тренера"
        back
        right={<button onClick={submit} className="text-[14px] font-semibold">Сохранить</button>}
      />
      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-4">
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

        <Field label="Должность">
          <TextInput placeholder="Персональный тренер" value={form.title ?? ''} onChange={(e) => setField('title', e.target.value || null)} />
        </Field>
        <Field label="Специализация (подзаголовок)">
          <TextInput placeholder="Силовая · Реабилитация" value={form.specialties ?? ''} onChange={(e) => setField('specialties', e.target.value || null)} />
        </Field>

        <Field label="Хэштеги">
          <div className="rounded-2xl bg-[var(--color-card)] p-3">
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 rounded-full bg-[var(--color-chip)] px-2.5 py-1 text-[12px]">
                  {t}
                  <button onClick={() => setField('hashtags', tags.filter((x) => x !== t).join(' ') || null)} aria-label="Убрать">
                    <X size={12} />
                  </button>
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
        </Field>

        <Field label="О себе">
          <TextArea rows={4} placeholder="↩ добавить…" value={form.bio ?? ''} onChange={(e) => setField('bio', e.target.value || null)} />
        </Field>

        <Field label="Телефон">
          <TextInput value={form.phone ?? ''} onChange={(e) => setField('phone', e.target.value || null)} />
        </Field>
        <Field label="Email">
          <TextInput value={form.email ?? ''} onChange={(e) => setField('email', e.target.value || null)} />
        </Field>
        <Field label="Telegram">
          <TextInput placeholder="@username" value={form.telegram ?? ''} onChange={(e) => setField('telegram', e.target.value || null)} />
        </Field>
        <Field label="Instagram">
          <TextInput placeholder="@username" value={form.instagram ?? ''} onChange={(e) => setField('instagram', e.target.value || null)} />
        </Field>
      </div>
    </div>
  );
}
