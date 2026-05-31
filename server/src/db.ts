import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH ?? join(__dirname, '..', 'data.db');
const SCHEMA_PATH = join(__dirname, 'schema.sql');

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = readFileSync(SCHEMA_PATH, 'utf-8');
db.exec(schema);

// Лёгкая миграция новых колонок (SQLite не поддерживает IF NOT EXISTS в ALTER).
// Возвращает true, если колонка добавлена сейчас (для однократных пост-миграций).
function ensureColumn(table: string, name: string, def: string): boolean {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === name)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${def}`);
    return true;
  }
  return false;
}
ensureColumn('clients', 'telegram', 'TEXT');
ensureColumn('clients', 'whatsapp', 'TEXT');
ensureColumn('clients', 'instagram', 'TEXT');
ensureColumn('clients', 'max', 'TEXT');
ensureColumn('exercises', 'equipment', 'TEXT');
ensureColumn('expenses', 'client_id', 'TEXT');
ensureColumn('measurements', 'shoulders_cm', 'REAL');
ensureColumn('sessions', 'is_online', "INTEGER NOT NULL DEFAULT 0");
// works_online: новый дефолт 1 — большинство тренеров принимают онлайн.
// Для апгрейда со старой версии (колонка уже добавлялась с дефолтом 0)
// одноразово выставляем 1, чтобы кнопка «Онлайн» появилась в форме занятия.
const addedWorksOnline = ensureColumn('trainer', 'works_online', 'INTEGER NOT NULL DEFAULT 1');
ensureColumn('clients', 'online_until', 'TEXT');
if (addedWorksOnline) {
  db.exec(`UPDATE trainer SET works_online = 1`);
} else {
  // Старая колонка с дефолтом 0 — апгрейд: если у всех тренеров 0, ставим 1.
  // Если хоть у одного 1 — оставляем как есть (пользователь уже редактировал).
  const row = db.prepare<[], { max: number }>('SELECT COALESCE(MAX(works_online), 0) AS max FROM trainer').get();
  if (row && row.max === 0) {
    db.exec(`UPDATE trainer SET works_online = 1`);
  }
}

export type ClientRow = {
  id: string;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  phone: string | null;
  telegram: string | null;
  whatsapp: string | null;
  instagram: string | null;
  max: string | null;
  hashtags: string | null;
  notes: string | null;
  medical_notes: string | null;
  resting_pulse: number | null;
  schedule_day: number | null;
  schedule_time: string | null;
  current_training_type: string | null;
  account_id: string | null;
  online_until: string | null;
  created_at: string;
};

export type ExerciseRow = {
  id: string;
  name: string;
  short_description: string | null;
  description: string | null;
  category: string;
  target_muscles: string | null;
  equipment: string | null;
  default_reps: number | null;
  default_weight_kg: number | null;
  default_time_sec: number | null;
  rest_sec: number;
  note: string | null;
};

export type WorkoutTemplateRow = {
  id: string;
  name: string;
  short_description: string | null;
  description: string | null;
  muscle_group: string | null;
  category_tag: string | null;
};

export type TemplateExerciseRow = {
  template_id: string;
  position: number;
  exercise_id: string;
  sets: number;
  reps: number | null;
  weight_kg: number | null;
  time_sec: number | null;
  rest_sec: number;
};

export type ClientWorkoutRow = {
  id: string;
  client_id: string;
  source_template_id: string | null;
  name: string;
  category_tag: string | null;
  status: 'draft' | 'active' | 'completed' | 'skipped';
  started_at: string | null;
  completed_at: string | null;
  duration_sec: number | null;
  trainer_note: string | null;
  rpe: number | null;
  created_at: string;
};

export type WorkoutSetRow = {
  workout_id: string;
  exercise_position: number;
  set_index: number;
  planned_reps: number | null;
  planned_weight_kg: number | null;
  planned_time_sec: number | null;
  planned_rest_sec: number | null;
  actual_reps: number | null;
  actual_weight_kg: number | null;
  actual_time_sec: number | null;
  done: number;
};

export type SessionRow = {
  id: string;
  client_id: string;
  workout_id: string | null;
  date: string;
  start_time: string;
  duration_min: number;
  location: string | null;
  title: string | null;
  status: 'planned' | 'completed' | 'cancelled';
  approval: 'none' | 'pending' | 'approved';
  delivered_at: string | null;
  is_online: number;
  note: string | null;
  created_at: string;
};

export type ConversationRow = {
  id: string;
  client_id: string;
  trainer_last_received_at: string | null;
  trainer_last_read_at: string | null;
  client_last_received_at: string | null;
  client_last_read_at: string | null;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_role: 'trainer' | 'client';
  body: string;
  created_at: string;
};

export type GymRow = {
  id: string;
  name: string;
  monthly_rent: number | null;
  note: string | null;
};

export type ExpenseRow = {
  id: string;
  category: string;
  amount: number;
  date: string;
  gym_id: string | null;
  client_id: string | null;
  note: string | null;
  created_at: string;
};

export type IncomeRow = {
  id: string;
  category: string;
  amount: number;
  date: string;
  note: string | null;
  created_at: string;
};

export type PaymentPackageRow = {
  id: string;
  client_id: string;
  lessons_paid: number;
  price_per_lesson: number;
  total_paid: number;
  workout_type: string | null;
  starts_at: string;
  status: 'active' | 'closed' | 'cancelled';
  note: string | null;
  created_at: string;
};

export type MeasurementRow = {
  id: string;
  client_id: string;
  date: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  muscle_pct: number | null;
  water_pct: number | null;
  chest_cm: number | null;
  shoulders_cm: number | null;
  waist_cm: number | null;
  hips_cm: number | null;
  biceps_l_cm: number | null;
  biceps_r_cm: number | null;
  thigh_l_cm: number | null;
  thigh_r_cm: number | null;
  calf_l_cm: number | null;
  calf_r_cm: number | null;
  neck_cm: number | null;
  note: string | null;
  created_at: string;
};

export type ProgressPhotoRow = {
  id: string;
  client_id: string;
  date: string;
  angle: 'front' | 'side' | 'back';
  file_path: string;
  note: string | null;
  created_at: string;
};

export type TrainerRow = {
  id: string;
  first_name: string;
  last_name: string;
  title: string | null;
  specialties: string | null;
  hashtags: string | null;
  bio: string | null;
  phone: string | null;
  email: string | null;
  telegram: string | null;
  instagram: string | null;
  share_code: string | null;
  works_online: number;
};
