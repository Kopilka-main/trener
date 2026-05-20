import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, Dumbbell, Pencil, Plus, Wallet, X } from 'lucide-react';
import { ScreenHeader } from '../components/ScreenHeader';
import { Avatar } from '../components/Avatar';
import { Field, TextArea, TextInput } from '../components/Field';
import { useConfirm } from '../components/ConfirmProvider';
import { useClient, useClientBalance } from '../api/clients';
import { useClientWorkouts } from '../api/client-workouts';
import { useClientPackages, useCreatePackage, useDeletePackage } from '../api/packages';
import { calcAge, formatBirth, formatDate, formatDuration } from '../lib/format';
import { fullName } from '../lib/initials';
import type { ClientWorkoutSummary, PaymentPackage, PaymentPackageInput } from '../api/types';

// Полноценная страница карточки клиента. Открывается тапом по клиенту в списке.
// Сверху — крупная CTA «Перейти к тренировкам», ниже — данные и история.
export function ClientCardPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: client } = useClient(id);
  const { data: workouts } = useClientWorkouts(id);

  if (!client) return null;

  const age = calcAge(client.birthDate);
  const tags = (client.hashtags ?? '').split(/\s+/).filter(Boolean);
  const history = workouts?.history ?? [];
  const totalWorkouts = history.length + (workouts?.current ? 1 : 0);
  const recent = history.slice(0, 3);

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title="Карточка клиента"
        back
        right={
          <button
            onClick={() => navigate(`/trainer/clients/${id}/edit`)}
            className="flex h-8 w-8 items-center justify-center"
            aria-label="Редактировать"
          >
            <Pencil size={16} />
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-5">
        {/* Шапка: аватар + имя + теги */}
        <div className="rounded-3xl bg-[var(--color-card)] p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Avatar firstName={client.firstName} lastName={client.lastName} size={64} />
            <div className="min-w-0">
              <div className="text-[19px] font-bold leading-tight">
                {fullName(client.firstName, client.lastName)}
              </div>
              <div className="mt-0.5 text-[13px] text-[var(--color-ink-muted)]">
                {age !== null ? `${age} лет · ` : ''}{totalWorkouts} тренировок
              </div>
              {client.currentTrainingType && (
                <div className="text-[12px] text-[var(--color-ink-muted)]">{client.currentTrainingType}</div>
              )}
            </div>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span key={t} className="rounded-full bg-[var(--color-chip)] px-3 py-1.5 text-[13px]">{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* CTA: переход к тренировкам */}
        <button
          onClick={() => navigate(`/trainer/clients/${id}/workouts`)}
          className="flex w-full items-center gap-3 rounded-2xl bg-ink p-4 text-left"
          style={{ color: '#ffffff' }}
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10">
            <Dumbbell size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-bold">Перейти к тренировкам</span>
            <span className="block text-[12px]" style={{ color: 'rgba(255,255,255,0.7)' }}>
              текущая + история
            </span>
          </span>
          <ChevronRight size={18} className="shrink-0" />
        </button>

        <Section title="Тренировки и оплата">
          <BalanceCard clientId={id} />
          <PackagesBlock clientId={id} />
        </Section>

        <Section title="Персональные данные">
          <div className="overflow-hidden rounded-2xl">
            <Row label="Телефон" value={client.phone ?? '—'} />
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

        {client.medicalNotes && (
          <Section title="Медицинская информация" indicator>
            <div className="rounded-2xl bg-[var(--color-card)] p-4 text-[14px] leading-relaxed whitespace-pre-line">
              {client.medicalNotes}
            </div>
          </Section>
        )}

        {recent.length > 0 && (
          <Section title="Последние тренировки">
            <ul className="overflow-hidden rounded-2xl">
              {recent.map((w, i) => (
                <HistoryItem key={w.id} workout={w} last={i === recent.length - 1} />
              ))}
            </ul>
          </Section>
        )}

        <button
          onClick={() => navigate(`/trainer/clients/${id}/edit`)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-card)] py-3.5 text-[14px] font-medium"
        >
          <Pencil size={16} /> Редактировать данные
        </button>
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

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 bg-[var(--color-card)] px-4 py-3 ${
        last ? '' : 'border-b border-[var(--color-line)]'
      }`}
    >
      <div className="text-[13px] text-[var(--color-ink-muted)]">{label}</div>
      <div className="text-right text-[14px] font-semibold">{value}</div>
    </div>
  );
}

// ─── Баланс тренировок ──────────────────────────────────────────────────────

function BalanceCard({ clientId }: { clientId: string }) {
  const { data: balance } = useClientBalance(clientId);
  if (!balance) {
    return (
      <div className="rounded-2xl bg-[var(--color-card)] p-4 text-[13px] text-[var(--color-ink-muted)]">
        Загрузка баланса…
      </div>
    );
  }
  const negative = balance.remaining < 0;
  const remainingLabel = negative
    ? `${balance.remaining}, требуется оплата`
    : `осталось ${balance.remaining}`;
  const remainingColor = negative ? 'var(--color-danger)' : 'var(--color-success)';
  return (
    <div className="rounded-2xl bg-[var(--color-card)] p-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[12px] text-[var(--color-ink-muted)]">Остаток</span>
        <span className="text-[24px] font-bold tabular-nums" style={{ color: remainingColor }}>
          {remainingLabel}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <BalanceCell label="Оплачено" value={balance.paid} />
        <BalanceCell label="Проведено" value={balance.completedApproved} />
        <BalanceCell
          label="Несогласовано"
          value={balance.unapproved}
          tone={balance.unapproved > 0 ? 'warn' : undefined}
        />
      </div>
      <div className="text-center text-[11px] text-[var(--color-ink-muted)]">
        Назначено в календаре · {balance.scheduled}
      </div>
    </div>
  );
}

function BalanceCell({ label, value, tone }: { label: string; value: number; tone?: 'warn' }) {
  const color = tone === 'warn' ? '#d9912b' : undefined;
  return (
    <div className="rounded-xl bg-[var(--color-chip)] py-2">
      <div className="text-[16px] font-bold tabular-nums" style={color ? { color } : undefined}>
        {value}
      </div>
      <div className="text-[10px] text-[var(--color-ink-muted)]">{label}</div>
    </div>
  );
}

// ─── Пакеты ─────────────────────────────────────────────────────────────────

function PackagesBlock({ clientId }: { clientId: string }) {
  const { data: packages = [] } = useClientPackages(clientId);
  const deleteMut = useDeletePackage(clientId);
  const confirm = useConfirm();
  const [adding, setAdding] = useState(false);

  const onDelete = async (pkg: PaymentPackage) => {
    if (!(await confirm(`Удалить пакет на ${pkg.lessonsPaid} тренировок?`, { confirmLabel: 'Удалить', danger: true }))) return;
    deleteMut.mutate(pkg.id);
  };

  return (
    <div className="space-y-2">
      {packages.length > 0 && (
        <ul className="overflow-hidden rounded-2xl">
          {packages.map((p, i) => (
            <PackageRow
              key={p.id}
              pkg={p}
              last={i === packages.length - 1 && !adding}
              onDelete={() => onDelete(p)}
            />
          ))}
        </ul>
      )}
      {adding ? (
        <PackageForm clientId={clientId} onClose={() => setAdding(false)} />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--color-line)] py-3 text-[13px] font-medium text-[var(--color-ink-muted)]"
        >
          <Plus size={15} /> Добавить пакет
        </button>
      )}
    </div>
  );
}

function PackageRow({ pkg, last, onDelete }: { pkg: PaymentPackage; last: boolean; onDelete: () => void }) {
  const closed = pkg.status !== 'active';
  return (
    <li
      className={`flex items-center gap-3 bg-[var(--color-card)] px-3 py-3 ${
        last ? '' : 'border-b border-[var(--color-line)]'
      } ${closed ? 'opacity-50' : ''}`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-chip)]">
        <Wallet size={16} className="text-[var(--color-ink-muted)]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold">
          {pkg.lessonsPaid} × {formatMoney(pkg.pricePerLesson)} = {formatMoney(pkg.totalPaid)}
        </div>
        <div className="text-[11px] text-[var(--color-ink-muted)]">
          {[
            `с ${formatDateRu(pkg.startsAt)}`,
            pkg.workoutType,
            closed ? (pkg.status === 'closed' ? 'закрыт' : 'отменён') : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </div>
      </div>
      <button
        onClick={onDelete}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--color-ink-muted)] active:bg-black/5"
        aria-label="Удалить пакет"
      >
        <X size={14} />
      </button>
    </li>
  );
}

function PackageForm({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const createMut = useCreatePackage(clientId);
  const [lessons, setLessons] = useState('20');
  const [price, setPrice] = useState('2000');
  const [startsAt, setStartsAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [workoutType, setWorkoutType] = useState('');
  const [note, setNote] = useState('');

  const lessonsNum = Number(lessons);
  const priceNum = Number(price);
  const totalPreview = Number.isFinite(lessonsNum) && Number.isFinite(priceNum) ? lessonsNum * priceNum : 0;

  const submit = async () => {
    if (!Number.isFinite(lessonsNum) || lessonsNum <= 0) {
      alert('Укажите число оплаченных тренировок');
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      alert('Укажите стоимость одной тренировки');
      return;
    }
    if (!startsAt) {
      alert('Укажите дату начала пакета');
      return;
    }
    const input: PaymentPackageInput = {
      lessonsPaid: Math.round(lessonsNum),
      pricePerLesson: priceNum,
      totalPaid: lessonsNum * priceNum,
      startsAt,
      workoutType: workoutType.trim() || null,
      note: note.trim() || null,
    };
    await createMut.mutateAsync(input);
    onClose();
  };

  return (
    <div className="rounded-2xl bg-[var(--color-card)] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[14px] font-semibold">Новый пакет</h4>
        <button onClick={onClose} className="text-[12px] text-[var(--color-ink-muted)]">Отмена</button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Тренировок">
          <TextInput inputMode="numeric" value={lessons} onChange={(e) => setLessons(e.target.value)} />
        </Field>
        <Field label="₽ за тренировку">
          <TextInput inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
      </div>
      <Field label="Дата начала">
        <input
          type="date"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          className="w-full rounded-2xl bg-[var(--color-chip)] px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-ink/10"
        />
      </Field>
      <Field label="Тип (необязательно)">
        <TextInput placeholder="Силовая, Йога…" value={workoutType} onChange={(e) => setWorkoutType(e.target.value)} />
      </Field>
      <Field label="Заметка">
        <TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div className="rounded-xl bg-[var(--color-chip)] px-3 py-2 text-[12px] text-center">
        Итого пакет: <span className="font-bold tabular-nums">{formatMoney(totalPreview)}</span>
      </div>
      <button
        onClick={submit}
        disabled={createMut.isPending}
        className="w-full rounded-2xl bg-ink py-3 text-[14px] font-semibold disabled:opacity-50"
        style={{ color: '#ffffff' }}
      >
        {createMut.isPending ? 'Сохранение…' : 'Сохранить пакет'}
      </button>
    </div>
  );
}

function formatMoney(value: number): string {
  return `${Math.round(value).toLocaleString('ru-RU')} ₽`;
}

function formatDateRu(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function HistoryItem({ workout, last }: { workout: ClientWorkoutSummary; last: boolean }) {
  const dateStr = formatDate(workout.completedAt ?? workout.createdAt);
  const [month, day] = dateStr.split(' ');
  return (
    <li
      className={`flex items-center gap-3 bg-[var(--color-card)] px-3 py-2.5 ${
        last ? '' : 'border-b border-[var(--color-line)]'
      }`}
    >
      <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-[var(--color-chip)] text-center leading-tight">
        <span className="text-[10px] font-medium uppercase text-[var(--color-ink-muted)]">{month}</span>
        <span className="text-sm font-bold tabular-nums">{day}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold">{workout.name}</div>
        {workout.status === 'skipped' ? (
          <div className="text-[11px] text-[var(--color-danger)]">пропущена</div>
        ) : (
          <div className="text-[11px] text-[var(--color-ink-muted)]">
            {workout.durationSec ? formatDuration(workout.durationSec) : ''}
            {workout.rpe ? ` · RPE ${workout.rpe}` : ''}
          </div>
        )}
      </div>
    </li>
  );
}
