import { Router } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { db, type TemplateExerciseRow, type WorkoutTemplateRow, type ExerciseRow } from '../db.js';
import { asyncHandler, HttpError, parseBody, requireRow } from '../http.js';

export const workoutTemplatesRouter = Router();

const templateExerciseInput = z.object({
  exerciseId: z.string().min(1),
  sets: z.number().int().positive().max(20),
  reps: z.number().int().positive().nullish(),
  weightKg: z.number().nonnegative().nullish(),
  timeSec: z.number().int().nonnegative().nullish(),
  restSec: z.number().int().nonnegative(),
});

const templateInput = z.object({
  name: z.string().min(1).max(120),
  shortDescription: z.string().max(500).nullish(),
  description: z.string().max(4000).nullish(),
  muscleGroup: z.string().max(60).nullish(),
  categoryTag: z.string().max(60).nullish(),
  exercises: z.array(templateExerciseInput).min(1).max(40),
});

type TemplateInput = z.infer<typeof templateInput>;

const listTemplatesStmt = db.prepare<[], WorkoutTemplateRow>(`SELECT * FROM workout_templates ORDER BY id`);
const getTemplateStmt = db.prepare<[string], WorkoutTemplateRow>(`SELECT * FROM workout_templates WHERE id = ?`);
const getTemplateExercisesStmt = db.prepare<[string], TemplateExerciseRow & { exercise_name: string; exercise_category: string }>(`
  SELECT te.*, e.name AS exercise_name, e.category AS exercise_category
  FROM workout_template_exercises te
  JOIN exercises e ON e.id = te.exercise_id
  WHERE te.template_id = ?
  ORDER BY te.position
`);

const insertTemplateStmt = db.prepare(`
  INSERT INTO workout_templates (id, name, short_description, description, muscle_group, category_tag)
  VALUES (@id, @name, @short_description, @description, @muscle_group, @category_tag)
`);

const updateTemplateStmt = db.prepare(`
  UPDATE workout_templates SET
    name = @name,
    short_description = @short_description,
    description = @description,
    muscle_group = @muscle_group,
    category_tag = @category_tag
  WHERE id = @id
`);

const deleteTemplateStmt = db.prepare(`DELETE FROM workout_templates WHERE id = ?`);

const insertTemplateExerciseStmt = db.prepare(`
  INSERT INTO workout_template_exercises (template_id, position, exercise_id, sets, reps, weight_kg, time_sec, rest_sec)
  VALUES (@template_id, @position, @exercise_id, @sets, @reps, @weight_kg, @time_sec, @rest_sec)
`);

const deleteTemplateExercisesStmt = db.prepare(`DELETE FROM workout_template_exercises WHERE template_id = ?`);

function toApi(row: WorkoutTemplateRow, exercises: Array<TemplateExerciseRow & { exercise_name: string; exercise_category: string }>) {
  return {
    id: row.id,
    name: row.name,
    shortDescription: row.short_description,
    description: row.description,
    muscleGroup: row.muscle_group,
    categoryTag: row.category_tag,
    exercises: exercises.map((e) => ({
      exerciseId: e.exercise_id,
      exerciseName: e.exercise_name,
      exerciseCategory: e.exercise_category,
      position: e.position,
      sets: e.sets,
      reps: e.reps,
      weightKg: e.weight_kg,
      timeSec: e.time_sec,
      restSec: e.rest_sec,
    })),
  };
}

const writeTemplate = db.transaction((id: string, input: TemplateInput, mode: 'insert' | 'update') => {
  const params = {
    id,
    name: input.name,
    short_description: input.shortDescription ?? null,
    description: input.description ?? null,
    muscle_group: input.muscleGroup ?? null,
    category_tag: input.categoryTag ?? null,
  };
  if (mode === 'insert') insertTemplateStmt.run(params);
  else updateTemplateStmt.run(params);
  deleteTemplateExercisesStmt.run(id);
  input.exercises.forEach((ex, idx) => {
    insertTemplateExerciseStmt.run({
      template_id: id,
      position: idx,
      exercise_id: ex.exerciseId,
      sets: ex.sets,
      reps: ex.reps ?? null,
      weight_kg: ex.weightKg ?? null,
      time_sec: ex.timeSec ?? null,
      rest_sec: ex.restSec,
    });
  });
});

workoutTemplatesRouter.get(
  '/',
  asyncHandler((req, res) => {
    const q = String(req.query.q ?? '').trim().toLowerCase();
    const rows = listTemplatesStmt.all();
    const filtered = q
      ? rows.filter((r) => `${r.name} ${r.category_tag ?? ''} ${r.muscle_group ?? ''}`.toLowerCase().includes(q))
      : rows;
    const result = filtered.map((row) => {
      const exs = getTemplateExercisesStmt.all(row.id);
      return toApi(row, exs);
    });
    res.json(result);
  })
);

workoutTemplatesRouter.post(
  '/',
  asyncHandler((req, res) => {
    const input = parseBody(templateInput, req.body);
    const id = nanoid(12);
    writeTemplate(id, input, 'insert');
    const row = requireRow(getTemplateStmt.get(id), 'Template');
    res.status(201).json(toApi(row, getTemplateExercisesStmt.all(id)));
  })
);

workoutTemplatesRouter.get(
  '/:id',
  asyncHandler((req, res) => {
    const row = requireRow(getTemplateStmt.get(req.params.id), 'Template');
    res.json(toApi(row, getTemplateExercisesStmt.all(row.id)));
  })
);

workoutTemplatesRouter.put(
  '/:id',
  asyncHandler((req, res) => {
    const existing = requireRow(getTemplateStmt.get(req.params.id), 'Template');
    const input = parseBody(templateInput, req.body);
    writeTemplate(existing.id, input, 'update');
    const row = requireRow(getTemplateStmt.get(existing.id), 'Template');
    res.json(toApi(row, getTemplateExercisesStmt.all(row.id)));
  })
);

workoutTemplatesRouter.delete(
  '/:id',
  asyncHandler((req, res) => {
    const result = deleteTemplateStmt.run(req.params.id);
    if (result.changes === 0) throw new HttpError(404, 'Template not found');
    res.status(204).send();
  })
);
