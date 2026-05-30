import { Router } from 'express';
import { db } from '../db.js';
import { asyncHandler, requireRow } from '../http.js';

export const clientStatsRouter = Router({ mergeParams: true });

const clientExistsStmt = db.prepare<[string], { id: string }>(`SELECT id FROM clients WHERE id = ?`);

const summaryStmt = db.prepare<[string], { total: number; firstAt: string | null; lastAt: string | null }>(`
  SELECT COUNT(*) AS total,
         MIN(completed_at) AS firstAt,
         MAX(completed_at) AS lastAt
  FROM client_workouts
  WHERE client_id = ? AND status = 'completed' AND completed_at IS NOT NULL
`);

const frequencyStmt = db.prepare<[string], { week: string; n: number }>(`
  SELECT strftime('%Y-%W', completed_at) AS week, COUNT(*) AS n
  FROM client_workouts
  WHERE client_id = ? AND status = 'completed' AND completed_at IS NOT NULL
    AND DATE(completed_at) >= DATE('now', '-84 days')
  GROUP BY week
  ORDER BY week
`);

const recordsStmt = db.prepare<[string], { name: string; weight: number; reps: number; completed_at: string | null }>(`
  SELECT e.name AS name, s.actual_weight_kg AS weight, s.actual_reps AS reps, w.completed_at
  FROM client_workouts w
  JOIN client_workout_exercises we ON we.workout_id = w.id
  JOIN client_workout_sets s ON s.workout_id = w.id AND s.exercise_position = we.position
  JOIN exercises e ON e.id = we.exercise_id
  WHERE w.client_id = ? AND w.status = 'completed' AND s.done = 1
    AND s.actual_weight_kg IS NOT NULL AND s.actual_reps IS NOT NULL
  ORDER BY (s.actual_weight_kg * s.actual_reps) DESC
  LIMIT 5
`);

const totalsStmt = db.prepare<[string], { month: string; tonnage: number }>(`
  SELECT strftime('%Y-%m', w.completed_at) AS month,
         SUM(COALESCE(s.actual_weight_kg, 0) * COALESCE(s.actual_reps, 0)) AS tonnage
  FROM client_workouts w
  JOIN client_workout_sets s ON s.workout_id = w.id AND s.done = 1
  WHERE w.client_id = ? AND w.status = 'completed'
    AND w.completed_at IS NOT NULL
    AND DATE(w.completed_at) >= DATE('now', '-180 days')
  GROUP BY month
  ORDER BY month
`);

// ─── Статистика по упражнениям клиента ──────────────────────────────────────
//
// Список всех упражнений, которые клиент когда-либо делал (только completed
// тренировки, только подходы с done=1). По каждому — агрегаты: сколько раз
// делал, текущий PR, общий тоннаж, последняя дата + флаг «на последней
// тренировке побит хотя бы один рекорд» (тоннаж / max-вес / max-time).
const perWorkoutStmt = db.prepare<
  [string],
  {
    exerciseId: string;
    name: string;
    category: string | null;
    workoutId: string;
    date: string | null;
    tonnage: number;
    maxWeight: number | null;
    maxTime: number | null;
    totalTime: number;
  }
>(`
  SELECT
    we.exercise_id AS exerciseId,
    e.name AS name,
    e.category AS category,
    w.id AS workoutId,
    w.completed_at AS date,
    SUM(COALESCE(s.actual_weight_kg, 0) * COALESCE(s.actual_reps, 0)) AS tonnage,
    MAX(s.actual_weight_kg) AS maxWeight,
    MAX(s.actual_time_sec) AS maxTime,
    SUM(COALESCE(s.actual_time_sec, 0)) AS totalTime
  FROM client_workouts w
  JOIN client_workout_exercises we ON we.workout_id = w.id
  JOIN client_workout_sets s ON s.workout_id = w.id AND s.exercise_position = we.position
  JOIN exercises e ON e.id = we.exercise_id
  WHERE w.client_id = ? AND w.status = 'completed' AND s.done = 1
  GROUP BY we.exercise_id, e.name, e.category, w.id, w.completed_at
  ORDER BY w.completed_at
`);

clientStatsRouter.get(
  '/exercises',
  asyncHandler((req, res) => {
    const id = req.params.id;
    requireRow(clientExistsStmt.get(id), 'Client');
    const rows = perWorkoutStmt.all(id);

    // Группируем по упражнению (rows уже отсортированы по дате ASC).
    const byExercise = new Map<string, typeof rows>();
    for (const r of rows) {
      const arr = byExercise.get(r.exerciseId) ?? [];
      arr.push(r);
      byExercise.set(r.exerciseId, arr);
    }

    const result = Array.from(byExercise.entries()).map(([exerciseId, list]) => {
      const last = list[list.length - 1];
      const prev = list.slice(0, -1);
      const prevMaxTonnage = Math.max(0, ...prev.map((p) => p.tonnage));
      const prevMaxWeight = Math.max(0, ...prev.map((p) => p.maxWeight ?? 0));
      const prevMaxTime = Math.max(0, ...prev.map((p) => p.maxTime ?? 0));
      // Рекорд: первая когда-либо тренировка — это автоматически рекорд
      // (устанавливает первые PR). Иначе — побитие любой из трёх метрик.
      const lastIsRecord =
        prev.length === 0
          ? last.tonnage > 0 || (last.maxWeight ?? 0) > 0 || (last.maxTime ?? 0) > 0
          : last.tonnage > prevMaxTonnage ||
            (last.maxWeight ?? 0) > prevMaxWeight ||
            (last.maxTime ?? 0) > prevMaxTime;
      const overallMaxWeight = Math.max(prevMaxWeight, last.maxWeight ?? 0) || null;
      const overallMaxTime = Math.max(prevMaxTime, last.maxTime ?? 0) || null;
      const overallTonnage = list.reduce((s, p) => s + p.tonnage, 0);
      const overallTotalTime = list.reduce((s, p) => s + (p.totalTime ?? 0), 0);
      // Time-based: ни в одной тренировке не было веса/тоннажа, но было время.
      const isTimeBased = overallTonnage === 0 && (overallMaxTime ?? 0) > 0;
      return {
        exerciseId,
        name: last.name,
        category: last.category,
        times: list.length,
        maxWeightKg: overallMaxWeight,
        tonnage: Math.round(overallTonnage),
        maxTimeSec: overallMaxTime,
        totalTimeSec: Math.round(overallTotalTime),
        isTimeBased,
        lastDate: last.date,
        lastIsRecord,
      };
    });
    // Сортируем по последней дате DESC — недавние сверху.
    result.sort((a, b) => (b.lastDate ?? '').localeCompare(a.lastDate ?? ''));
    res.json(result);
  })
);

// История выполнения конкретного упражнения — по сессиям (один пункт на тренировку).
const exerciseHistoryStmt = db.prepare<
  [string, string],
  {
    workoutId: string;
    date: string | null;
    tonnage: number;
    maxWeight: number | null;
    bestReps: number | null;
    totalSets: number;
    maxTime: number | null;
    totalTime: number;
  }
>(`
  SELECT
    w.id AS workoutId,
    w.completed_at AS date,
    SUM(COALESCE(s.actual_weight_kg, 0) * COALESCE(s.actual_reps, 0)) AS tonnage,
    MAX(s.actual_weight_kg) AS maxWeight,
    MAX(s.actual_reps) AS bestReps,
    COUNT(*) AS totalSets,
    MAX(s.actual_time_sec) AS maxTime,
    SUM(COALESCE(s.actual_time_sec, 0)) AS totalTime
  FROM client_workouts w
  JOIN client_workout_exercises we ON we.workout_id = w.id
  JOIN client_workout_sets s ON s.workout_id = w.id AND s.exercise_position = we.position
  WHERE w.client_id = ? AND we.exercise_id = ?
    AND w.status = 'completed' AND s.done = 1
  GROUP BY w.id, w.completed_at
  ORDER BY w.completed_at
`);

const exerciseInfoStmt = db.prepare<[string], { id: string; name: string; category: string | null }>(
  `SELECT id, name, category FROM exercises WHERE id = ?`
);

clientStatsRouter.get(
  '/exercises/:exId/history',
  asyncHandler((req, res) => {
    const id = req.params.id;
    const exId = req.params.exId;
    requireRow(clientExistsStmt.get(id), 'Client');
    const ex = requireRow(exerciseInfoStmt.get(exId), 'Exercise');
    const points = exerciseHistoryStmt.all(id, exId);
    // Time-based: суммарный тоннаж = 0, но max time > 0 — упражнение измеряется временем.
    const totalTonnage = points.reduce((s, p) => s + p.tonnage, 0);
    const anyMaxTime = points.reduce((m, p) => Math.max(m, p.maxTime ?? 0), 0);
    const isTimeBased = totalTonnage === 0 && anyMaxTime > 0;
    res.json({
      exercise: { id: ex.id, name: ex.name, category: ex.category },
      isTimeBased,
      points: points.map((p) => ({
        workoutId: p.workoutId,
        date: p.date,
        tonnage: Math.round(p.tonnage),
        maxWeightKg: p.maxWeight,
        bestReps: p.bestReps,
        totalSets: p.totalSets,
        maxTimeSec: p.maxTime,
        totalTimeSec: Math.round(p.totalTime),
      })),
    });
  })
);

clientStatsRouter.get(
  '/',
  asyncHandler((req, res) => {
    const id = req.params.id;
    requireRow(clientExistsStmt.get(id), 'Client');
    const summary = summaryStmt.get(id) ?? { total: 0, firstAt: null, lastAt: null };
    const frequency = frequencyStmt.all(id);
    const records = recordsStmt.all(id);
    const totals = totalsStmt.all(id);

    // Средняя посещаемость в неделю за период с первой по последнюю.
    let avgPerWeek = 0;
    if (summary.total > 0 && summary.firstAt && summary.lastAt) {
      const days = Math.max(
        1,
        Math.round((new Date(summary.lastAt).getTime() - new Date(summary.firstAt).getTime()) / 86_400_000) + 1
      );
      avgPerWeek = (summary.total / days) * 7;
    }

    res.json({
      total: summary.total,
      avgPerWeek: Math.round(avgPerWeek * 10) / 10,
      frequency: frequency.map((r) => ({ week: r.week, count: r.n })),
      records: records.map((r) => ({
        exerciseName: r.name,
        weightKg: r.weight,
        reps: r.reps,
        date: r.completed_at,
      })),
      totals: totals.map((r) => ({ month: r.month, tonnage: Math.round(r.tonnage) })),
    });
  })
);
