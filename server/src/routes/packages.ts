import { Router } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { db, type PaymentPackageRow } from '../db.js';
import { asyncHandler, HttpError, parseBody, requireRow } from '../http.js';

// Пакеты идут под /api: списки прицеплены к клиенту, операции по id — глобальные.
export const packagesRouter = Router();
export const clientPackagesRouter = Router({ mergeParams: true });

const packageInput = z.object({
  lessonsPaid: z.number().int().positive().max(1000),
  pricePerLesson: z.number().nonnegative(),
  totalPaid: z.number().nonnegative().optional(),
  workoutType: z.string().max(60).nullish(),
  startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['active', 'closed', 'cancelled']).optional(),
  note: z.string().max(500).nullish(),
});

type PackageInput = z.infer<typeof packageInput>;

const listByClientStmt = db.prepare<[string], PaymentPackageRow>(
  `SELECT * FROM payment_packages WHERE client_id = ? ORDER BY created_at DESC`
);

const getStmt = db.prepare<[string], PaymentPackageRow>(
  `SELECT * FROM payment_packages WHERE id = ?`
);

const insertStmt = db.prepare(`
  INSERT INTO payment_packages (
    id, client_id, lessons_paid, price_per_lesson, total_paid,
    workout_type, starts_at, status, note, created_at
  ) VALUES (
    @id, @client_id, @lessons_paid, @price_per_lesson, @total_paid,
    @workout_type, @starts_at, @status, @note, @created_at
  )
`);

const updateStmt = db.prepare(`
  UPDATE payment_packages SET
    lessons_paid = @lessons_paid,
    price_per_lesson = @price_per_lesson,
    total_paid = @total_paid,
    workout_type = @workout_type,
    starts_at = @starts_at,
    status = @status,
    note = @note
  WHERE id = @id
`);

const deleteStmt = db.prepare(`DELETE FROM payment_packages WHERE id = ?`);

function toApi(row: PaymentPackageRow) {
  return {
    id: row.id,
    clientId: row.client_id,
    lessonsPaid: row.lessons_paid,
    pricePerLesson: row.price_per_lesson,
    totalPaid: row.total_paid,
    workoutType: row.workout_type,
    startsAt: row.starts_at,
    status: row.status,
    note: row.note,
    createdAt: row.created_at,
  };
}

function computeTotal(input: PackageInput): number {
  return input.totalPaid ?? input.lessonsPaid * input.pricePerLesson;
}

// Авто-архив: если у клиента проведено сессий ≥ оплаченных в активном пакете,
// помечаем пакет как closed. Считаем только пакеты status='active' и сессии
// status='completed'. Распределение «по очереди» — старшие пакеты закрываются первыми.
const archiveCheckStmt = db.prepare<[string], { id: string; lessons_paid: number; created_at: string }>(
  `SELECT id, lessons_paid, created_at FROM payment_packages
   WHERE client_id = ? AND status = 'active'
   ORDER BY created_at ASC`
);
const completedSessionsStmt = db.prepare<[string], { n: number }>(
  `SELECT COUNT(*) AS n FROM sessions
   WHERE client_id = ? AND status = 'completed'`
);
const archivePackageStmt = db.prepare(
  `UPDATE payment_packages SET status = 'closed' WHERE id = ?`
);

function autoArchive(clientId: string) {
  const activePkgs = archiveCheckStmt.all(clientId);
  if (activePkgs.length === 0) return;
  let completed = completedSessionsStmt.get(clientId)?.n ?? 0;
  // Старшие пакеты закрываются первыми.
  for (const p of activePkgs) {
    if (completed >= p.lessons_paid) {
      archivePackageStmt.run(p.id);
      completed -= p.lessons_paid;
    } else {
      break; // у этого пакета ещё остались занятия → следующие тоже активны
    }
  }
}

clientPackagesRouter.get(
  '/',
  asyncHandler((req, res) => {
    const clientId = req.params.id;
    autoArchive(clientId);
    res.json(listByClientStmt.all(clientId).map(toApi));
  })
);

clientPackagesRouter.post(
  '/',
  asyncHandler((req, res) => {
    const clientId = req.params.id;
    const input = parseBody(packageInput, req.body);
    const id = nanoid(12);
    insertStmt.run({
      id,
      client_id: clientId,
      lessons_paid: input.lessonsPaid,
      price_per_lesson: input.pricePerLesson,
      total_paid: computeTotal(input),
      workout_type: input.workoutType ?? null,
      starts_at: input.startsAt,
      status: input.status ?? 'active',
      note: input.note ?? null,
      created_at: new Date().toISOString(),
    });
    res.status(201).json(toApi(requireRow(getStmt.get(id), 'Package')));
  })
);

packagesRouter.put(
  '/:id',
  asyncHandler((req, res) => {
    const existing = requireRow(getStmt.get(req.params.id), 'Package');
    const input = parseBody(packageInput, req.body);
    updateStmt.run({
      id: existing.id,
      lessons_paid: input.lessonsPaid,
      price_per_lesson: input.pricePerLesson,
      total_paid: computeTotal(input),
      workout_type: input.workoutType ?? null,
      starts_at: input.startsAt,
      status: input.status ?? existing.status,
      note: input.note ?? null,
    });
    res.json(toApi(requireRow(getStmt.get(existing.id), 'Package')));
  })
);

packagesRouter.delete(
  '/:id',
  asyncHandler((req, res) => {
    const result = deleteStmt.run(req.params.id);
    if (result.changes === 0) throw new HttpError(404, 'Package not found');
    res.status(204).send();
  })
);
