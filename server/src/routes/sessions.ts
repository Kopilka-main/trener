import { Router } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { db, type SessionRow } from '../db.js';
import { asyncHandler, HttpError, parseBody, requireRow } from '../http.js';

export const sessionsRouter = Router();

const sessionInput = z.object({
  clientId: z.string().min(1),
  workoutId: z.string().min(1).nullish(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationMin: z.number().int().positive().max(600),
  location: z.string().max(120).nullish(),
  title: z.string().max(120).nullish(),
  status: z.enum(['planned', 'completed', 'cancelled']).optional(),
  approval: z.enum(['none', 'pending', 'approved']).optional(),
  deliveredAt: z.string().nullish(),                 // ISO timestamp или null для сброса; undefined — не трогать
  isOnline: z.boolean().optional(),
  note: z.string().max(2000).nullish(),
});

type SessionJoined = SessionRow & { client_first_name: string; client_last_name: string };

const listStmt = db.prepare<[string, string], SessionJoined>(`
  SELECT s.*, c.first_name AS client_first_name, c.last_name AS client_last_name
  FROM sessions s JOIN clients c ON c.id = s.client_id
  WHERE s.date >= ? AND s.date <= ?
  ORDER BY s.date, s.start_time
`);

const listByClientStmt = db.prepare<[string, string, string], SessionJoined>(`
  SELECT s.*, c.first_name AS client_first_name, c.last_name AS client_last_name
  FROM sessions s JOIN clients c ON c.id = s.client_id
  WHERE s.date >= ? AND s.date <= ? AND s.client_id = ?
  ORDER BY s.date, s.start_time
`);

const getStmt = db.prepare<[string], SessionJoined>(`
  SELECT s.*, c.first_name AS client_first_name, c.last_name AS client_last_name
  FROM sessions s JOIN clients c ON c.id = s.client_id
  WHERE s.id = ?
`);

const insertStmt = db.prepare(`
  INSERT INTO sessions (id, client_id, workout_id, date, start_time, duration_min, location, title, status, approval, is_online, note, created_at)
  VALUES (@id, @client_id, @workout_id, @date, @start_time, @duration_min, @location, @title, @status, @approval, @is_online, @note, @created_at)
`);

const updateStmt = db.prepare(`
  UPDATE sessions SET
    client_id = @client_id,
    workout_id = @workout_id,
    date = @date,
    start_time = @start_time,
    duration_min = @duration_min,
    location = @location,
    title = @title,
    status = @status,
    approval = @approval,
    delivered_at = @delivered_at,
    is_online = @is_online,
    note = @note
  WHERE id = @id
`);

const deleteStmt = db.prepare(`DELETE FROM sessions WHERE id = ?`);

function toApi(row: SessionJoined) {
  return {
    id: row.id,
    clientId: row.client_id,
    clientFirstName: row.client_first_name,
    clientLastName: row.client_last_name,
    workoutId: row.workout_id,
    date: row.date,
    startTime: row.start_time,
    durationMin: row.duration_min,
    location: row.location,
    title: row.title,
    status: row.status,
    approval: row.approval,
    deliveredAt: row.delivered_at,
    isOnline: row.is_online === 1,
    note: row.note,
    createdAt: row.created_at,
  };
}

// GET /api/sessions?from=YYYY-MM-DD&to=YYYY-MM-DD&clientId=...
sessionsRouter.get(
  '/',
  asyncHandler((req, res) => {
    const from = String(req.query.from ?? '0000-01-01');
    const to = String(req.query.to ?? '9999-12-31');
    const clientId = req.query.clientId ? String(req.query.clientId) : null;
    const rows = clientId ? listByClientStmt.all(from, to, clientId) : listStmt.all(from, to);
    res.json(rows.map(toApi));
  })
);

// ВАЖНО: статические маршруты («/payment-status») должны быть ПЕРЕД '/:id',
// иначе Express примет «payment-status» за id сессии.
type PsRow = { id: string; client_id: string };
const psSessionsStmt = db.prepare<[string, string], PsRow>(`
  SELECT id, client_id FROM sessions
  WHERE date >= ? AND date <= ? AND status IN ('planned', 'completed')
  ORDER BY client_id, date, start_time
`);
const psPaidStmt = db.prepare<[], { client_id: string; paid: number }>(`
  SELECT client_id, COALESCE(SUM(lessons_paid), 0) AS paid
  FROM payment_packages WHERE status = 'active' GROUP BY client_id
`);

sessionsRouter.get(
  '/payment-status',
  asyncHandler((req, res) => {
    const from = String(req.query.from ?? '0000-01-01');
    const to = String(req.query.to ?? '9999-12-31');
    const rows = psSessionsStmt.all(from, to);
    const budget = new Map<string, number>();
    for (const r of psPaidStmt.all()) budget.set(r.client_id, r.paid);
    const result: Record<string, boolean> = {};
    for (const s of rows) {
      const b = budget.get(s.client_id) ?? 0;
      if (b > 0) {
        result[s.id] = true;
        budget.set(s.client_id, b - 1);
      } else {
        result[s.id] = false;
      }
    }
    res.json(result);
  })
);

sessionsRouter.get(
  '/:id',
  asyncHandler((req, res) => {
    const row = requireRow(getStmt.get(req.params.id), 'Session');
    res.json(toApi(row));
  })
);

sessionsRouter.post(
  '/',
  asyncHandler((req, res) => {
    const input = parseBody(sessionInput, req.body);
    const id = nanoid(12);
    insertStmt.run({
      id,
      client_id: input.clientId,
      workout_id: input.workoutId ?? null,
      date: input.date,
      start_time: input.startTime,
      duration_min: input.durationMin,
      location: input.location ?? null,
      title: input.title ?? null,
      status: input.status ?? 'planned',
      approval: input.approval ?? 'none',
      is_online: input.isOnline ? 1 : 0,
      note: input.note ?? null,
      created_at: new Date().toISOString(),
    });
    res.status(201).json(toApi(requireRow(getStmt.get(id), 'Session')));
  })
);

sessionsRouter.put(
  '/:id',
  asyncHandler((req, res) => {
    const existing = requireRow(getStmt.get(req.params.id), 'Session');
    const input = parseBody(sessionInput, req.body);
    updateStmt.run({
      id: existing.id,
      client_id: input.clientId,
      workout_id: input.workoutId ?? null,
      date: input.date,
      start_time: input.startTime,
      duration_min: input.durationMin,
      location: input.location ?? null,
      title: input.title ?? null,
      status: input.status ?? existing.status,
      approval: input.approval ?? existing.approval,
      // undefined — не трогать; null — сбросить; строка — установить.
      delivered_at: input.deliveredAt === undefined ? existing.delivered_at : input.deliveredAt,
      is_online: input.isOnline === undefined ? existing.is_online : (input.isOnline ? 1 : 0),
      note: input.note ?? null,
    });
    res.json(toApi(requireRow(getStmt.get(existing.id), 'Session')));
  })
);

sessionsRouter.delete(
  '/:id',
  asyncHandler((req, res) => {
    const result = deleteStmt.run(req.params.id);
    if (result.changes === 0) throw new HttpError(404, 'Session not found');
    res.status(204).send();
  })
);

// PATCH /:id/deliver — пометить, что клиент получил уведомление о занятии.
// В MVP вызывается тренером (mock) или клиентом, когда тот опрашивает занятия.
const deliverStmt = db.prepare(`UPDATE sessions SET delivered_at = ? WHERE id = ?`);
sessionsRouter.patch(
  '/:id/deliver',
  asyncHandler((req, res) => {
    const existing = requireRow(getStmt.get(req.params.id), 'Session');
    if (!existing.delivered_at) {
      deliverStmt.run(new Date().toISOString(), existing.id);
    }
    res.json(toApi(requireRow(getStmt.get(existing.id), 'Session')));
  })
);
