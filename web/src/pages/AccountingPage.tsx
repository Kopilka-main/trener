import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { ScreenHeader } from '../components/ScreenHeader';
import { Field, TextArea, TextInput } from '../components/Field';
import { useConfirm } from '../components/ConfirmProvider';
import { useAccountingSummary, useIncomeList, type AccountingRange } from '../api/accounting';
import { useCreateExpense, useDeleteExpense, useExpenses } from '../api/expenses';
import { useGyms } from '../api/gyms';
import type { Expense } from '../api/types';

type Tab = 'summary' | 'income' | 'expenses';

const EXPENSE_CATEGORIES = ['Аренда', 'Инвентарь', 'Обучение', 'Маркетинг', 'Прочее'];

export function AccountingPage() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [range, setRange] = useState<AccountingRange>('month');
  const [tab, setTab] = useState<Tab>('summary');
  const period = computePeriod(month, range);

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title="Бухгалтерия" back />
      <div className="px-4">
        <RangePresets value={range} onChange={setRange} />
        <PeriodSwitcher
          month={month}
          range={range}
          onShift={(dir) => setMonth(shiftPeriod(month, range, dir))}
          label={period.label}
        />
        <div className="mt-2 grid grid-cols-3 rounded-2xl bg-[var(--color-chip)] p-1">
          <TabButton active={tab === 'summary'} onClick={() => setTab('summary')}>Сводка</TabButton>
          <TabButton active={tab === 'income'} onClick={() => setTab('income')}>Доходы</TabButton>
          <TabButton active={tab === 'expenses'} onClick={() => setTab('expenses')}>Расходы</TabButton>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-3">
        {tab === 'summary' && <SummaryTab month={month} range={range} />}
        {tab === 'income' && <IncomeTab from={period.from} to={period.to} />}
        {tab === 'expenses' && <ExpensesTab from={period.from} to={period.to} />}
      </div>
    </div>
  );
}

function RangePresets({ value, onChange }: { value: AccountingRange; onChange: (r: AccountingRange) => void }) {
  const opts: { v: AccountingRange; label: string }[] = [
    { v: 'month', label: 'Месяц' },
    { v: 'quarter', label: 'Квартал' },
    { v: 'year', label: 'Год' },
  ];
  return (
    <div className="mt-2 inline-flex rounded-full bg-[var(--color-chip)] p-0.5">
      {opts.map((o) => {
        const active = o.v === value;
        return (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            className={`rounded-full px-3 py-1 text-[12px] font-medium ${active ? 'bg-[var(--color-accent)] text-[var(--color-accent-on)]' : 'text-[var(--color-ink-muted)]'}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function PeriodSwitcher({ month, range, onShift, label }: { month: string; range: AccountingRange; onShift: (d: -1 | 1) => void; label: string }) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center justify-between pt-2">
      <button
        onClick={() => onShift(-1)}
        className="flex h-9 w-9 items-center justify-center rounded-full active:bg-black/5"
        aria-label="Предыдущий период"
      >
        <ChevronLeft size={18} />
      </button>
      <div className="text-[15px] font-bold capitalize" title={`${month} · ${range}`}>{label}</div>
      <button
        onClick={() => onShift(1)}
        className="flex h-9 w-9 items-center justify-center rounded-full active:bg-black/5"
        aria-label="Следующий период"
      >
        <ChevronRight size={18} />
      </button>
      <button
        onClick={() => navigate('/trainer/gyms')}
        className="text-[12px] text-[var(--color-ink-muted)] underline"
      >
        залы
      </button>
    </div>
  );
}

function computePeriod(month: string, range: AccountingRange): { label: string; from: string; to: string } {
  const [y, m] = month.split('-').map(Number);
  if (range === 'year') {
    return { label: String(y), from: `${y}-01-01`, to: `${y}-12-31` };
  }
  if (range === 'quarter') {
    const q = Math.floor((m - 1) / 3); // 0..3
    const startM = q * 3 + 1;
    const endM = startM + 2;
    return {
      label: `${q + 1}-й квартал ${y}`,
      from: `${y}-${String(startM).padStart(2, '0')}-01`,
      to: `${y}-${String(endM).padStart(2, '0')}-31`,
    };
  }
  return { label: formatMonthRu(month), from: `${month}-01`, to: `${month}-31` };
}

function shiftPeriod(month: string, range: AccountingRange, dir: -1 | 1): string {
  const [y, m] = month.split('-').map(Number);
  if (range === 'year') return `${y + dir}-${String(m).padStart(2, '0')}`;
  if (range === 'quarter') {
    return shiftMonth(month, dir * 3);
  }
  return shiftMonth(month, dir);
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl py-2 text-[13px] font-medium ${active ? 'bg-[var(--color-card)] font-semibold text-ink' : 'text-[var(--color-ink-muted)]'}`}
    >
      {children}
    </button>
  );
}

// ─── Сводка ────────────────────────────────────────────────────────────────

function SummaryTab({ month, range }: { month: string; range: AccountingRange }) {
  const { data: summary } = useAccountingSummary(month, range);
  if (!summary) return <div className="text-center text-[13px] text-[var(--color-ink-muted)]">Загрузка…</div>;
  const profitColor = summary.profit >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-[var(--color-card)] p-4 space-y-3">
        <SummaryRow label="Доходы" value={summary.income} color="var(--color-success)" />
        <SummaryRow label="Расходы" value={-summary.expenses} color="var(--color-danger)" />
        <div className="border-t border-[var(--color-line)] pt-3">
          <SummaryRow label="Прибыль" value={summary.profit} color={profitColor} bold />
        </div>
      </div>
      <div className="rounded-2xl bg-[var(--color-card)] p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
          Топ клиентов
        </div>
        {summary.topClients.length === 0 ? (
          <div className="py-3 text-center text-[13px] text-[var(--color-ink-muted)]">Нет платежей за период</div>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {summary.topClients.map((c, i) => (
              <li key={c.clientId} className="flex items-center gap-2 text-[14px]">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-chip)] text-[12px] font-bold">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate">{c.clientName}</span>
                <span className="shrink-0 font-semibold tabular-nums">{formatMoney(c.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ label, value, color, bold }: { label: string; value: number; color: string; bold?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className={`text-[14px] ${bold ? 'font-bold' : 'text-[var(--color-ink-muted)]'}`}>{label}</span>
      <span className={`tabular-nums ${bold ? 'text-[22px] font-bold' : 'text-[16px] font-semibold'}`} style={{ color }}>
        {value >= 0 ? formatMoney(value) : `−${formatMoney(Math.abs(value))}`}
      </span>
    </div>
  );
}

// ─── Доходы ────────────────────────────────────────────────────────────────

function IncomeTab({ from, to }: { from: string; to: string }) {
  const { data: items = [] } = useIncomeList(from, to);
  const total = items.reduce((s, i) => s + i.totalPaid, 0);
  return (
    <div className="space-y-2">
      <div className="rounded-2xl bg-[var(--color-card)] p-3 text-center">
        <div className="text-[12px] text-[var(--color-ink-muted)]">Всего за период</div>
        <div className="text-[20px] font-bold tabular-nums text-[var(--color-success)]">{formatMoney(total)}</div>
      </div>
      {items.length === 0 ? (
        <div className="py-6 text-center text-[13px] text-[var(--color-ink-muted)]">Нет платежей</div>
      ) : (
        <ul className="overflow-hidden rounded-2xl">
          {items.map((it, i) => (
            <li
              key={it.id}
              className={`flex items-center gap-3 bg-[var(--color-card)] px-3 py-3 ${
                i < items.length - 1 ? 'border-b border-[var(--color-line)]' : ''
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold">{it.clientName}</div>
                <div className="text-[11px] text-[var(--color-ink-muted)]">
                  {it.lessonsPaid} тренировок · {formatDateRu(it.createdAt.slice(0, 10))}
                </div>
              </div>
              <div className="shrink-0 text-[14px] font-bold tabular-nums">{formatMoney(it.totalPaid)}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Расходы ────────────────────────────────────────────────────────────────

function ExpensesTab({ from, to }: { from: string; to: string }) {
  const { data: items = [] } = useExpenses(from, to);
  const deleteMut = useDeleteExpense();
  const confirm = useConfirm();
  const [adding, setAdding] = useState(false);
  const total = items.reduce((s, i) => s + i.amount, 0);

  const onDelete = async (e: Expense) => {
    if (!(await confirm(`Удалить расход «${e.category}» на ${formatMoney(e.amount)}?`, { confirmLabel: 'Удалить', danger: true }))) return;
    deleteMut.mutate(e.id);
  };

  return (
    <div className="space-y-2">
      <div className="rounded-2xl bg-[var(--color-card)] p-3 text-center">
        <div className="text-[12px] text-[var(--color-ink-muted)]">Всего за период</div>
        <div className="text-[20px] font-bold tabular-nums text-[var(--color-danger)]">{formatMoney(total)}</div>
      </div>
      {items.length > 0 && (
        <ul className="overflow-hidden rounded-2xl">
          {items.map((e, i) => (
            <li
              key={e.id}
              className={`flex items-center gap-3 bg-[var(--color-card)] px-3 py-3 ${
                i < items.length - 1 ? 'border-b border-[var(--color-line)]' : ''
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold">{e.category}</div>
                <div className="text-[11px] text-[var(--color-ink-muted)]">
                  {formatDateRu(e.date)}
                  {e.note ? ` · ${e.note}` : ''}
                </div>
              </div>
              <div className="shrink-0 text-[14px] font-bold tabular-nums text-[var(--color-danger)]">
                −{formatMoney(e.amount)}
              </div>
              <button
                onClick={() => onDelete(e)}
                className="flex h-7 w-7 shrink-0 items-center justify-center text-[var(--color-ink-muted)]"
                aria-label="Удалить"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {adding ? (
        <ExpenseForm onClose={() => setAdding(false)} />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--color-line)] py-3 text-[13px] font-medium text-[var(--color-ink-muted)]"
        >
          <Plus size={15} /> Добавить расход
        </button>
      )}
    </div>
  );
}

function ExpenseForm({ onClose }: { onClose: () => void }) {
  const createMut = useCreateExpense();
  const { data: gyms = [] } = useGyms();
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [gymId, setGymId] = useState('');
  const [note, setNote] = useState('');

  const submit = async () => {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      alert('Укажите сумму расхода');
      return;
    }
    await createMut.mutateAsync({
      category,
      amount: amt,
      date,
      gymId: gymId || null,
      note: note.trim() || null,
    });
    onClose();
  };

  return (
    <div className="rounded-2xl bg-[var(--color-card)] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[14px] font-semibold">Новый расход</h4>
        <button onClick={onClose} className="text-[12px] text-[var(--color-ink-muted)]">Отмена</button>
      </div>
      <Field label="Категория">
        <div className="flex flex-wrap gap-1.5">
          {EXPENSE_CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full px-3 py-1.5 text-[12px] ${category === c ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-chip)]'}`}
              style={category === c ? { color: 'var(--color-accent-on)' } : undefined}
            >
              {c}
            </button>
          ))}
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Сумма, ₽">
          <TextInput inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Дата">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-2xl bg-[var(--color-chip)] px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-ink/10"
          />
        </Field>
      </div>
      {gyms.length > 0 && (
        <Field label="Зал (необязательно)">
          <select
            value={gymId}
            onChange={(e) => setGymId(e.target.value)}
            className="w-full rounded-2xl bg-[var(--color-chip)] px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-ink/10"
          >
            <option value="">—</option>
            {gyms.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </Field>
      )}
      <Field label="Заметка">
        <TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <button
        onClick={submit}
        disabled={createMut.isPending}
        className="w-full rounded-2xl bg-[var(--color-accent)] py-3 text-[14px] font-semibold text-[var(--color-accent-on)] disabled:opacity-50"
      >
        {createMut.isPending ? 'Сохранение…' : 'Сохранить'}
      </button>
    </div>
  );
}

// ─── helpers ───────────────────────────────────────────────────────────────

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthRu(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
}

function formatMoney(value: number): string {
  return `${Math.round(value).toLocaleString('ru-RU')} ₽`;
}

function formatDateRu(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
