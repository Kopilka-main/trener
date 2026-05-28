import { Router } from 'express';
import { db } from '../db.js';
import { asyncHandler } from '../http.js';

export const accountingRouter = Router();

// Сводка за месяц: доходы из пакетов (по created_at), расходы за период,
// прибыль, топ-3 клиента по выручке за тот же период.

type IncomeRow = { client_id: string; first_name: string; last_name: string; total: number };

const incomeStmt = db.prepare<[string, string], IncomeRow>(`
  SELECT p.client_id, c.first_name, c.last_name, SUM(p.total_paid) AS total
  FROM payment_packages p
  JOIN clients c ON c.id = p.client_id
  WHERE p.status != 'cancelled'
    AND DATE(p.created_at) >= ? AND DATE(p.created_at) <= ?
  GROUP BY p.client_id, c.first_name, c.last_name
  ORDER BY total DESC
`);

const totalIncomeStmt = db.prepare<[string, string], { total: number | null }>(`
  SELECT SUM(total_paid) AS total FROM payment_packages
  WHERE status != 'cancelled'
    AND DATE(created_at) >= ? AND DATE(created_at) <= ?
`);

const totalExpensesStmt = db.prepare<[string, string], { total: number | null }>(`
  SELECT SUM(amount) AS total FROM expenses
  WHERE date >= ? AND date <= ?
`);

function rangeFor(month: string, kind: 'month' | 'quarter' | 'year'): { from: string; to: string } {
  // month = YYYY-MM (опорный). Возвращает [from, to] в формате YYYY-MM-DD.
  const [y, m] = month.split('-').map(Number);
  if (kind === 'year') {
    return { from: `${y}-01-01`, to: `${y}-12-31` };
  }
  if (kind === 'quarter') {
    const q = Math.floor((m - 1) / 3); // 0..3
    const startM = q * 3 + 1;
    const endM = startM + 2;
    return { from: `${y}-${String(startM).padStart(2, '0')}-01`, to: `${y}-${String(endM).padStart(2, '0')}-31` };
  }
  return { from: `${month}-01`, to: `${month}-31` };
}

accountingRouter.get(
  '/summary',
  asyncHandler((req, res) => {
    const month = String(req.query.month ?? new Date().toISOString().slice(0, 7));
    if (!/^\d{4}-\d{2}$/.test(month)) {
      res.status(400).json({ error: 'Bad month format, expected YYYY-MM' });
      return;
    }
    const rangeKind = String(req.query.range ?? 'month') as 'month' | 'quarter' | 'year';
    if (rangeKind !== 'month' && rangeKind !== 'quarter' && rangeKind !== 'year') {
      res.status(400).json({ error: 'range must be month|quarter|year' });
      return;
    }
    // Кастомный произвольный интервал: ?from=YYYY-MM-DD&to=YYYY-MM-DD имеет приоритет над range.
    const customFrom = req.query.from ? String(req.query.from) : null;
    const customTo = req.query.to ? String(req.query.to) : null;
    const { from, to } = customFrom && customTo
      ? { from: customFrom, to: customTo }
      : rangeFor(month, rangeKind);
    const income = totalIncomeStmt.get(from, to)?.total ?? 0;
    const expenses = totalExpensesStmt.get(from, to)?.total ?? 0;
    const byClient = incomeStmt.all(from, to);
    res.json({
      month,
      range: rangeKind,
      from,
      to,
      income,
      expenses,
      profit: income - expenses,
      topClients: byClient.slice(0, 3).map((r) => ({
        clientId: r.client_id,
        clientName: `${r.first_name} ${r.last_name}`,
        total: r.total,
      })),
    });
  })
);

// Доходы: список платежей-пакетов за период.
type IncomeItemRow = {
  id: string;
  client_id: string;
  first_name: string;
  last_name: string;
  lessons_paid: number;
  total_paid: number;
  created_at: string;
  status: string;
};

const incomeListStmt = db.prepare<[string, string], IncomeItemRow>(`
  SELECT p.id, p.client_id, c.first_name, c.last_name, p.lessons_paid, p.total_paid, p.created_at, p.status
  FROM payment_packages p
  JOIN clients c ON c.id = p.client_id
  WHERE p.status != 'cancelled'
    AND DATE(p.created_at) >= ? AND DATE(p.created_at) <= ?
  ORDER BY p.created_at DESC
`);

accountingRouter.get(
  '/income',
  asyncHandler((req, res) => {
    const from = String(req.query.from ?? '0000-01-01');
    const to = String(req.query.to ?? '9999-12-31');
    const rows = incomeListStmt.all(from, to);
    res.json(
      rows.map((r) => ({
        id: r.id,
        clientId: r.client_id,
        clientName: `${r.first_name} ${r.last_name}`,
        lessonsPaid: r.lessons_paid,
        totalPaid: r.total_paid,
        createdAt: r.created_at,
        status: r.status,
      }))
    );
  })
);
