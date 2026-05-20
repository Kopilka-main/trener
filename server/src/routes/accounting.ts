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

accountingRouter.get(
  '/summary',
  asyncHandler((req, res) => {
    // Параметр month=YYYY-MM (по умолчанию — текущий).
    const month = String(req.query.month ?? new Date().toISOString().slice(0, 7));
    if (!/^\d{4}-\d{2}$/.test(month)) {
      res.status(400).json({ error: 'Bad month format, expected YYYY-MM' });
      return;
    }
    const from = `${month}-01`;
    // Конец месяца: грубо 31, БД отфильтрует лишнее.
    const to = `${month}-31`;
    const income = totalIncomeStmt.get(from, to)?.total ?? 0;
    const expenses = totalExpensesStmt.get(from, to)?.total ?? 0;
    const byClient = incomeStmt.all(from, to);
    res.json({
      month,
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
