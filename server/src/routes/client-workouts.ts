import { Router } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { db, type ClientWorkoutRow, type WorkoutSetRow } from '../db.js';
import { asyncHandler, HttpError, parseBody, requireRow } from '../http.js';

export const clientWorkoutsRouter = Router();

const inlineExercise = z.object({
  exerciseId: z.string().min(1),
  sets: z.number().int().positive().max(20),
  reps: z.number().int().positive().nullish(),
  weightKg: z.number().nonnegative().nullish(),
  timeSec: z.number().int().nonnegative().nullish(),
  restSec: z.number().int().nonnegative(),
});

const assignInput = z.object({
  sourceTemplateId: z.string().min(1).optional(),
  cloneFromWorkoutId: z.string().min(1).optional(),
  name: z.string().min(1).max(120).optional(),
  categoryTag: z.string().max(60).nullish(),
  exercises: z.array(inlineExercise).optional(),
});

const setUpdateInput = z.object({
  actualReps: z.number().int().nonnegative().nullish(),
  actualWeightKg: z.number().nonnegative().nullish(),
  actualTimeSec: z.number().int().nonnegative().nullish(),
  done: z.boolean().optional(),
});

const finishInput = z.object({
  trainerNote: z.string().max(4000).nullish(),
  rpe: z.number().int().min(1).max(10).nullish(),
  durationSec: z.number().int().nonnegative(),
});

const reorderInput = z.object({
  // Новый порядок упражнений: список текущих позиций в желаемой последовательности.
  order: z.array(z.number().int().nonnegative()).min(1),
});

const addExerciseInput = z.object({
  exerciseId: z.string().min(1),
  sets: z.number().int().positive().max(20).optional(),
});

const getWorkoutStmt = db.prepare<[string], ClientWorkoutRow>(`SELECT * FROM client_workouts WHERE id = ?`);

const getClientWorkoutsStmt = db.prepare<[string], ClientWorkoutRow>(`
  SELECT * FROM client_workouts WHERE client_id = ?
  ORDER BY
    CASE status WHEN 'active' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END,
    COALESCE(completed_at, created_at) DESC
`);

const getActiveOrDraftStmt = db.prepare<[string], ClientWorkoutRow>(`
  SELECT * FROM client_workouts
  WHERE client_id = ? AND status IN ('draft', 'active')
  LIMIT 1
`);

const getWorkoutExercisesStmt = db.prepare<[string], { workout_id: string; position: number; exercise_id: string; exercise_name: string; exercise_category: string }>(`
  SELECT we.workout_id, we.position, we.exercise_id, e.name AS exercise_name, e.category AS exercise_category
  FROM client_workout_exercises we
  JOIN exercises e ON e.id = we.exercise_id
  WHERE we.workout_id = ?
  ORDER BY we.position
`);

const getWorkoutSetsStmt = db.prepare<[string], WorkoutSetRow>(`
  SELECT * FROM client_workout_sets WHERE workout_id = ?
  ORDER BY exercise_position, set_index
`);

const insertWorkoutStmt = db.prepare(`
  INSERT INTO client_workouts (id, client_id, source_template_id, name, category_tag, status, created_at)
  VALUES (@id, @client_id, @source_template_id, @name, @category_tag, 'draft', @created_at)
`);

const insertExerciseStmt = db.prepare(`
  INSERT INTO client_workout_exercises (workout_id, position, exercise_id)
  VALUES (@workout_id, @position, @exercise_id)
`);

const insertSetStmt = db.prepare(`
  INSERT INTO client_workout_sets (workout_id, exercise_position, set_index,
    planned_reps, planned_weight_kg, planned_time_sec, planned_rest_sec)
  VALUES (@workout_id, @exercise_position, @set_index,
    @planned_reps, @planned_weight_kg, @planned_time_sec, @planned_rest_sec)
`);

const updateSetStmt = db.prepare(`
  UPDATE client_workout_sets SET
    actual_reps = @actual_reps,
    actual_weight_kg = @actual_weight_kg,
    actual_time_sec = @actual_time_sec,
    done = @done
  WHERE workout_id = @workout_id AND exercise_position = @exercise_position AND set_index = @set_index
`);

const startStmt = db.prepare(`UPDATE client_workouts SET status = 'active', started_at = @started_at WHERE id = @id`);
const finishStmt = db.prepare(`
  UPDATE client_workouts SET
    status = 'completed',
    completed_at = @completed_at,
    duration_sec = @duration_sec,
    trainer_note = @trainer_note,
    rpe = @rpe
  WHERE id = @id
`);

const deleteWorkoutStmt = db.prepare(`DELETE FROM client_workouts WHERE id = ?`);

const deleteWorkoutExercisesStmt = db.prepare(`DELETE FROM client_workout_exercises WHERE workout_id = ?`);

const insertFullSetStmt = db.prepare(`
  INSERT INTO client_workout_sets (workout_id, exercise_position, set_index,
    planned_reps, planned_weight_kg, planned_time_sec, planned_rest_sec,
    actual_reps, actual_weight_kg, actual_time_sec, done)
  VALUES (@workout_id, @exercise_position, @set_index,
    @planned_reps, @planned_weight_kg, @planned_time_sec, @planned_rest_sec,
    @actual_reps, @actual_weight_kg, @actual_time_sec, @done)
`);

const getExerciseDefaultsStmt = db.prepare<[string], { default_reps: number | null; default_weight_kg: number | null; default_time_sec: number | null; rest_sec: number }>(
  `SELECT default_reps, default_weight_kg, default_time_sec, rest_sec FROM exercises WHERE id = ?`
);

const getTemplateStmt = db.prepare<[string], { id: string; name: string; category_tag: string | null }>(`SELECT id, name, category_tag FROM workout_templates WHERE id = ?`);
const getTemplateExercisesStmt = db.prepare<[string], { template_id: string; position: number; exercise_id: string; sets: number; reps: number | null; weight_kg: number | null; time_sec: number | null; rest_sec: number }>(`
  SELECT * FROM workout_template_exercises WHERE template_id = ? ORDER BY position
`);

function toWorkoutSummary(row: ClientWorkoutRow) {
  return {
    id: row.id,
    clientId: row.client_id,
    sourceTemplateId: row.source_template_id,
    name: row.name,
    categoryTag: row.category_tag,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    durationSec: row.duration_sec,
    trainerNote: row.trainer_note,
    rpe: row.rpe,
    createdAt: row.created_at,
  };
}

function toWorkoutDetail(row: ClientWorkoutRow) {
  const exercises = getWorkoutExercisesStmt.all(row.id);
  const sets = getWorkoutSetsStmt.all(row.id);
  return {
    ...toWorkoutSummary(row),
    exercises: exercises.map((e) => ({
      position: e.position,
      exerciseId: e.exercise_id,
      exerciseName: e.exercise_name,
      exerciseCategory: e.exercise_category,
      sets: sets
        .filter((s) => s.exercise_position === e.position)
        .map((s) => ({
          setIndex: s.set_index,
          plannedReps: s.planned_reps,
          plannedWeightKg: s.planned_weight_kg,
          plannedTimeSec: s.planned_time_sec,
          plannedRestSec: s.planned_rest_sec,
          actualReps: s.actual_reps,
          actualWeightKg: s.actual_weight_kg,
          actualTimeSec: s.actual_time_sec,
          done: s.done === 1,
        })),
    })),
  };
}

const assignFromTemplate = db.transaction((clientId: string, templateId: string, override: { name?: string; categoryTag?: string | null }) => {
  const template = requireRow(getTemplateStmt.get(templateId), 'Template');
  const templateExercises = getTemplateExercisesStmt.all(templateId);
  if (templateExercises.length === 0) {
    throw new HttpError(400, 'Template has no exercises');
  }
  const id = nanoid(12);
  insertWorkoutStmt.run({
    id,
    client_id: clientId,
    source_template_id: templateId,
    name: override.name ?? template.name,
    category_tag: override.categoryTag ?? template.category_tag,
    created_at: new Date().toISOString(),
  });
  // Каждый подход — отдельная запись упражнения (плоский список, переставляется построчно).
  let position = 0;
  templateExercises.forEach((te) => {
    for (let s = 0; s < te.sets; s++) {
      insertExerciseStmt.run({ workout_id: id, position, exercise_id: te.exercise_id });
      insertSetStmt.run({
        workout_id: id,
        exercise_position: position,
        set_index: 0,
        planned_reps: te.reps,
        planned_weight_kg: te.weight_kg,
        planned_time_sec: te.time_sec,
        planned_rest_sec: te.rest_sec,
      });
      position++;
    }
  });
  return id;
});

const assignFromExercises = db.transaction((clientId: string, name: string, categoryTag: string | null, exercises: z.infer<typeof inlineExercise>[]) => {
  const id = nanoid(12);
  insertWorkoutStmt.run({
    id,
    client_id: clientId,
    source_template_id: null,
    name,
    category_tag: categoryTag,
    created_at: new Date().toISOString(),
  });
  let position = 0;
  exercises.forEach((te) => {
    for (let s = 0; s < te.sets; s++) {
      insertExerciseStmt.run({ workout_id: id, position, exercise_id: te.exerciseId });
      insertSetStmt.run({
        workout_id: id,
        exercise_position: position,
        set_index: 0,
        planned_reps: te.reps ?? null,
        planned_weight_kg: te.weightKg ?? null,
        planned_time_sec: te.timeSec ?? null,
        planned_rest_sec: te.restSec,
      });
      position++;
    }
  });
  return id;
});

const cloneFromHistory = db.transaction((clientId: string, sourceWorkoutId: string) => {
  const source = requireRow(getWorkoutStmt.get(sourceWorkoutId), 'Source workout');
  const sourceExercises = getWorkoutExercisesStmt.all(sourceWorkoutId);
  const sourceSets = getWorkoutSetsStmt.all(sourceWorkoutId);
  if (sourceExercises.length === 0) throw new HttpError(400, 'Source workout has no exercises');
  const id = nanoid(12);
  insertWorkoutStmt.run({
    id,
    client_id: clientId,
    source_template_id: source.source_template_id,
    name: source.name,
    category_tag: source.category_tag,
    created_at: new Date().toISOString(),
  });
  sourceExercises.forEach((e) => {
    insertExerciseStmt.run({ workout_id: id, position: e.position, exercise_id: e.exercise_id });
  });
  sourceSets.forEach((s) => {
    insertSetStmt.run({
      workout_id: id,
      exercise_position: s.exercise_position,
      set_index: s.set_index,
      planned_reps: s.planned_reps,
      planned_weight_kg: s.planned_weight_kg,
      planned_time_sec: s.planned_time_sec,
      planned_rest_sec: s.planned_rest_sec,
    });
  });
  return id;
});

// Переупорядочивание упражнений: удаляем и пересоздаём в новом порядке,
// т.к. position входит в составной ключ и используется как FK для подходов.
const reorderExercises = db.transaction((workoutId: string, order: number[]) => {
  const exercises = getWorkoutExercisesStmt.all(workoutId);
  const sets = getWorkoutSetsStmt.all(workoutId);
  const currentPositions = exercises.map((e) => e.position);
  const samePermutation =
    order.length === currentPositions.length &&
    [...order].sort((a, b) => a - b).join(',') === [...currentPositions].sort((a, b) => a - b).join(',');
  if (!samePermutation) {
    throw new HttpError(400, 'order must be a permutation of current exercise positions');
  }
  deleteWorkoutExercisesStmt.run(workoutId);
  order.forEach((oldPos, newPos) => {
    const ex = exercises.find((e) => e.position === oldPos)!;
    insertExerciseStmt.run({ workout_id: workoutId, position: newPos, exercise_id: ex.exercise_id });
    sets
      .filter((s) => s.exercise_position === oldPos)
      .forEach((s) => {
        insertFullSetStmt.run({
          workout_id: workoutId,
          exercise_position: newPos,
          set_index: s.set_index,
          planned_reps: s.planned_reps,
          planned_weight_kg: s.planned_weight_kg,
          planned_time_sec: s.planned_time_sec,
          planned_rest_sec: s.planned_rest_sec,
          actual_reps: s.actual_reps,
          actual_weight_kg: s.actual_weight_kg,
          actual_time_sec: s.actual_time_sec,
          done: s.done,
        });
      });
  });
});

// Добавление упражнения в конец тренировки с параметрами по умолчанию из карточки упражнения.
const addExerciseToWorkout = db.transaction((workoutId: string, exerciseId: string, setsCount: number) => {
  const ex = requireRow(getExerciseDefaultsStmt.get(exerciseId), 'Exercise');
  let position = getWorkoutExercisesStmt.all(workoutId).length;
  for (let s = 0; s < setsCount; s++) {
    insertExerciseStmt.run({ workout_id: workoutId, position, exercise_id: exerciseId });
    insertSetStmt.run({
      workout_id: workoutId,
      exercise_position: position,
      set_index: 0,
      planned_reps: ex.default_reps,
      planned_weight_kg: ex.default_weight_kg,
      planned_time_sec: ex.default_time_sec,
      planned_rest_sec: ex.rest_sec,
    });
    position++;
  }
});

// Удаление упражнения с пересчётом позиций оставшихся (position входит в составной ключ).
const removeExerciseFromWorkout = db.transaction((workoutId: string, position: number) => {
  const exercises = getWorkoutExercisesStmt.all(workoutId);
  if (!exercises.some((e) => e.position === position)) throw new HttpError(404, 'Exercise not found');
  const sets = getWorkoutSetsStmt.all(workoutId);
  const remaining = exercises.filter((e) => e.position !== position);
  deleteWorkoutExercisesStmt.run(workoutId);
  remaining.forEach((ex, newPos) => {
    insertExerciseStmt.run({ workout_id: workoutId, position: newPos, exercise_id: ex.exercise_id });
    sets
      .filter((s) => s.exercise_position === ex.position)
      .forEach((s) => {
        insertFullSetStmt.run({
          workout_id: workoutId,
          exercise_position: newPos,
          set_index: s.set_index,
          planned_reps: s.planned_reps,
          planned_weight_kg: s.planned_weight_kg,
          planned_time_sec: s.planned_time_sec,
          planned_rest_sec: s.planned_rest_sec,
          actual_reps: s.actual_reps,
          actual_weight_kg: s.actual_weight_kg,
          actual_time_sec: s.actual_time_sec,
          done: s.done,
        });
      });
  });
});

clientWorkoutsRouter.get(
  '/clients/:id/workouts',
  asyncHandler((req, res) => {
    const rows = getClientWorkoutsStmt.all(req.params.id);
    const current = rows.find((r) => r.status === 'draft' || r.status === 'active');
    const history = rows.filter((r) => r.status === 'completed' || r.status === 'skipped');
    res.json({
      current: current ? toWorkoutDetail(current) : null,
      history: history.map(toWorkoutSummary),
    });
  })
);

clientWorkoutsRouter.post(
  '/clients/:id/workouts',
  asyncHandler((req, res) => {
    const existing = getActiveOrDraftStmt.get(req.params.id);
    if (existing) throw new HttpError(409, 'Client already has a current workout', { workoutId: existing.id });
    const input = parseBody(assignInput, req.body);
    let workoutId: string;
    if (input.sourceTemplateId) {
      workoutId = assignFromTemplate(req.params.id, input.sourceTemplateId, { name: input.name, categoryTag: input.categoryTag ?? null });
    } else if (input.cloneFromWorkoutId) {
      workoutId = cloneFromHistory(req.params.id, input.cloneFromWorkoutId);
    } else if (input.exercises && input.name) {
      workoutId = assignFromExercises(req.params.id, input.name, input.categoryTag ?? null, input.exercises);
    } else {
      throw new HttpError(400, 'Provide sourceTemplateId, cloneFromWorkoutId, or name+exercises');
    }
    const row = requireRow(getWorkoutStmt.get(workoutId), 'Workout');
    res.status(201).json(toWorkoutDetail(row));
  })
);

clientWorkoutsRouter.get(
  '/client-workouts/:id',
  asyncHandler((req, res) => {
    const row = requireRow(getWorkoutStmt.get(req.params.id), 'Workout');
    res.json(toWorkoutDetail(row));
  })
);

clientWorkoutsRouter.delete(
  '/client-workouts/:id',
  asyncHandler((req, res) => {
    const result = deleteWorkoutStmt.run(req.params.id);
    if (result.changes === 0) throw new HttpError(404, 'Workout not found');
    res.status(204).send();
  })
);

clientWorkoutsRouter.patch(
  '/client-workouts/:id/start',
  asyncHandler((req, res) => {
    const existing = requireRow(getWorkoutStmt.get(req.params.id), 'Workout');
    if (existing.status !== 'draft') throw new HttpError(400, `Cannot start workout in status "${existing.status}"`);
    startStmt.run({ id: existing.id, started_at: new Date().toISOString() });
    const row = requireRow(getWorkoutStmt.get(existing.id), 'Workout');
    res.json(toWorkoutDetail(row));
  })
);

clientWorkoutsRouter.patch(
  '/client-workouts/:id/sets/:exPos/:setIdx',
  asyncHandler((req, res) => {
    const existing = requireRow(getWorkoutStmt.get(req.params.id), 'Workout');
    if (existing.status === 'completed' || existing.status === 'skipped') {
      throw new HttpError(400, 'Workout is already finished');
    }
    const exPos = Number(req.params.exPos);
    const setIdx = Number(req.params.setIdx);
    const input = parseBody(setUpdateInput, req.body);
    updateSetStmt.run({
      workout_id: existing.id,
      exercise_position: exPos,
      set_index: setIdx,
      actual_reps: input.actualReps ?? null,
      actual_weight_kg: input.actualWeightKg ?? null,
      actual_time_sec: input.actualTimeSec ?? null,
      done: input.done ? 1 : 0,
    });
    const row = requireRow(getWorkoutStmt.get(existing.id), 'Workout');
    res.json(toWorkoutDetail(row));
  })
);

clientWorkoutsRouter.patch(
  '/client-workouts/:id/reorder',
  asyncHandler((req, res) => {
    const existing = requireRow(getWorkoutStmt.get(req.params.id), 'Workout');
    if (existing.status === 'completed' || existing.status === 'skipped') {
      throw new HttpError(400, 'Workout is already finished');
    }
    const input = parseBody(reorderInput, req.body);
    reorderExercises(existing.id, input.order);
    const row = requireRow(getWorkoutStmt.get(existing.id), 'Workout');
    res.json(toWorkoutDetail(row));
  })
);

clientWorkoutsRouter.post(
  '/client-workouts/:id/exercises',
  asyncHandler((req, res) => {
    const existing = requireRow(getWorkoutStmt.get(req.params.id), 'Workout');
    if (existing.status === 'completed' || existing.status === 'skipped') {
      throw new HttpError(400, 'Workout is already finished');
    }
    const input = parseBody(addExerciseInput, req.body);
    addExerciseToWorkout(existing.id, input.exerciseId, input.sets ?? 1);
    const row = requireRow(getWorkoutStmt.get(existing.id), 'Workout');
    res.status(201).json(toWorkoutDetail(row));
  })
);

clientWorkoutsRouter.delete(
  '/client-workouts/:id/exercises/:position',
  asyncHandler((req, res) => {
    const existing = requireRow(getWorkoutStmt.get(req.params.id), 'Workout');
    if (existing.status === 'completed' || existing.status === 'skipped') {
      throw new HttpError(400, 'Workout is already finished');
    }
    removeExerciseFromWorkout(existing.id, Number(req.params.position));
    const row = requireRow(getWorkoutStmt.get(existing.id), 'Workout');
    res.json(toWorkoutDetail(row));
  })
);

clientWorkoutsRouter.patch(
  '/client-workouts/:id/finish',
  asyncHandler((req, res) => {
    const existing = requireRow(getWorkoutStmt.get(req.params.id), 'Workout');
    if (existing.status === 'completed' || existing.status === 'skipped') {
      throw new HttpError(400, 'Workout is already finished');
    }
    const input = parseBody(finishInput, req.body);
    finishStmt.run({
      id: existing.id,
      completed_at: new Date().toISOString(),
      duration_sec: input.durationSec,
      trainer_note: input.trainerNote ?? null,
      rpe: input.rpe ?? null,
    });
    const row = requireRow(getWorkoutStmt.get(existing.id), 'Workout');
    res.json(toWorkoutDetail(row));
  })
);
