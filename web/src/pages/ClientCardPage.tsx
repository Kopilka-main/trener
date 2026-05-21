import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, BarChart3, CalendarDays, ChevronDown, ChevronRight, ChevronUp, Dumbbell, MessageSquare, Pencil, Plus, Trophy, Wallet, X } from 'lucide-react';
import { ScreenHeader } from '../components/ScreenHeader';
import { Avatar } from '../components/Avatar';
import { Field, TextArea, TextInput } from '../components/Field';
import { useConfirm } from '../components/ConfirmProvider';
import { useClient, useClientBalance } from '../api/clients';
import { useClientWorkouts } from '../api/client-workouts';
import { useClientPackages, useCreatePackage, useDeletePackage } from '../api/packages';
import { useTrainerAlerts } from '../api/alerts';
import { useClientStats, type ClientStats } from '../api/client-stats';
import { calcAge, formatBirth } from '../lib/format';
import { fullName } from '../lib/initials';
import type { PaymentPackage, PaymentPackageInput } from '../api/types';

// Полноценная страница карточки клиента. Открывается тапом по клиенту в списке.
// Сверху — крупная CTA «Перейти к тренировкам», ниже — данные и история.
export function ClientCardPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: client } = useClient(id);
  const { data: workouts } = useClientWorkouts(id);
  const { data: alerts = [] } = useTrainerAlerts();
  const myAlert = alerts.find((a) => a.clientId === id);

  if (!client) return null;

  const age = calcAge(client.birthDate);
  const tags = (client.hashtags ?? '').split(/\s+/).filter(Boolean);
  const history = workouts?.history ?? [];
  const totalWorkouts = history.length + (workouts?.current ? 1 : 0);

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title="Карточка клиента" back />
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
          className="flex w-full items-center gap-3 rounded-2xl bg-[var(--color-accent)] p-4 text-left text-[var(--color-accent-on)]"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10">
            <Dumbbell size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-bold">Перейти к тренировкам</span>
            <span className="block text-[12px] opacity-70">
              текущая + история
            </span>
          </span>
          <ChevronRight size={18} className="shrink-0" />
        </button>

        {/* Две вторичные CTA — календарь и чат по клиенту */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate(`/trainer/calendar?clientId=${id}`)}
            className="flex flex-col items-start gap-2 rounded-2xl bg-[var(--color-card)] p-4 text-left"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-chip)]">
              <CalendarDays size={20} />
            </span>
            <span>
              <span className="block text-[14px] font-bold leading-tight">Календарь</span>
              <span className="block text-[11px] text-[var(--color-ink-muted)]">занятия клиента</span>
            </span>
          </button>
          <button
            onClick={() => navigate(`/trainer/chat/${id}`)}
            className="flex flex-col items-start gap-2 rounded-2xl bg-[var(--color-card)] p-4 text-left"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-chip)]">
              <MessageSquare size={20} />
            </span>
            <span>
              <span className="block text-[14px] font-bold leading-tight">Написать</span>
              <span className="block text-[11px] text-[var(--color-ink-muted)]">чат с клиентом</span>
            </span>
          </button>
        </div>

        {myAlert && (
          <div
            className="flex items-center gap-2 rounded-2xl px-3 py-2.5 text-[13px] font-medium"
            style={{
              background: myAlert.severity === 'danger' ? 'rgba(200,57,44,0.10)' : 'rgba(217,145,43,0.12)',
              color: myAlert.severity === 'danger' ? 'var(--color-danger)' : '#9a6118',
            }}
          >
            <AlertTriangle size={16} className="shrink-0" />
            <span>{myAlert.message}</span>
          </div>
        )}

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

        <StatsSection clientId={id} />

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
  // remaining = paid − completedApproved. >0 — оплачено сверх; <0 — в долг; 0 — ровно.
  const r = balance.remaining;
  const balanceLabel = r === 0 ? '0' : r > 0 ? `+${r}` : `${r}`;
  const balanceTone = r === 0 ? undefined : r > 0 ? 'success' : 'danger';
  const balanceColor =
    balanceTone === 'success' ? 'var(--color-success)' : balanceTone === 'danger' ? 'var(--color-danger)' : undefined;
  const balanceHint = r === 0 ? 'ровно по оплате' : r > 0 ? 'тренировок оплачено сверх' : 'тренировок в долг';
  return (
    <div className="rounded-2xl bg-[var(--color-card)] p-4">
      <div className="grid grid-cols-2 gap-3 text-center">
        <div>
          <div className="text-[28px] font-bold tabular-nums leading-none">{balance.completed}</div>
          <div className="mt-1 text-[11px] text-[var(--color-ink-muted)]">проведено</div>
        </div>
        <div>
          <div
            className="text-[28px] font-bold tabular-nums leading-none"
            style={balanceColor ? { color: balanceColor } : undefined}
          >
            {balanceLabel}
          </div>
          <div className="mt-1 text-[11px] text-[var(--color-ink-muted)]">{balanceHint}</div>
        </div>
      </div>
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
        className="w-full rounded-2xl bg-[var(--color-accent)] py-3 text-[14px] font-semibold text-[var(--color-accent-on)] disabled:opacity-50"
      >
        {createMut.isPending ? 'Сохранение…' : 'Сохранить пакет'}
      </button>
    </div>
  );
}

// ─── Статистика ─────────────────────────────────────────────────────────────

function StatsSection({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="space-y-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]"
      >
        <BarChart3 size={12} />
        <span>Статистика</span>
        <span className="ml-auto">{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
      </button>
      {open && <StatsBody clientId={clientId} />}
    </section>
  );
}

function StatsBody({ clientId }: { clientId: string }) {
  const { data: stats } = useClientStats(clientId);
  if (!stats) {
    return (
      <div className="rounded-2xl bg-[var(--color-card)] p-4 text-[13px] text-[var(--color-ink-muted)]">
        Загрузка…
      </div>
    );
  }
  if (stats.total === 0) {
    return (
      <div className="rounded-2xl bg-[var(--color-card)] p-4 text-center text-[13px] text-[var(--color-ink-muted)]">
        Завершённых тренировок ещё нет
      </div>
    );
  }
  const maxFreq = Math.max(1, ...stats.frequency.map((f) => f.count));
  const maxTonnage = Math.max(1, ...stats.totals.map((t) => t.tonnage));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <StatTile label="Всего тренировок" value={`${stats.total}`} />
        <StatTile label="В среднем в неделю" value={stats.avgPerWeek.toFixed(1).replace('.', ',')} />
      </div>

      <div className="rounded-2xl bg-[var(--color-card)] p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
          Посещаемость за 12 недель
        </div>
        <div className="mt-3 flex items-end gap-1 h-12">
          {buildLast12Weeks(stats.frequency).map((c, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm"
              style={{
                height: `${Math.max(8, (c / maxFreq) * 100)}%`,
                background: c === 0 ? 'var(--color-chip)' : 'var(--color-ink)',
                opacity: c === 0 ? 0.5 : 0.3 + 0.7 * (c / maxFreq),
              }}
              title={`${c} тренировок`}
            />
          ))}
        </div>
      </div>

      {stats.records.length > 0 && (
        <div className="rounded-2xl bg-[var(--color-card)] p-4">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
            <Trophy size={12} /> Личные рекорды
          </div>
          <ul className="mt-2 space-y-1.5">
            {stats.records.map((r, i) => (
              <li key={i} className="flex items-baseline justify-between gap-2 text-[13px]">
                <span className="truncate">{r.exerciseName}</span>
                <span className="shrink-0 font-semibold tabular-nums">
                  {r.weightKg} кг × {r.reps}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {stats.totals.length > 0 && (
        <div className="rounded-2xl bg-[var(--color-card)] p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
            Тоннаж по месяцам (последние 6)
          </div>
          <ul className="mt-2 space-y-1.5">
            {stats.totals.map((t) => (
              <li key={t.month}>
                <div className="flex items-baseline justify-between text-[12px]">
                  <span className="capitalize text-[var(--color-ink-muted)]">{formatMonthShort(t.month)}</span>
                  <span className="font-semibold tabular-nums">{t.tonnage.toLocaleString('ru-RU')} кг</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-chip)]">
                  <div
                    className="h-full bg-[var(--color-accent-2)]"
                    style={{ width: `${(t.tonnage / maxTonnage) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[var(--color-card)] p-3 text-center">
      <div className="text-[20px] font-bold tabular-nums">{value}</div>
      <div className="text-[11px] text-[var(--color-ink-muted)]">{label}</div>
    </div>
  );
}

// Возвращает массив длиной 12 — количество тренировок по неделям подряд,
// от 12 недель назад до текущей. Гарантирует наличие нулей для пустых недель.
function buildLast12Weeks(frequency: ClientStats['frequency']): number[] {
  const byKey = new Map(frequency.map((f) => [f.week, f.count]));
  const result: number[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    const week = `${d.getFullYear()}-${String(getWeek(d)).padStart(2, '0')}`;
    result.push(byKey.get(week) ?? 0);
  }
  return result;
}

function getWeek(d: Date): number {
  const onejan = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
}

function formatMonthShort(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' });
}

function formatMoney(value: number): string {
  return `${Math.round(value).toLocaleString('ru-RU')} ₽`;
}

function formatDateRu(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

