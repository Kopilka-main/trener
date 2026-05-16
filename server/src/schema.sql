-- Trener app SQLite schema. Loaded on server start; safe to re-run.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  birth_date TEXT,
  height_cm INTEGER,
  weight_kg REAL,
  phone TEXT,
  hashtags TEXT,
  notes TEXT,
  medical_notes TEXT,
  resting_pulse INTEGER,
  schedule_day INTEGER,
  schedule_time TEXT,
  current_training_type TEXT,
  account_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_description TEXT,
  description TEXT,
  category TEXT NOT NULL,
  target_muscles TEXT,
  default_reps INTEGER,
  default_weight_kg REAL,
  default_time_sec INTEGER,
  rest_sec INTEGER NOT NULL DEFAULT 90,
  note TEXT
);

CREATE TABLE IF NOT EXISTS workout_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_description TEXT,
  description TEXT,
  muscle_group TEXT,
  category_tag TEXT
);

CREATE TABLE IF NOT EXISTS workout_template_exercises (
  template_id TEXT NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  exercise_id TEXT NOT NULL REFERENCES exercises(id),
  sets INTEGER NOT NULL,
  reps INTEGER,
  weight_kg REAL,
  time_sec INTEGER,
  rest_sec INTEGER NOT NULL,
  PRIMARY KEY (template_id, position)
);

CREATE TABLE IF NOT EXISTS client_workouts (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  source_template_id TEXT REFERENCES workout_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category_tag TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'completed', 'skipped')),
  started_at TEXT,
  completed_at TEXT,
  duration_sec INTEGER,
  trainer_note TEXT,
  rpe INTEGER,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_client_workouts_client ON client_workouts(client_id, status);

CREATE TABLE IF NOT EXISTS client_workout_exercises (
  workout_id TEXT NOT NULL REFERENCES client_workouts(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  exercise_id TEXT NOT NULL REFERENCES exercises(id),
  PRIMARY KEY (workout_id, position)
);

CREATE TABLE IF NOT EXISTS client_workout_sets (
  workout_id TEXT NOT NULL,
  exercise_position INTEGER NOT NULL,
  set_index INTEGER NOT NULL,
  planned_reps INTEGER,
  planned_weight_kg REAL,
  planned_time_sec INTEGER,
  planned_rest_sec INTEGER,
  actual_reps INTEGER,
  actual_weight_kg REAL,
  actual_time_sec INTEGER,
  done INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (workout_id, exercise_position, set_index),
  FOREIGN KEY (workout_id, exercise_position)
    REFERENCES client_workout_exercises(workout_id, position) ON DELETE CASCADE
);

-- Запланированные занятия (календарь тренера).
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  workout_id TEXT REFERENCES client_workouts(id) ON DELETE SET NULL,
  date TEXT NOT NULL,            -- YYYY-MM-DD
  start_time TEXT NOT NULL,      -- HH:MM
  duration_min INTEGER NOT NULL DEFAULT 60,
  location TEXT,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'completed', 'cancelled')),
  approval TEXT NOT NULL DEFAULT 'none' CHECK (approval IN ('none', 'pending', 'approved')),
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date);
CREATE INDEX IF NOT EXISTS idx_sessions_client ON sessions(client_id);

-- Профиль тренера (одна запись на приложение).
CREATE TABLE IF NOT EXISTS trainer (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  title TEXT,
  specialties TEXT,
  hashtags TEXT,
  bio TEXT,
  phone TEXT,
  email TEXT,
  telegram TEXT,
  instagram TEXT,
  share_code TEXT
);
