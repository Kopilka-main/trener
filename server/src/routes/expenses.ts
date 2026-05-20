import { Router } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { db, type ExpenseRow } from '../db.js';
import { asyncHandler, HttpError, parseBody, requireRow } from '../http.js';

export const expensesRouter = Router();

const expenseInput = z.object({
  category: z.string().min(1).max(60),
  amount: z.number().nonnegative(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gymId: z.string().min(1).nullish(),
  note: z.string().max(500).nullish(),
});

const listStmt = db.prepare<[string, string], ExpenseRow>(
  `SELECT * FROM expenses WHERE date >= ? AND date <= ? ORDER BY date DESC, created_at DESC`
);
const getStmt = db.prepare<[string], ExpenseRow>(`SELECT * FROM expenses WHERE id = ?`);
const insertStmt = db.prepare(`
  INSERT INTO expenses (id, category, amount, date, gym_id, note, created_at)
  VALUES (@id, @category, @amount, @date, @gym_id, @note, @created_at)
`);
const updateStmt = db.prepare(`
  UPDATE expenses SET category = @category, amount = @amount, date = @date,
    gym_id = @gym_id, note = @note WHERE id = @id
`);
const deleteStmt = db.prepare(`DELETE FROM expenses WHERE id = ?`);

function toApi(r: ExpenseRow) {
  return {
    id: r.id,
    category: r.category,
    amount: r.amount,
    date: r.date,
    gymId: r.gym_id,
    note: r.note,
    createdAt: r.created_at,
  };
}

expensesRouter.get('/', asyncHandler((req, res) => {
  const from = String(req.query.from ?? '0000-01-01');
  const to = String(req.query.to ?? '9999-12-31');
  const rows = listStmt.all(from, to);
  res.json(rows.map(toApi));
}));

expensesRouter.post('/', asyncHandler((req, res) => {
  const input = parseBody(expenseInput, req.body);
  const id = nanoid(12);
  insertStmt.run({
    id,
    category: input.category,
    amount: input.amount,
    date: input.date,
    gym_id: input.gymId ?? null,
    note: input.note ?? null,
    created_at: new Date().toISOString(),
  });
  res.status(201).json(toApi(requireRow(getStmt.get(id), 'Expense')));
}));

expensesRouter.put('/:id', asyncHandler((req, res) => {
  const existing = requireRow(getStmt.get(req.params.id), 'Expense');
  const input = parseBody(expenseInput, req.body);
  updateStmt.run({
    id: existing.id,
    category: input.category,
    amount: input.amount,
    date: input.date,
    gym_id: input.gymId ?? null,
    note: input.note ?? null,
  });
  res.json(toApi(requireRow(getStmt.get(existing.id), 'Expense')));
}));

expensesRouter.delete('/:id', asyncHandler((req, res) => {
  const result = deleteStmt.run(req.params.id);
  if (result.changes === 0) throw new HttpError(404, 'Expense not found');
  res.status(204).send();
}));
