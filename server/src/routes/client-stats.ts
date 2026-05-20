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
