import { Router } from 'express';
import { db } from '../db.js';
import { asyncHandler } from '../http.js';

// Лента «событий» тренера. В отличие от alerts (что требует действия),
// сюда попадают информационные карточки:
//   • system — события, что произошли сами (клиент подтвердил тренировку,
//              провёл занятие, у клиента сегодня день рождения, побил PR);
//   • mine   — действия тренера (создал занятие, оформил пакет, провёл сессию).
// Источник — существующие таблицы (sessions, payment_packages, client_workouts).
// Глубина окна — 14 дней.
export const eventsRouter = Router();

type Event = {
  id: string;
  type:
    | 'birthday'
    | 'session_completed'
    | 'session_approved'
    | 'pr'
    | 'session_added'
    | 'package_added'
    | 'workout_done';
  category: 'system' | 'mine';
  timestamp: string;
  clientId: string | null;
  clientName: string | null;
  message: string;
};

const WINDOW_DAYS = 14;

// ─── System events ──────────────────────────────────────────────────────────

// Дни рождения сегодня — синтетический timestamp = сегодня 09:00 локально.
const birthdaysTodayStmt = db.prepare<[], { id: string; first_name: string; last_name: string }>(`
  SELECT id, first_name, last_name FROM clients
  WHERE birth_date IS NOT NULL
    AND strftime('%m-%d', birth_date) = strftime('%m-%d', 'now')
`);

// Тренировки, проведённые за последние 14 дней (sessions.status='completed').
const completedSessionsStmt = db.prepare<[number], {
  id: string; date: string; start_time: string; is_online: number;
  client_id: string; first_name: string; last_name: string;
}>(`
  SELECT s.id, s.date, s.start_time, s.is_online,
         c.id AS client_id, c.first_name, c.last_name
  FROM sessions s JOIN clients c ON c.id = s.client_id
  WHERE s.status = 'completed' AND s.date >= DATE('now', '-' || ? || ' days')
  ORDER BY s.date DESC, s.start_time DESC
`);

// Согласованные клиентом тренировки (approval='approved', delivered).
const approvedSessionsStmt = db.prepare<[number], {
  id: string; date: string; start_time: string; delivered_at: string | null;
  client_id: string; first_name: string; last_name: string;
}>(`
  SELECT s.id, s.date, s.start_time, s.delivered_at,
         c.id AS client_id, c.first_name, c.last_name
  FROM sessions s JOIN clients c ON c.id = s.client_id
  WHERE s.approval = 'approved' AND s.delivered_at IS NOT NULL
    AND DATE(s.delivered_at) >= DATE('now', '-' || ? || ' days')
  ORDER BY s.delivered_at DESC
`);

// Личные рекорды за окно — последний подход с максимальным весом за упражнение
// клиента за последние 14 дней, если этот вес — действительно максимум за всё время.
const recentPRStmt = db.prepare<[number], {
  client_id: string; first_name: string; last_name: string;
  exercise_id: string; exercise_name: string;
  weight: number; reps: number; completed_at: string;
}>(`
  WITH alltime AS (
    SELECT w.client_id, we.exercise_id, MAX(s.actual_weight_kg) AS best
    FROM client_workouts w
    JOIN client_workout_exercises we ON we.workout_id = w.id
    JOIN client_workout_sets s ON s.workout_id = w.id AND s.exercise_position = we.position
    WHERE w.status = 'completed' AND s.done = 1 AND s.actual_weight_kg IS NOT NULL
    GROUP BY w.client_id, we.exercise_id
  )
  SELECT w.client_id, c.first_name, c.last_name,
         we.exercise_id, e.name AS exercise_name,
         s.actual_weight_kg AS weight, s.actual_reps AS reps,
         w.completed_at
  FROM client_workouts w
  JOIN clients c ON c.id = w.client_id
  JOIN client_workout_exercises we ON we.workout_id = w.id
  JOIN client_workout_sets s ON s.workout_id = w.id AND s.exercise_position = we.position
  JOIN exercises e ON e.id = we.exercise_id
  JOIN alltime a ON a.client_id = w.client_id AND a.exercise_id = we.exercise_id
  WHERE w.status = 'completed' AND s.done = 1
    AND DATE(w.completed_at) >= DATE('now', '-' || ? || ' days')
    AND s.actual_weight_kg = a.best
  GROUP BY w.client_id, we.exercise_id   -- по одному PR на упражнение
  ORDER BY w.completed_at DESC
`);

// ─── Mine events ────────────────────────────────────────────────────────────

const addedSessionsStmt = db.prepare<[number], {
  id: string; client_id: string; first_name: string; last_name: string;
  date: string; start_time: string; created_at: string; is_online: number;
}>(`
  SELECT s.id, s.client_id, c.first_name, c.last_name,
         s.date, s.start_time, s.created_at, s.is_online
  FROM sessions s JOIN clients c ON c.id = s.client_id
  WHERE DATE(s.created_at) >= DATE('now', '-' || ? || ' days')
  ORDER BY s.created_at DESC
`);

const addedPackagesStmt = db.prepare<[number], {
  id: string; client_id: string; first_name: string; last_name: string;
  lessons_paid: number; total_paid: number; created_at: string;
}>(`
  SELECT p.id, p.client_id, c.first_name, c.last_name,
         p.lessons_paid, p.total_paid, p.created_at
  FROM payment_packages p JOIN clients c ON c.id = p.client_id
  WHERE DATE(p.created_at) >= DATE('now', '-' || ? || ' days')
  ORDER BY p.created_at DESC
`);

// ─── Router ─────────────────────────────────────────────────────────────────

eventsRouter.get(
  '/',
  asyncHandler((_req, res) => {
    const today9am = `${new Date().toISOString().slice(0, 10)}T09:00:00.000Z`;
    const system: Event[] = [];
    const mine: Event[] = [];

    for (const r of birthdaysTodayStmt.all()) {
      system.push({
        id: `bday-${r.id}`,
        type: 'birthday',
        category: 'system',
        timestamp: today9am,
        clientId: r.id,
        clientName: `${r.first_name} ${r.last_name}`,
        message: 'Ожидается поздравление с днём рождения',
      });
    }

    for (const r of completedSessionsStmt.all(WINDOW_DAYS)) {
      system.push({
        id: `done-${r.id}`,
        type: 'session_completed',
        category: 'system',
        timestamp: `${r.date}T${r.start_time}:00`,
        clientId: r.client_id,
        clientName: `${r.first_name} ${r.last_name}`,
        message: r.is_online === 1 ? 'Проведена онлайн-тренировка' : 'Проведена тренировка',
      });
    }

    for (const r of approvedSessionsStmt.all(WINDOW_DAYS)) {
      if (!r.delivered_at) continue;
      system.push({
        id: `approved-${r.id}`,
        type: 'session_approved',
        category: 'system',
        timestamp: r.delivered_at,
        clientId: r.client_id,
        clientName: `${r.first_name} ${r.last_name}`,
        message: `Подтверждена тренировка ${r.date} ${r.start_time}`,
      });
    }

    for (const r of recentPRStmt.all(WINDOW_DAYS)) {
      system.push({
        id: `pr-${r.client_id}-${r.exercise_id}-${r.completed_at}`,
        type: 'pr',
        category: 'system',
        timestamp: r.completed_at,
        clientId: r.client_id,
        clientName: `${r.first_name} ${r.last_name}`,
        message: `Личный рекорд: ${r.exercise_name} — ${r.weight} кг × ${r.reps}`,
      });
    }

    for (const r of addedSessionsStmt.all(WINDOW_DAYS)) {
      mine.push({
        id: `add-ses-${r.id}`,
        type: 'session_added',
        category: 'mine',
        timestamp: r.created_at,
        clientId: r.client_id,
        clientName: `${r.first_name} ${r.last_name}`,
        message: `${r.is_online === 1 ? 'Онлайн-' : ''}Запись на ${r.date} ${r.start_time}`,
      });
    }

    for (const r of addedPackagesStmt.all(WINDOW_DAYS)) {
      mine.push({
        id: `add-pkg-${r.id}`,
        type: 'package_added',
        category: 'mine',
        timestamp: r.created_at,
        clientId: r.client_id,
        clientName: `${r.first_name} ${r.last_name}`,
        message: `Оформлен пакет: ${r.lessons_paid} тренировок · ${Math.round(r.total_paid)} ₽`,
      });
    }

    system.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    mine.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    res.json({ system, mine });
  })
);
