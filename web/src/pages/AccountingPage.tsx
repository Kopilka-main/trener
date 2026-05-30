import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { ScreenHeader } from '../components/ScreenHeader';
import { Field, TextArea, TextInput } from '../components/Field';
import { useConfirm } from '../components/ConfirmProvider';
import { useAccountingSummary, useIncomeList, type AccountingRange } from '../api/accounting';
import { useCreateExpense, useDeleteExpense, useExpenses } from '../api/expenses';
import { useCreateIncomeRecord } from '../api/incomes';
import { useGyms } from '../api/gyms';
import type { Expense } from '../api/types';

type Tab = 'summary' | 'income' | 'expenses';

const EXPENSE_CATEGORIES = ['Аренда', 'Инвентарь', 'Обучение', 'Фарма', 'Прочее'];

export function AccountingPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [range, setRange] = useState<AccountingRange>('month');
  // Кастомный диапазон используется когда range === 'custom'.
  const [customFrom, setCustomFrom] = useState<string>(`${today.slice(0, 7)}-01`);
  const [customTo, setCustomTo] = useState<string>(today);
  const [tab, setTab] = useState<Tab>('summary');
  const period =
    range === 'custom'
      ? { from: customFrom, to: customTo, label: formatCustomRange(customFrom, customTo) }
      : computePeriod(month, range);

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title="Бухгалтерия" back />
      <div className="px-4">
        <RangePresets value={range} onChange={setRange} />
        {range !== 'custom' ? (
          <PeriodSwitcher
            month={month}
            range={range}
            onShift={(dir) => setMonth(shiftPeriod(month, range, dir))}
            onChangeMonth={setMonth}
          />
        ) : (
          <CustomDateRange
            from={customFrom}
            to={customTo}
            onChangeFrom={setCustomFrom}
            onChangeTo={setCustomTo}
          />
        )}
        <div className="mt-2 grid grid-cols-3 rounded-2xl bg-[var(--color-chip)] p-1">
          <TabButton active={tab === 'summary'} onClick={() => setTab('summary')}>Сводка</TabButton>
          <TabButton active={tab === 'income'} onClick={() => setTab('income')}>Доходы</TabButton>
          <TabButton active={tab === 'expenses'} onClick={() => setTab('expenses')}>Расходы</TabButton>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-3">
        {tab === 'summary' && (
          <SummaryTab
            month={month}
            range={range}
            customFrom={range === 'custom' ? customFrom : undefined}
            customTo={range === 'custom' ? customTo : undefined}
          />
        )}
        {tab === 'income' && <IncomeTab from={period.from} to={period.to} />}
        {tab === 'expenses' && <ExpensesTab from={period.from} to={period.to} />}
      </div>
    </div>
  );
}

function CustomDateRange({
  from,
  to,
  onChangeFrom,
  onChangeTo,
}: {
  from: string;
  to: string;
  onChangeFrom: (v: string) => void;
  onChangeTo: (v: string) => void;
}) {
  return (
    <div className="mt-3 space-y-3">
      <DateSpinner label="С" value={from} onChange={onChangeFrom} />
      <DateSpinner label="По" value={to} onChange={onChangeTo} />
    </div>
  );
}

// ─── Кастомный date-picker: 3 ячейки (день / месяц / год) с сеттерами ↑↓ ───

function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}

function toISO(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function DateSpinner({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [y, m, d] = value.split('-').map(Number);

  const setDay = (newD: number) => {
    const maxD = daysInMonth(y, m);
    const clamped = Math.max(1, Math.min(maxD, newD));
    onChange(toISO(y, m, clamped));
  };
  const setMonth = (newM: number) => {
    const clamped = Math.max(1, Math.min(12, newM));
    const maxD = daysInMonth(y, clamped);
    onChange(toISO(y, clamped, Math.min(d, maxD)));
  };
  const setYear = (newY: number) => {
    const clamped = Math.max(1900, Math.min(2100, newY));
    const maxD = daysInMonth(clamped, m);
    onChange(toISO(clamped, m, Math.min(d, maxD)));
  };

  return (
    <div className="flex items-center gap-2">
      <span className="w-6 shrink-0 font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-ink-mutedXL)]">
        {label}
      </span>
      <div className="flex min-w-0 flex-1 items-stretch gap-1.5">
        <SpinCell value={d} pad={2} min={1} max={daysInMonth(y, m)} onChange={setDay} />
        <SpinCell value={m} pad={2} min={1} max={12} onChange={setMonth} />
        <SpinCell value={y} wide min={1900} max={2100} onChange={setYear} />
      </div>
    </div>
  );
}

function SpinCell({
  value,
  pad,
  min,
  max,
  wide,
  onChange,
}: {
  value: number;
  pad?: number;
  min: number;
  max: number;
  wide?: boolean;
  onChange: (n: number) => void;
}) {
  // Локальная редактируемая строка — синхронизируется с внешним value через useEffect.
  const [text, setText] = useState<string>(pad ? String(value).padStart(pad, '0') : String(value));
  useEffect(() => {
    setText(pad ? String(value).padStart(pad, '0') : String(value));
  }, [value, pad]);

  const commit = (raw: string) => {
    const n = Number(raw);
    if (!Number.isFinite(n) || raw === '') {
      setText(pad ? String(value).padStart(pad, '0') : String(value));
      return;
    }
    onChange(Math.max(min, Math.min(max, n)));
  };

  const maxLength = String(max).length;

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={text}
      maxLength={maxLength}
      onChange={(e) => setText(e.target.value.replace(/[^0-9]/g, ''))}
      onBlur={() => commit(text)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        else if (e.key === 'ArrowUp') {
          e.preventDefault();
          onChange(Math.min(max, value + 1));
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          onChange(Math.max(min, value - 1));
        }
      }}
      onFocus={(e) => e.target.select()}
      className={`min-w-0 rounded-xl border border-[var(--color-line)] bg-[var(--color-card)] px-1 py-3 text-center font-[family-name:var(--font-display)] text-[18px] leading-none tabular-nums focus:border-[var(--color-accent)] focus:outline-none ${wide ? 'flex-[1.6]' : 'flex-1'}`}
      aria-label={`Значение, от ${min} до ${max}`}
    />
  );
}

function formatCustomRange(from: string, to: string): string {
  const fmt = (iso: string) => {
    const [, m, d] = iso.split('-').map(Number);
    const monthShort = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    return `${d} ${monthShort[m - 1]}`;
  };
  return `${fmt(from)} – ${fmt(to)}`;
}

function RangePresets({ value, onChange }: { value: AccountingRange; onChange: (r: AccountingRange) => void }) {
  const opts: { v: AccountingRange; label: string }[] = [
    { v: 'month', label: 'Месяц' },
    { v: 'quarter', label: 'Квартал' },
    { v: 'year', label: 'Год' },
    { v: 'custom', label: 'Период' },
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

function PeriodSwitcher({
  month,
  range,
  onShift,
  onChangeMonth,
}: {
  month: string;
  range: AccountingRange;
  onShift: (d: -1 | 1) => void;
  onChangeMonth: (m: string) => void;
}) {
  const [y, m] = month.split('-').map(Number);
  const q = Math.floor((m - 1) / 3) + 1; // 1..4

  const setMonthNum = (newM: number) => {
    onChangeMonth(`${y}-${String(newM).padStart(2, '0')}`);
  };
  const setYearNum = (newY: number) => {
    onChangeMonth(`${newY}-${String(m).padStart(2, '0')}`);
  };
  const setQuarter = (newQ: number) => {
    const startMonth = (newQ - 1) * 3 + 1;
    onChangeMonth(`${y}-${String(startMonth).padStart(2, '0')}`);
  };

  return (
    <div className="flex items-stretch gap-1.5 pt-3">
      <button
        onClick={() => onShift(-1)}
        className="flex w-8 shrink-0 items-center justify-center rounded-xl border border-[var(--color-line)] bg-[var(--color-card)] active:scale-90 transition-transform"
        aria-label="Предыдущий период"
      >
        <ChevronLeft size={16} />
      </button>
      <div className="flex min-w-0 flex-1 items-stretch gap-1.5">
        {range === 'month' && (
          <>
            <SpinCell value={m} min={1} max={12} pad={2} onChange={setMonthNum} />
            <SpinCell value={y} min={1900} max={2100} wide onChange={setYearNum} />
          </>
        )}
        {range === 'quarter' && (
          <>
            <SpinCell value={q} min={1} max={4} onChange={setQuarter} />
            <SpinCell value={y} min={1900} max={2100} wide onChange={setYearNum} />
          </>
        )}
        {range === 'year' && (
          <SpinCell value={y} min={1900} max={2100} onChange={setYearNum} />
        )}
      </div>
      <button
        onClick={() => onShift(1)}
        className="flex w-8 shrink-0 items-center justify-center rounded-xl border border-[var(--color-line)] bg-[var(--color-card)] active:scale-90 transition-transform"
        aria-label="Следующий период"
      >
        <ChevronRight size={16} />
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

function FilterChip({ active, onClick, count, children }: { active: boolean; onClick: () => void; count: number; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${active ? 'bg-[var(--color-accent)] text-[var(--color-accent-on)]' : 'bg-[var(--color-chip)] text-[var(--color-ink)]'}`}
    >
      <span>{children}</span>
      <span className={`tabular-nums text-[10px] ${active ? 'opacity-70' : 'text-[var(--color-ink-muted)]'}`}>{count}</span>
    </button>
  );
}

// ─── Сводка ────────────────────────────────────────────────────────────────

function SummaryTab({
  month,
  range,
  customFrom,
  customTo,
}: {
  month: string;
  range: AccountingRange;
  customFrom?: string;
  customTo?: string;
}) {
  const { data: summary } = useAccountingSummary(month, range, customFrom, customTo);
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
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

  // Уникальные типы тренировок из истории платежей (со счётчиком).
  const countByType = items.reduce<Record<string, number>>((acc, it) => {
    const key = it.workoutType ?? 'Без типа';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const availableTypes = Object.keys(countByType).sort();

  const filteredItems = filter
    ? items.filter((i) => (i.workoutType ?? 'Без типа') === filter)
    : items;
  const total = filteredItems.reduce((s, i) => s + i.totalPaid, 0);

  return (
    <div className="space-y-2">
      {/* Фильтр по типу тренировки — показываем только присутствующие типы */}
      {availableTypes.length > 0 && (
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
          <FilterChip active={filter === null} onClick={() => setFilter(null)} count={items.length}>
            Все
          </FilterChip>
          {availableTypes.map((t) => (
            <FilterChip
              key={t}
              active={filter === t}
              onClick={() => setFilter(filter === t ? null : t)}
              count={countByType[t]}
            >
              {t}
            </FilterChip>
          ))}
        </div>
      )}

      <div className="rounded-2xl bg-[var(--color-card)] p-3 text-center">
        <div className="text-[12px] text-[var(--color-ink-muted)]">
          {filter ? `${filter} за период` : 'Всего за период'}
        </div>
        <div className="text-[20px] font-bold tabular-nums">+{formatMoney(total)}</div>
      </div>
      {adding ? (
        <IncomeForm onClose={() => setAdding(false)} />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--color-line)] py-3 text-[13px] font-medium text-[var(--color-ink-muted)]"
        >
          <Plus size={15} /> Добавить доход
        </button>
      )}
      {filteredItems.length === 0 ? (
        <div className="py-6 text-center text-[13px] text-[var(--color-ink-muted)]">
          {filter ? `Нет платежей по типу «${filter}»` : 'Нет платежей'}
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl">
          {filteredItems.map((it, i) => (
            <li
              key={it.id}
              className={`flex items-center gap-3 bg-[var(--color-card)] px-3 py-3 ${
                i < filteredItems.length - 1 ? 'border-b border-[var(--color-line)]' : ''
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold">{it.clientName}</div>
                <div className="text-[11px] text-[var(--color-ink-muted)]">
                  {it.lessonsPaid} тренировок
                  {it.workoutType ? ` · ${it.workoutType}` : ''}
                  {' · '}
                  {formatDateRu(it.createdAt.slice(0, 10))}
                </div>
              </div>
              <div className="shrink-0 text-[14px] font-bold tabular-nums">+{formatMoney(it.totalPaid)}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const INCOME_CATEGORIES = ['Тренировка', 'Фарма', 'Консультация', 'Прочее'];

function IncomeForm({ onClose }: { onClose: () => void }) {
  const createMut = useCreateIncomeRecord();
  const [category, setCategory] = useState<string>(INCOME_CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');

  const amountNum = Number(amount);

  const submit = async () => {
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      alert('Укажите сумму дохода');
      return;
    }
    if (!date) {
      alert('Укажите дату');
      return;
    }
    await createMut.mutateAsync({
      category,
      amount: amountNum,
      date,
      note: note.trim() || null,
    });
    onClose();
  };

  return (
    <div className="rounded-2xl bg-[var(--color-card)] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[14px] font-semibold">Новый доход</h4>
        <button onClick={onClose} className="text-[12px] text-[var(--color-ink-muted)]">Отмена</button>
      </div>
      <Field label="Категория">
        <div className="flex flex-wrap gap-1.5">
          {INCOME_CATEGORIES.map((c) => {
            const active = c === category;
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-full px-3 py-1.5 text-[12px] font-medium ${active ? 'bg-[var(--color-accent)] text-[var(--color-accent-on)]' : 'bg-[var(--color-chip)]'}`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="₽ сумма">
          <TextInput inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
        </Field>
        <Field label="Дата">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-card)] px-3 py-2 text-[14px] focus:border-[var(--color-line-strong)] focus:outline-none"
          />
        </Field>
      </div>
      <Field label="Примечание">
        <TextArea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="необязательно" />
      </Field>
      <button
        onClick={submit}
        disabled={createMut.isPending}
        className="w-full rounded-2xl bg-[var(--color-accent)] py-3 text-[14px] font-semibold text-[var(--color-accent-on)] disabled:opacity-50"
      >
        {createMut.isPending ? 'Сохраняем…' : 'Сохранить'}
      </button>
    </div>
  );
}

// ─── Расходы ────────────────────────────────────────────────────────────────

function ExpensesTab({ from, to }: { from: string; to: string }) {
  const { data: items = [] } = useExpenses(from, to);
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

  const filteredItems = filter ? items.filter((e) => e.category === filter) : items;
  const total = filteredItems.reduce((s, i) => s + i.amount, 0);

  // Подсчёт расходов по категориям для подписи на чипах.
  const countByCategory = items.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-2">
      {/* Фильтр по категории — показываем только те где есть расходы */}
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
        <FilterChip active={filter === null} onClick={() => setFilter(null)} count={items.length}>
          Все
        </FilterChip>
        {EXPENSE_CATEGORIES.filter((c) => (countByCategory[c] ?? 0) > 0).map((c) => (
          <FilterChip
            key={c}
            active={filter === c}
            onClick={() => setFilter(filter === c ? null : c)}
            count={countByCategory[c] ?? 0}
          >
            {c}
          </FilterChip>
        ))}
      </div>

      <div className="rounded-2xl bg-[var(--color-card)] p-3 text-center">
        <div className="text-[12px] text-[var(--color-ink-muted)]">
          {filter ? `${filter} за период` : 'Всего за период'}
        </div>
        <div className="text-[20px] font-bold tabular-nums">−{formatMoney(total)}</div>
      </div>
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
      {filteredItems.length > 0 && (
        <ul className="overflow-hidden rounded-2xl">
          {filteredItems.map((e, i) => (
            <li
              key={e.id}
              className={`flex items-center gap-3 bg-[var(--color-card)] px-3 py-3 ${
                i < filteredItems.length - 1 ? 'border-b border-[var(--color-line)]' : ''
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold">{e.category}</div>
                <div className="text-[11px] text-[var(--color-ink-muted)]">
                  {formatDateRu(e.date)}
                  {e.note ? ` · ${e.note}` : ''}
                </div>
              </div>
              <div className="shrink-0 text-[14px] font-bold tabular-nums">
                −{formatMoney(e.amount)}
              </div>
            </li>
          ))}
        </ul>
      )}
      {filter && filteredItems.length === 0 && (
        <div className="rounded-2xl bg-[var(--color-card)] p-6 text-center text-[13px] text-[var(--color-ink-muted)]">
          За период нет расходов в категории «{filter}»
        </div>
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
