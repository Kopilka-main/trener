import { Router } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { db, type IncomeRow } from '../db.js';
import { asyncHandler, HttpError, parseBody, requireRow } from '../http.js';

export const incomesRouter = Router();

const incomeInput = z.object({
  category: z.string().min(1).max(60),
  amount: z.number().nonnegative(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(500).nullish(),
});

const listStmt = db.prepare<[string, string], IncomeRow>(
  `SELECT * FROM incomes WHERE date >= ? AND date <= ? ORDER BY date DESC, created_at DESC`
);
const getStmt = db.prepare<[string], IncomeRow>(`SELECT * FROM incomes WHERE id = ?`);
const insertStmt = db.prepare(`
  INSERT INTO incomes (id, category, amount, date, note, created_at)
  VALUES (@id, @category, @amount, @date, @note, @created_at)
`);
const deleteStmt = db.prepare(`DELETE FROM incomes WHERE id = ?`);

function toApi(r: IncomeRow) {
  return {
    id: r.id,
    category: r.category,
    amount: r.amount,
    date: r.date,
    note: r.note,
    createdAt: r.created_at,
  };
}

incomesRouter.get('/', asyncHandler((req, res) => {
  const from = String(req.query.from ?? '0000-01-01');
  const to = String(req.query.to ?? '9999-12-31');
  res.json(listStmt.all(from, to).map(toApi));
}));

incomesRouter.post('/', asyncHandler((req, res) => {
  const input = parseBody(incomeInput, req.body);
  const id = nanoid(12);
  insertStmt.run({
    id,
    category: input.category,
    amount: input.amount,
    date: input.date,
    note: input.note ?? null,
    created_at: new Date().toISOString(),
  });
  res.status(201).json(toApi(requireRow(getStmt.get(id), 'Income')));
}));

incomesRouter.delete('/:id', asyncHandler((req, res) => {
  const result = deleteStmt.run(req.params.id);
  if (result.changes === 0) throw new HttpError(404, 'Income not found');
  res.status(204).send();
}));
