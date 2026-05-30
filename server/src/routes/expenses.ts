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
  clientId: z.string().min(1).nullish(),
  note: z.string().max(500).nullish(),
});

type ExpenseListRow = ExpenseRow & { client_first_name: string | null; client_last_name: string | null };

const listStmt = db.prepare<[string, string], ExpenseListRow>(
  `SELECT e.*, c.first_name AS client_first_name, c.last_name AS client_last_name
   FROM expenses e LEFT JOIN clients c ON c.id = e.client_id
   WHERE e.date >= ? AND e.date <= ?
   ORDER BY e.date DESC, e.created_at DESC`
);
const listByClientStmt = db.prepare<[string], ExpenseListRow>(
  `SELECT e.*, c.first_name AS client_first_name, c.last_name AS client_last_name
   FROM expenses e LEFT JOIN clients c ON c.id = e.client_id
   WHERE e.client_id = ?
   ORDER BY e.date DESC, e.created_at DESC`
);
const listByGymStmt = db.prepare<[string], ExpenseListRow>(
  `SELECT e.*, c.first_name AS client_first_name, c.last_name AS client_last_name
   FROM expenses e LEFT JOIN clients c ON c.id = e.client_id
   WHERE e.gym_id = ?
   ORDER BY e.date DESC, e.created_at DESC`
);
const getStmt = db.prepare<[string], ExpenseListRow>(
  `SELECT e.*, c.first_name AS client_first_name, c.last_name AS client_last_name
   FROM expenses e LEFT JOIN clients c ON c.id = e.client_id
   WHERE e.id = ?`
);
const insertStmt = db.prepare(`
  INSERT INTO expenses (id, category, amount, date, gym_id, client_id, note, created_at)
  VALUES (@id, @category, @amount, @date, @gym_id, @client_id, @note, @created_at)
`);
const updateStmt = db.prepare(`
  UPDATE expenses SET category = @category, amount = @amount, date = @date,
    gym_id = @gym_id, client_id = @client_id, note = @note WHERE id = @id
`);
const deleteStmt = db.prepare(`DELETE FROM expenses WHERE id = ?`);

function toApi(r: ExpenseListRow) {
  return {
    id: r.id,
    category: r.category,
    amount: r.amount,
    date: r.date,
    gymId: r.gym_id,
    clientId: r.client_id,
    clientName:
      r.client_first_name && r.client_last_name
        ? `${r.client_first_name} ${r.client_last_name}`
        : null,
    note: r.note,
    createdAt: r.created_at,
  };
}

expensesRouter.get('/', asyncHandler((req, res) => {
  const clientId = req.query.clientId ? String(req.query.clientId) : null;
  const gymId = req.query.gymId ? String(req.query.gymId) : null;
  if (clientId) {
    res.json(listByClientStmt.all(clientId).map(toApi));
    return;
  }
  if (gymId) {
    res.json(listByGymStmt.all(gymId).map(toApi));
    return;
  }
  const from = String(req.query.from ?? '0000-01-01');
  const to = String(req.query.to ?? '9999-12-31');
  res.json(listStmt.all(from, to).map(toApi));
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
    client_id: input.clientId ?? null,
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
    client_id: input.clientId ?? null,
    note: input.note ?? null,
  });
  res.json(toApi(requireRow(getStmt.get(existing.id), 'Expense')));
}));

expensesRouter.delete('/:id', asyncHandler((req, res) => {
  const result = deleteStmt.run(req.params.id);
  if (result.changes === 0) throw new HttpError(404, 'Expense not found');
  res.status(204).send();
}));
