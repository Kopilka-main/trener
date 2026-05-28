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
function ensureColumn(table: string, name: string, def: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === name)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${def}`);
  }
}
ensureColumn('clients', 'telegram', 'TEXT');
ensureColumn('clients', 'whatsapp', 'TEXT');
ensureColumn('clients', 'instagram', 'TEXT');
ensureColumn('clients', 'max', 'TEXT');

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
  created_at: string;
};

export type ExerciseRow = {
  id: string;
  name: string;
  short_description: string | null;
  description: string | null;
  category: string;
  target_muscles: string | null;
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
};
