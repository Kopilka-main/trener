import { Router } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { db, type ExerciseRow } from '../db.js';
import { asyncHandler, HttpError, parseBody, requireRow } from '../http.js';

export const exercisesRouter = Router();

const exerciseInput = z.object({
  name: z.string().min(1).max(120),
  shortDescription: z.string().max(500).nullish(),
  description: z.string().max(4000).nullish(),
  category: z.string().min(1).max(60),
  targetMuscles: z.array(z.string().min(1).max(60)).max(20).default([]),
  equipment: z.string().max(60).nullish(),
  defaultReps: z.number().int().positive().nullish(),
  defaultWeightKg: z.number().nonnegative().nullish(),
  defaultTimeSec: z.number().int().nonnegative().nullish(),
  restSec: z.number().int().nonnegative().default(90),
  note: z.string().max(2000).nullish(),
});

type ExerciseInput = z.infer<typeof exerciseInput>;

function toApi(row: ExerciseRow) {
  return {
    id: row.id,
    name: row.name,
    shortDescription: row.short_description,
    description: row.description,
    category: row.category,
    targetMuscles: row.target_muscles ? (JSON.parse(row.target_muscles) as string[]) : [],
    equipment: row.equipment,
    defaultReps: row.default_reps,
    defaultWeightKg: row.default_weight_kg,
    defaultTimeSec: row.default_time_sec,
    restSec: row.rest_sec,
    note: row.note,
  };
}

const insertStmt = db.prepare(`
  INSERT INTO exercises (id, name, short_description, description, category, target_muscles,
    equipment, default_reps, default_weight_kg, default_time_sec, rest_sec, note)
  VALUES (@id, @name, @short_description, @description, @category, @target_muscles,
    @equipment, @default_reps, @default_weight_kg, @default_time_sec, @rest_sec, @note)
`);

const updateStmt = db.prepare(`
  UPDATE exercises SET
    name = @name,
    short_description = @short_description,
    description = @description,
    category = @category,
    target_muscles = @target_muscles,
    equipment = @equipment,
    default_reps = @default_reps,
    default_weight_kg = @default_weight_kg,
    default_time_sec = @default_time_sec,
    rest_sec = @rest_sec,
    note = @note
  WHERE id = @id
`);

const getStmt = db.prepare<[string], ExerciseRow>(`SELECT * FROM exercises WHERE id = ?`);
const listStmt = db.prepare<[], ExerciseRow>(`SELECT * FROM exercises ORDER BY name COLLATE NOCASE`);
const deleteStmt = db.prepare(`DELETE FROM exercises WHERE id = ?`);

function toRowParams(input: ExerciseInput, id: string) {
  return {
    id,
    name: input.name,
    short_description: input.shortDescription ?? null,
    description: input.description ?? null,
    category: input.category,
    target_muscles: JSON.stringify(input.targetMuscles ?? []),
    equipment: input.equipment ?? null,
    default_reps: input.defaultReps ?? null,
    default_weight_kg: input.defaultWeightKg ?? null,
    default_time_sec: input.defaultTimeSec ?? null,
    rest_sec: input.restSec,
    note: input.note ?? null,
  };
}

exercisesRouter.get(
  '/',
  asyncHandler((req, res) => {
    const q = String(req.query.q ?? '').trim().toLowerCase();
    const category = String(req.query.category ?? '').trim();
    const equipment = String(req.query.equipment ?? '').trim();
    const muscle = String(req.query.muscle ?? '').trim();
    let rows = listStmt.all();
    if (category) rows = rows.filter((r) => r.category === category);
    if (equipment) rows = rows.filter((r) => r.equipment === equipment);
    if (muscle) {
      rows = rows.filter((r) => {
        const m = r.target_muscles ? (JSON.parse(r.target_muscles) as string[]) : [];
        return m.includes(muscle);
      });
    }
    if (q) rows = rows.filter((r) => `${r.name} ${r.category}`.toLowerCase().includes(q));
    res.json(rows.map(toApi));
  })
);

exercisesRouter.post(
  '/',
  asyncHandler((req, res) => {
    const input = parseBody(exerciseInput, req.body);
    const id = nanoid(12);
    insertStmt.run(toRowParams(input, id));
    const row = requireRow(getStmt.get(id), 'Exercise');
    res.status(201).json(toApi(row));
  })
);

exercisesRouter.get(
  '/:id',
  asyncHandler((req, res) => {
    const row = requireRow(getStmt.get(req.params.id), 'Exercise');
    res.json(toApi(row));
  })
);

exercisesRouter.put(
  '/:id',
  asyncHandler((req, res) => {
    const existing = requireRow(getStmt.get(req.params.id), 'Exercise');
    const input = parseBody(exerciseInput, req.body);
    updateStmt.run(toRowParams(input, existing.id));
    const row = requireRow(getStmt.get(existing.id), 'Exercise');
    res.json(toApi(row));
  })
);

exercisesRouter.delete(
  '/:id',
  asyncHandler((req, res) => {
    const result = deleteStmt.run(req.params.id);
    if (result.changes === 0) throw new HttpError(404, 'Exercise not found');
    res.status(204).send();
  })
);
