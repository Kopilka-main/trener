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
  telegram TEXT,
  whatsapp TEXT,
  instagram TEXT,
  max TEXT,
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
  equipment TEXT,
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
  delivered_at TEXT,                                  -- когда клиент получил уведомление о занятии
  is_online INTEGER NOT NULL DEFAULT 0,               -- 1 = онлайн-тренировка (без статуса «согласовано»)
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date);
CREATE INDEX IF NOT EXISTS idx_sessions_client ON sessions(client_id);

-- Справочник залов (бухгалтерия + календарь могут ссылаться).
CREATE TABLE IF NOT EXISTS gyms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  monthly_rent REAL,
  note TEXT
);

-- Расходы тренера для бухгалтерии.
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,                  -- 'аренда' | 'инвентарь' | 'обучение' | 'прочее' | ...
  amount REAL NOT NULL,
  date TEXT NOT NULL,                      -- YYYY-MM-DD
  gym_id TEXT REFERENCES gyms(id) ON DELETE SET NULL,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,  -- если расход «для клиента»
  note TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);

-- Абстрактные доходы (без привязки к клиенту): тренировка-разовая, фарма, и т.д.
CREATE TABLE IF NOT EXISTS incomes (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,                  -- 'тренировка' | 'фарма' | 'консультация' | 'прочее'
  amount REAL NOT NULL,
  date TEXT NOT NULL,                      -- YYYY-MM-DD
  note TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_incomes_date ON incomes(date);

-- Пакеты оплаченных тренировок клиента (план/факт считается на лету).
CREATE TABLE IF NOT EXISTS payment_packages (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  lessons_paid INTEGER NOT NULL,
  price_per_lesson REAL NOT NULL,
  total_paid REAL NOT NULL,
  workout_type TEXT,                       -- 'силовая' | 'йога' | NULL = любой
  starts_at TEXT NOT NULL,                 -- YYYY-MM-DD
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'cancelled')),
  note TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_packages_client ON payment_packages(client_id, status);

-- Чат: 1 диалог на клиента. Для масштабирования на 40 000 пользователей
-- потребуется Postgres + WebSocket + реальная авторизация (сейчас MVP polling).
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
  trainer_last_received_at TEXT,                      -- последний раз тренер опрашивал сообщения
  trainer_last_read_at TEXT,                          -- последний раз тренер открыл диалог
  client_last_received_at TEXT,
  client_last_read_at TEXT
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('trainer', 'client')),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);

-- Замеры тела клиента (вес, % жира/мышц/воды, обхваты). Один замер на дату/клиента.
CREATE TABLE IF NOT EXISTS measurements (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  date TEXT NOT NULL,                     -- YYYY-MM-DD
  weight_kg REAL,
  body_fat_pct REAL,
  muscle_pct REAL,
  water_pct REAL,
  chest_cm REAL,
  shoulders_cm REAL,
  waist_cm REAL,
  hips_cm REAL,
  biceps_l_cm REAL,
  biceps_r_cm REAL,
  thigh_l_cm REAL,
  thigh_r_cm REAL,
  calf_l_cm REAL,
  calf_r_cm REAL,
  neck_cm REAL,
  note TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_measurements_client ON measurements(client_id, date);

-- Фотографии прогресса. По одной записи на ракурс/дату/клиента.
CREATE TABLE IF NOT EXISTS progress_photos (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  date TEXT NOT NULL,                     -- YYYY-MM-DD
  angle TEXT NOT NULL,                    -- front | side | back
  file_path TEXT NOT NULL,                -- относительный путь в uploads/
  note TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_progress_photos_client ON progress_photos(client_id, date);

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
  share_code TEXT,
  works_online INTEGER NOT NULL DEFAULT 1
);
