import { Router } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { db, type GymRow } from '../db.js';
import { asyncHandler, HttpError, parseBody, requireRow } from '../http.js';

export const gymsRouter = Router();

const gymInput = z.object({
  name: z.string().min(1).max(120),
  monthlyRent: z.number().nonnegative().nullish(),
  note: z.string().max(500).nullish(),
});

const listStmt = db.prepare<[], GymRow>(`SELECT * FROM gyms ORDER BY name COLLATE NOCASE`);
const getStmt = db.prepare<[string], GymRow>(`SELECT * FROM gyms WHERE id = ?`);
const insertStmt = db.prepare(`INSERT INTO gyms (id, name, monthly_rent, note) VALUES (@id, @name, @monthly_rent, @note)`);
const updateStmt = db.prepare(`UPDATE gyms SET name = @name, monthly_rent = @monthly_rent, note = @note WHERE id = @id`);
const deleteStmt = db.prepare(`DELETE FROM gyms WHERE id = ?`);

function toApi(r: GymRow) {
  return { id: r.id, name: r.name, monthlyRent: r.monthly_rent, note: r.note };
}

gymsRouter.get('/', asyncHandler((_req, res) => {
  res.json(listStmt.all().map(toApi));
}));

gymsRouter.post('/', asyncHandler((req, res) => {
  const input = parseBody(gymInput, req.body);
  const id = nanoid(12);
  insertStmt.run({ id, name: input.name, monthly_rent: input.monthlyRent ?? null, note: input.note ?? null });
  res.status(201).json(toApi(requireRow(getStmt.get(id), 'Gym')));
}));

gymsRouter.put('/:id', asyncHandler((req, res) => {
  const existing = requireRow(getStmt.get(req.params.id), 'Gym');
  const input = parseBody(gymInput, req.body);
  updateStmt.run({ id: existing.id, name: input.name, monthly_rent: input.monthlyRent ?? null, note: input.note ?? null });
  res.json(toApi(requireRow(getStmt.get(existing.id), 'Gym')));
}));

gymsRouter.delete('/:id', asyncHandler((req, res) => {
  const result = deleteStmt.run(req.params.id);
  if (result.changes === 0) throw new HttpError(404, 'Gym not found');
  res.status(204).send();
}));
