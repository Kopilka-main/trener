import { Router } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { db, type ClientRow } from '../db.js';
import { asyncHandler, HttpError, parseBody, requireRow } from '../http.js';

export const clientsRouter = Router();

const clientInput = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  heightCm: z.number().int().positive().nullish(),
  weightKg: z.number().positive().nullish(),
  phone: z.string().max(40).nullish(),
  telegram: z.string().max(80).nullish(),
  whatsapp: z.string().max(40).nullish(),
  instagram: z.string().max(80).nullish(),
  max: z.string().max(80).nullish(),
  hashtags: z.string().max(500).nullish(),
  notes: z.string().max(4000).nullish(),
  medicalNotes: z.string().max(4000).nullish(),
  restingPulse: z.number().int().positive().nullish(),
  scheduleDay: z.number().int().min(0).max(6).nullish(),
  scheduleTime: z.string().regex(/^\d{2}:\d{2}$/).nullish(),
  currentTrainingType: z.string().max(80).nullish(),
  accountId: z.string().max(40).nullish(),
  onlineUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
});

type ClientInput = z.infer<typeof clientInput>;

function toApi(row: ClientRow) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    birthDate: row.birth_date,
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    phone: row.phone,
    telegram: row.telegram,
    whatsapp: row.whatsapp,
    instagram: row.instagram,
    max: row.max,
    hashtags: row.hashtags,
    notes: row.notes,
    medicalNotes: row.medical_notes,
    restingPulse: row.resting_pulse,
    scheduleDay: row.schedule_day,
    scheduleTime: row.schedule_time,
    currentTrainingType: row.current_training_type,
    accountId: row.account_id,
    onlineUntil: row.online_until,
    createdAt: row.created_at,
  };
}

const insertStmt = db.prepare(`
  INSERT INTO clients (
    id, first_name, last_name, birth_date, height_cm, weight_kg,
    phone, telegram, whatsapp, instagram, max,
    hashtags, notes, medical_notes, resting_pulse,
    schedule_day, schedule_time, current_training_type, account_id, online_until, created_at
  ) VALUES (
    @id, @first_name, @last_name, @birth_date, @height_cm, @weight_kg,
    @phone, @telegram, @whatsapp, @instagram, @max,
    @hashtags, @notes, @medical_notes, @resting_pulse,
    @schedule_day, @schedule_time, @current_training_type, @account_id, @online_until, @created_at
  )
`);

const updateStmt = db.prepare(`
  UPDATE clients SET
    first_name = @first_name,
    last_name = @last_name,
    birth_date = @birth_date,
    height_cm = @height_cm,
    weight_kg = @weight_kg,
    phone = @phone,
    telegram = @telegram,
    whatsapp = @whatsapp,
    instagram = @instagram,
    max = @max,
    hashtags = @hashtags,
    notes = @notes,
    medical_notes = @medical_notes,
    resting_pulse = @resting_pulse,
    schedule_day = @schedule_day,
    schedule_time = @schedule_time,
    current_training_type = @current_training_type,
    account_id = @account_id,
    online_until = @online_until
  WHERE id = @id
`);

const getStmt = db.prepare<[string], ClientRow>(`SELECT * FROM clients WHERE id = ?`);
const listStmt = db.prepare<[], ClientRow>(`SELECT * FROM clients ORDER BY last_name COLLATE NOCASE, first_name COLLATE NOCASE`);
const deleteStmt = db.prepare(`DELETE FROM clients WHERE id = ?`);

function toRowParams(input: ClientInput, id: string, createdAt: string) {
  return {
    id,
    first_name: input.firstName,
    last_name: input.lastName,
    birth_date: input.birthDate ?? null,
    height_cm: input.heightCm ?? null,
    weight_kg: input.weightKg ?? null,
    phone: input.phone ?? null,
    telegram: input.telegram ?? null,
    whatsapp: input.whatsapp ?? null,
    instagram: input.instagram ?? null,
    max: input.max ?? null,
    hashtags: input.hashtags ?? null,
    notes: input.notes ?? null,
    medical_notes: input.medicalNotes ?? null,
    resting_pulse: input.restingPulse ?? null,
    schedule_day: input.scheduleDay ?? null,
    schedule_time: input.scheduleTime ?? null,
    current_training_type: input.currentTrainingType ?? null,
    account_id: input.accountId ?? null,
    online_until: input.onlineUntil ?? null,
    created_at: createdAt,
  };
}

clientsRouter.get(
  '/',
  asyncHandler((req, res) => {
    const q = String(req.query.q ?? '').trim().toLowerCase();
    const rows = listStmt.all();
    const filtered = q
      ? rows.filter((r) => {
          const haystack = `${r.first_name} ${r.last_name} ${r.hashtags ?? ''} ${r.current_training_type ?? ''}`.toLowerCase();
          return haystack.includes(q);
        })
      : rows;
    res.json(filtered.map(toApi));
  })
);

clientsRouter.post(
  '/',
  asyncHandler((req, res) => {
    const input = parseBody(clientInput, req.body);
    const id = nanoid(12);
    const createdAt = new Date().toISOString();
    insertStmt.run(toRowParams(input, id, createdAt));
    const row = requireRow(getStmt.get(id), 'Client');
    res.status(201).json(toApi(row));
  })
);

clientsRouter.get(
  '/:id',
  asyncHandler((req, res) => {
    const row = requireRow(getStmt.get(req.params.id), 'Client');
    res.json(toApi(row));
  })
);

clientsRouter.put(
  '/:id',
  asyncHandler((req, res) => {
    const existing = requireRow(getStmt.get(req.params.id), 'Client');
    const input = parseBody(clientInput, req.body);
    updateStmt.run(toRowParams(input, existing.id, existing.created_at));
    const row = requireRow(getStmt.get(existing.id), 'Client');
    res.json(toApi(row));
  })
);

clientsRouter.delete(
  '/:id',
  asyncHandler((req, res) => {
    const result = deleteStmt.run(req.params.id);
    if (result.changes === 0) throw new HttpError(404, 'Client not found');
    res.status(204).send();
  })
);

// Баланс тренировок: план/факт по клиенту. Считается на лету.
const balancePaidStmt = db.prepare<[string], { paid: number | null }>(
  `SELECT COALESCE(SUM(lessons_paid), 0) AS paid
   FROM payment_packages WHERE client_id = ? AND status = 'active'`
);
const balanceScheduledStmt = db.prepare<[string], { n: number }>(
  `SELECT COUNT(*) AS n FROM sessions
   WHERE client_id = ? AND status IN ('planned', 'completed')`
);
// «Проведено» = тренер отметил status='completed'. Согласование клиентом —
// отдельная ось (галочки в календаре), на биллинг не влияет.
const balanceCompletedStmt = db.prepare<[string], { n: number }>(
  `SELECT COUNT(*) AS n FROM sessions
   WHERE client_id = ? AND status = 'completed'`
);
const balanceApprovedTotalStmt = db.prepare<[string], { n: number }>(
  `SELECT COUNT(*) AS n FROM sessions
   WHERE client_id = ? AND approval = 'approved'`
);
const balanceUnapprovedStmt = db.prepare<[string], { n: number }>(
  `SELECT COUNT(*) AS n FROM sessions
   WHERE client_id = ? AND status = 'planned' AND approval IN ('none', 'pending')`
);
const balanceNeedsSendingStmt = db.prepare<[string], { n: number }>(
  `SELECT COUNT(*) AS n FROM sessions
   WHERE client_id = ? AND status = 'planned' AND approval = 'none'`
);
// Только будущее (сегодня и далее) запланированное — для сводки тренеру.
const balanceUpcomingStmt = db.prepare<[string, string], { n: number }>(
  `SELECT COUNT(*) AS n FROM sessions
   WHERE client_id = ? AND status = 'planned' AND date >= ?`
);

clientsRouter.get(
  '/:id/balance',
  asyncHandler((req, res) => {
    requireRow(getStmt.get(req.params.id), 'Client');
    const paid = balancePaidStmt.get(req.params.id)?.paid ?? 0;
    const scheduled = balanceScheduledStmt.get(req.params.id)?.n ?? 0;
    const completed = balanceCompletedStmt.get(req.params.id)?.n ?? 0;
    const approvedTotal = balanceApprovedTotalStmt.get(req.params.id)?.n ?? 0;
    const unapproved = balanceUnapprovedStmt.get(req.params.id)?.n ?? 0;
    const needsSending = balanceNeedsSendingStmt.get(req.params.id)?.n ?? 0;
    const today = new Date().toISOString().slice(0, 10);
    const upcomingPlanned = balanceUpcomingStmt.get(req.params.id, today)?.n ?? 0;
    res.json({
      paid,
      scheduled,
      completed,
      approvedTotal,
      unapproved,
      needsSending,
      upcomingPlanned,
      remaining: paid - completed,
    });
  })
);
