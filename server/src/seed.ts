import type Database from 'better-sqlite3';
import { db as defaultDb } from './db.js';

type DB = ReturnType<typeof defaultDb.prepare> extends never ? never : typeof defaultDb;

const now = () => new Date().toISOString();

function rid(prefix: string, n: number) {
  return `${prefix}_${String(n).padStart(3, '0')}`;
}

const clients = [
  { id: rid('cl', 1), first_name: 'Алина', last_name: 'Кузнецова', birth_date: '1997-03-14', height_cm: 168, weight_kg: 62, phone: '+7 (903) 412-08-15', hashtags: '#онлайн #clubalex #сила #утро', notes: 'Цель — сила и рекомпозиция. 2 года в зале, хорошо переносит объём. Утренние тренировки, любит сложные базовые движения.', medical_notes: 'L5–S1, грыжа (2022). Без осевой нагрузки на спину. Лактозная непереносимость. Пульс покоя ~62 уд/мин.', resting_pulse: 62, schedule_day: 0, schedule_time: '18:00', current_training_type: 'Сила' },
  { id: rid('cl', 2), first_name: 'Артём', last_name: 'Соловьёв', schedule_day: 2, schedule_time: '07:30', current_training_type: 'Кроссфит' },
  { id: rid('cl', 3), first_name: 'Борис', last_name: 'Гаврилов', current_training_type: 'Реабилитация' },
  { id: rid('cl', 4), first_name: 'Вера', last_name: 'Лосева', schedule_day: 3, schedule_time: '19:30', current_training_type: 'Похудение' },
  { id: rid('cl', 5), first_name: 'Даниил', last_name: 'Орешкин', schedule_day: 4, schedule_time: '08:00', current_training_type: 'Гипертрофия' },
  { id: rid('cl', 6), first_name: 'Елена', last_name: 'Морозова', schedule_day: 1, schedule_time: '10:00', current_training_type: 'Йога' },
  { id: rid('cl', 7), first_name: 'Игорь', last_name: 'Тарасов', schedule_day: 5, schedule_time: '11:00', current_training_type: 'Силовая' },
  { id: rid('cl', 8), first_name: 'Ксения', last_name: 'Белова', current_training_type: 'Подготовка к старту' },
  { id: rid('cl', 9), first_name: 'Михаил', last_name: 'Дроздов', schedule_day: 0, schedule_time: '20:00', current_training_type: 'Функционал' },
  { id: rid('cl', 10), first_name: 'Наталья', last_name: 'Зайцева', current_training_type: 'Растяжка' },
];

type ExerciseSeed = {
  id: string;
  name: string;
  short_description: string | null;
  description: string | null;
  category: string;
  target_muscles: string[];
  default_reps: number | null;
  default_weight_kg: number | null;
  default_time_sec: number | null;
  rest_sec: number;
  note: string | null;
};

const exercises: ExerciseSeed[] = [
  { id: rid('ex', 1), name: 'Жим ногами под углом 45°', short_description: 'Базовое упражнение для квадрицепса и ягодиц на тренажёре под углом.', description: 'Ноги на ширине плеч, носки слегка развёрнуты. Опускание до 90° в коленях, без отрыва поясницы от спинки. Темп 2-0-1, без замка в верхней точке.', category: 'Ноги', target_muscles: ['Квадрицепс', 'Ягодицы'], default_reps: 10, default_weight_kg: 80, default_time_sec: null, rest_sec: 90, note: 'Ноги на ширине плеч, носки чуть наружу. Пауза 1 сек в нижней точке, мощный выжим вверх.' },
  { id: rid('ex', 2), name: 'Румынская тяга', short_description: 'Базовое упражнение для бицепса бедра и ягодиц.', description: 'Штанга у бёдер, спина прямая. Наклон со сгибанием в тазобедренном суставе.', category: 'Ноги', target_muscles: ['Бицепс бедра', 'Ягодицы'], default_reps: 12, default_weight_kg: 60, default_time_sec: null, rest_sec: 120, note: null },
  { id: rid('ex', 3), name: 'Разгибания ног в тренажёре', short_description: 'Изоляция квадрицепса.', description: null, category: 'Ноги', target_muscles: ['Квадрицепс'], default_reps: 15, default_weight_kg: 35, default_time_sec: null, rest_sec: 90, note: null },
  { id: rid('ex', 4), name: 'Подъёмы на носки сидя', short_description: 'Изоляция икроножных мышц.', description: null, category: 'Ноги', target_muscles: ['Икры'], default_reps: 20, default_weight_kg: 40, default_time_sec: null, rest_sec: 60, note: null },
  { id: rid('ex', 5), name: 'Жим штанги лёжа', short_description: 'Базовое упражнение для груди.', description: null, category: 'Грудь', target_muscles: ['Грудные', 'Трицепс', 'Передняя дельта'], default_reps: 6, default_weight_kg: 70, default_time_sec: null, rest_sec: 120, note: null },
  { id: rid('ex', 6), name: 'Тяга штанги в наклоне', short_description: 'База на среднюю часть спины.', description: null, category: 'Спина', target_muscles: ['Средняя часть спины', 'Широчайшие'], default_reps: 8, default_weight_kg: 60, default_time_sec: null, rest_sec: 120, note: null },
  { id: rid('ex', 7), name: 'Жим гантелей сидя', short_description: 'Жим над головой для дельт.', description: null, category: 'Плечи', target_muscles: ['Дельты'], default_reps: 10, default_weight_kg: 22, default_time_sec: null, rest_sec: 90, note: null },
  { id: rid('ex', 8), name: 'Подтягивания', short_description: 'Базовое упражнение собственным весом.', description: null, category: 'Спина', target_muscles: ['Широчайшие', 'Бицепс'], default_reps: 8, default_weight_kg: 0, default_time_sec: null, rest_sec: 120, note: null },
  { id: rid('ex', 9), name: 'Тяга к лицу', short_description: 'Изоляция задней дельты и трапеций.', description: null, category: 'Плечи', target_muscles: ['Задняя дельта', 'Трапеции'], default_reps: 12, default_weight_kg: 20, default_time_sec: null, rest_sec: 60, note: null },
  { id: rid('ex', 10), name: 'Молотки на бицепс', short_description: 'Гантели нейтральным хватом.', description: null, category: 'Руки', target_muscles: ['Бицепс', 'Брахиалис'], default_reps: 12, default_weight_kg: 14, default_time_sec: null, rest_sec: 60, note: null },
  { id: rid('ex', 11), name: 'Тяга верхнего блока', short_description: 'Тяга к груди широким хватом.', description: null, category: 'Спина', target_muscles: ['Широчайшие'], default_reps: 10, default_weight_kg: 50, default_time_sec: null, rest_sec: 90, note: null },
  { id: rid('ex', 12), name: 'Тяга горизонтального блока', short_description: 'Тяга сидя на блоке.', description: null, category: 'Спина', target_muscles: ['Средняя часть спины'], default_reps: 10, default_weight_kg: 55, default_time_sec: null, rest_sec: 90, note: null },
  { id: rid('ex', 13), name: 'Подтягивания нейтральным хватом', short_description: 'Параллельный хват, акцент на широчайшие.', description: null, category: 'Спина', target_muscles: ['Широчайшие', 'Бицепс'], default_reps: 8, default_weight_kg: 0, default_time_sec: null, rest_sec: 120, note: null },
  { id: rid('ex', 14), name: 'Шраги с гантелями', short_description: 'Изоляция трапеций.', description: null, category: 'Плечи', target_muscles: ['Трапеции'], default_reps: 12, default_weight_kg: 24, default_time_sec: null, rest_sec: 60, note: null },
  { id: rid('ex', 15), name: 'Планка', short_description: 'Изометрия на корпус.', description: null, category: 'Корпус', target_muscles: ['Прямая мышца живота', 'Поперечная'], default_reps: null, default_weight_kg: null, default_time_sec: 45, rest_sec: 60, note: null },
  { id: rid('ex', 16), name: 'Отжимания на брусьях', short_description: 'Базовое для трицепса и низа груди.', description: null, category: 'Грудь', target_muscles: ['Трицепс', 'Грудные'], default_reps: 10, default_weight_kg: 0, default_time_sec: null, rest_sec: 90, note: null },
  { id: rid('ex', 17), name: 'Жим гантелей лёжа на наклонной', short_description: 'Акцент на верх груди.', description: null, category: 'Грудь', target_muscles: ['Грудные'], default_reps: 10, default_weight_kg: 22, default_time_sec: null, rest_sec: 90, note: null },
  { id: rid('ex', 18), name: 'Махи гантелями в стороны', short_description: 'Изоляция средней дельты.', description: null, category: 'Плечи', target_muscles: ['Средняя дельта'], default_reps: 15, default_weight_kg: 6, default_time_sec: null, rest_sec: 60, note: null },
  { id: rid('ex', 19), name: 'Разгибания на блоке', short_description: 'Изоляция трицепса.', description: null, category: 'Руки', target_muscles: ['Трицепс'], default_reps: 12, default_weight_kg: 25, default_time_sec: null, rest_sec: 60, note: null },
  { id: rid('ex', 20), name: 'Растяжка квадрицепса', short_description: 'Стоя, нога к ягодице.', description: null, category: 'Кардио', target_muscles: ['Квадрицепс'], default_reps: null, default_weight_kg: null, default_time_sec: 30, rest_sec: 0, note: null },
];

type TemplateSeed = {
  id: string;
  name: string;
  short_description: string | null;
  description: string | null;
  muscle_group: string | null;
  category_tag: string | null;
  exercises: Array<{ exercise_id: string; sets: number; reps: number | null; weight_kg: number | null; time_sec: number | null; rest_sec: number }>;
};

const templates: TemplateSeed[] = [
  {
    id: rid('tpl', 1),
    name: 'Верх · Сила',
    short_description: 'Силовая на верх — грудь, спина, плечи. 3 упражнения, ~55 мин.',
    description: 'Разминка 5–7 мин: суставная + лёгкая активация. Основная — базовые жимы и тяги, 4×6–8 на 75–80% от 1ПМ. Финиш — короткий блок на стабилизаторы.',
    muscle_group: 'Грудь',
    category_tag: 'Сила',
    exercises: [
      { exercise_id: rid('ex', 5), sets: 4, reps: 6, weight_kg: 70, time_sec: null, rest_sec: 120 },
      { exercise_id: rid('ex', 6), sets: 4, reps: 8, weight_kg: 60, time_sec: null, rest_sec: 120 },
      { exercise_id: rid('ex', 7), sets: 3, reps: 10, weight_kg: 22, time_sec: null, rest_sec: 90 },
    ],
  },
  {
    id: rid('tpl', 2),
    name: 'Низ · Гипертрофия',
    short_description: 'Объёмная работа на ноги и ягодицы. 4 упражнения, ~55 мин.',
    description: 'Разминка 7 мин. Основная: жим ногами 3×10, румынская 3×12, разгибания 3×15, икры 3×20.',
    muscle_group: 'Ноги',
    category_tag: 'Гипертрофия',
    exercises: [
      { exercise_id: rid('ex', 1), sets: 3, reps: 10, weight_kg: 80, time_sec: null, rest_sec: 120 },
      { exercise_id: rid('ex', 2), sets: 3, reps: 12, weight_kg: 60, time_sec: null, rest_sec: 120 },
      { exercise_id: rid('ex', 3), sets: 3, reps: 15, weight_kg: 35, time_sec: null, rest_sec: 90 },
      { exercise_id: rid('ex', 4), sets: 3, reps: 20, weight_kg: 40, time_sec: null, rest_sec: 60 },
    ],
  },
  {
    id: rid('tpl', 3),
    name: 'Push',
    short_description: 'Жимовые движения — грудь, плечи, трицепс.',
    description: null,
    muscle_group: 'Грудь',
    category_tag: 'Push',
    exercises: [
      { exercise_id: rid('ex', 5), sets: 4, reps: 8, weight_kg: 65, time_sec: null, rest_sec: 120 },
      { exercise_id: rid('ex', 17), sets: 3, reps: 10, weight_kg: 20, time_sec: null, rest_sec: 90 },
      { exercise_id: rid('ex', 18), sets: 3, reps: 15, weight_kg: 6, time_sec: null, rest_sec: 60 },
      { exercise_id: rid('ex', 19), sets: 3, reps: 12, weight_kg: 25, time_sec: null, rest_sec: 60 },
    ],
  },
  {
    id: rid('tpl', 4),
    name: 'Pull',
    short_description: 'Тяговые движения — спина и бицепс.',
    description: null,
    muscle_group: 'Спина',
    category_tag: 'Pull',
    exercises: [
      { exercise_id: rid('ex', 8), sets: 4, reps: 8, weight_kg: 0, time_sec: null, rest_sec: 120 },
      { exercise_id: rid('ex', 6), sets: 4, reps: 8, weight_kg: 60, time_sec: null, rest_sec: 120 },
      { exercise_id: rid('ex', 11), sets: 3, reps: 10, weight_kg: 50, time_sec: null, rest_sec: 90 },
      { exercise_id: rid('ex', 10), sets: 3, reps: 12, weight_kg: 14, time_sec: null, rest_sec: 60 },
    ],
  },
  {
    id: rid('tpl', 5),
    name: 'Восстановительная',
    short_description: 'Мобильность, дыхание и работа кора.',
    description: null,
    muscle_group: 'Корпус',
    category_tag: 'Восстановительная',
    exercises: [
      { exercise_id: rid('ex', 15), sets: 3, reps: null, weight_kg: null, time_sec: 45, rest_sec: 60 },
      { exercise_id: rid('ex', 20), sets: 2, reps: null, weight_kg: null, time_sec: 30, rest_sec: 30 },
    ],
  },
];

// Демо-занятия для календаря — неделя 11–17 мая 2026.
const sessionSeed = [
  { client: 1, date: '2026-05-11', time: '09:00', dur: 60, loc: 'Зал · ClubAlex', title: 'Низ · Сила' },
  { client: 9, date: '2026-05-11', time: '14:00', dur: 60, loc: 'Зал · ClubAlex', title: 'Функционал' },
  { client: 1, date: '2026-05-12', time: '08:00', dur: 60, loc: 'Зал · ClubAlex', title: 'Низ · Гипертрофия' },
  { client: 7, date: '2026-05-12', time: '10:00', dur: 45, loc: 'Онлайн', title: 'Push' },
  { client: 4, date: '2026-05-12', time: '12:30', dur: 60, loc: 'Зал · ClubAlex', title: 'Кардио + Кор' },
  { client: 9, date: '2026-05-12', time: '17:00', dur: 60, loc: 'Зал · ClubAlex', title: 'Верх · Сила' },
  { client: 7, date: '2026-05-13', time: '11:00', dur: 45, loc: 'Онлайн', title: 'Pull' },
  { client: 1, date: '2026-05-14', time: '09:00', dur: 60, loc: 'Зал · ClubAlex', title: 'Верх · Сила' },
  { client: 4, date: '2026-05-14', time: '16:00', dur: 60, loc: 'Зал · ClubAlex', title: 'Похудение' },
  { client: 9, date: '2026-05-15', time: '08:00', dur: 60, loc: 'Зал · ClubAlex', title: 'Функционал' },
  { client: 1, date: '2026-05-15', time: '17:00', dur: 60, loc: 'Зал · ClubAlex', title: 'Низ · Гипертрофия' },
  { client: 7, date: '2026-05-15', time: '18:00', dur: 45, loc: 'Онлайн', title: 'Push' },
  { client: 4, date: '2026-05-16', time: '10:00', dur: 60, loc: 'Зал · ClubAlex', title: 'Кардио + Кор' },
];

export function seedSessionsIfEmpty(database: typeof defaultDb = defaultDb) {
  const count = database.prepare<[], { c: number }>('SELECT COUNT(*) AS c FROM sessions').get();
  if (count && count.c > 0) return;
  const clientsCount = database.prepare<[], { c: number }>('SELECT COUNT(*) AS c FROM clients').get();
  if (!clientsCount || clientsCount.c === 0) return;
  console.log('[seed] empty sessions — loading calendar data');

  const insertSession = database.prepare(`
    INSERT INTO sessions (id, client_id, workout_id, date, start_time, duration_min, location, title, status, note, created_at)
    VALUES (@id, @client_id, @workout_id, @date, @start_time, @duration_min, @location, @title, @status, @note, @created_at)
  `);

  const today = new Date().toISOString().slice(0, 10);
  const tx = database.transaction(() => {
    sessionSeed.forEach((s, i) => {
      insertSession.run({
        id: rid('ses', i + 1),
        client_id: rid('cl', s.client),
        workout_id: null,
        date: s.date,
        start_time: s.time,
        duration_min: s.dur,
        location: s.loc,
        title: s.title,
        status: s.date < today ? 'completed' : 'planned',
        note: null,
        created_at: now(),
      });
    });
  });
  tx();
  console.log(`[seed] inserted ${sessionSeed.length} sessions`);
}

export function runSeedIfEmpty(database: typeof defaultDb = defaultDb) {
  const count = database.prepare<[], { c: number }>('SELECT COUNT(*) AS c FROM clients').get();
  if (count && count.c > 0) return;
  console.log('[seed] empty database — loading initial data');

  const insertClient = database.prepare(`
    INSERT INTO clients (id, first_name, last_name, birth_date, height_cm, weight_kg,
      phone, hashtags, notes, medical_notes, resting_pulse,
      schedule_day, schedule_time, current_training_type, created_at)
    VALUES (@id, @first_name, @last_name, @birth_date, @height_cm, @weight_kg,
      @phone, @hashtags, @notes, @medical_notes, @resting_pulse,
      @schedule_day, @schedule_time, @current_training_type, @created_at)
  `);

  const insertExercise = database.prepare(`
    INSERT INTO exercises (id, name, short_description, description, category, target_muscles,
      default_reps, default_weight_kg, default_time_sec, rest_sec, note)
    VALUES (@id, @name, @short_description, @description, @category, @target_muscles,
      @default_reps, @default_weight_kg, @default_time_sec, @rest_sec, @note)
  `);

  const insertTemplate = database.prepare(`
    INSERT INTO workout_templates (id, name, short_description, description, muscle_group, category_tag)
    VALUES (@id, @name, @short_description, @description, @muscle_group, @category_tag)
  `);

  const insertTemplateExercise = database.prepare(`
    INSERT INTO workout_template_exercises (template_id, position, exercise_id, sets, reps, weight_kg, time_sec, rest_sec)
    VALUES (@template_id, @position, @exercise_id, @sets, @reps, @weight_kg, @time_sec, @rest_sec)
  `);

  const tx = database.transaction(() => {
    for (const c of clients) {
      insertClient.run({
        id: c.id,
        first_name: c.first_name,
        last_name: c.last_name,
        birth_date: c.birth_date ?? null,
        height_cm: c.height_cm ?? null,
        weight_kg: c.weight_kg ?? null,
        phone: c.phone ?? null,
        hashtags: c.hashtags ?? null,
        notes: c.notes ?? null,
        medical_notes: c.medical_notes ?? null,
        resting_pulse: c.resting_pulse ?? null,
        schedule_day: c.schedule_day ?? null,
        schedule_time: c.schedule_time ?? null,
        current_training_type: c.current_training_type ?? null,
        created_at: now(),
      });
    }
    for (const e of exercises) {
      insertExercise.run({
        ...e,
        target_muscles: JSON.stringify(e.target_muscles),
      });
    }
    for (const t of templates) {
      insertTemplate.run({
        id: t.id,
        name: t.name,
        short_description: t.short_description,
        description: t.description,
        muscle_group: t.muscle_group,
        category_tag: t.category_tag,
      });
      t.exercises.forEach((ex, idx) => {
        insertTemplateExercise.run({
          template_id: t.id,
          position: idx,
          exercise_id: ex.exercise_id,
          sets: ex.sets,
          reps: ex.reps,
          weight_kg: ex.weight_kg,
          time_sec: ex.time_sec,
          rest_sec: ex.rest_sec,
        });
      });
    }
  });
  tx();
  console.log(`[seed] inserted ${clients.length} clients, ${exercises.length} exercises, ${templates.length} templates`);
}

export function seedTrainerIfEmpty(database: typeof defaultDb = defaultDb) {
  const count = database.prepare<[], { c: number }>('SELECT COUNT(*) AS c FROM trainer').get();
  if (count && count.c > 0) return;
  database
    .prepare(`
      INSERT INTO trainer (id, first_name, last_name, title, specialties, hashtags, bio, phone, email, telegram, instagram)
      VALUES (@id, @first_name, @last_name, @title, @specialties, @hashtags, @bio, @phone, @email, @telegram, @instagram)
    `)
    .run({
      id: 'trainer',
      first_name: 'Алексей',
      last_name: 'Морозов',
      title: 'Персональный тренер',
      specialties: 'Силовая · Реабилитация',
      hashtags: '#силовая #реабилитация #офп #утро',
      bio: 'Работаю с любителями и спортсменами-разрядниками. Силовая, постреабилитация после травм спины и колена. КМС по пауэрлифтингу.',
      phone: '+7 (905) 271-44-09',
      email: 'moroz.coach@mail.ru',
      telegram: '@moroz_coach',
      instagram: '@alexey.moroz.gym',
    });
  console.log('[seed] trainer profile created');
}

function genShareCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = '';
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

// Персональный код тренера для «поделиться контактом»: 10 заглавных латинских букв и цифр.
export function ensureTrainerShareCode(database: typeof defaultDb = defaultDb) {
  const cols = database.pragma('table_info(trainer)') as Array<{ name: string }>;
  if (!cols.some((c) => c.name === 'share_code')) {
    database.exec('ALTER TABLE trainer ADD COLUMN share_code TEXT');
  }
  const row = database
    .prepare<[], { share_code: string | null }>("SELECT share_code FROM trainer WHERE id = 'trainer'")
    .get();
  if (row && !row.share_code) {
    database.prepare("UPDATE trainer SET share_code = ? WHERE id = 'trainer'").run(genShareCode());
    console.log('[migrate] trainer share code generated');
  }
}

// Доустановка новых колонок для существующих БД (ALTER ADD COLUMN, идемпотентно).
export function ensureSchemaUpgrades(database: typeof defaultDb = defaultDb) {
  const addColumn = (table: string, column: string, decl: string) => {
    const cols = database.pragma(`table_info(${table})`) as Array<{ name: string }>;
    if (!cols.some((c) => c.name === column)) {
      database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${decl}`);
      console.log(`[migrate] ${table}.${column} added`);
    }
  };
  addColumn('clients', 'account_id', 'TEXT');
  addColumn('sessions', 'approval', "TEXT NOT NULL DEFAULT 'none'");
}

// Нормализация: каждый подход тренировки хранится как отдельная запись упражнения (1 подход).
// Идемпотентно — повторный запуск на нормализованных данных ничего не меняет.
export function normalizeWorkouts(database: typeof defaultDb = defaultDb) {
  type SetRow = {
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
  const workouts = database.prepare<[], { id: string }>('SELECT id FROM client_workouts').all();
  const getEx = database.prepare<[string], { position: number; exercise_id: string }>(
    'SELECT position, exercise_id FROM client_workout_exercises WHERE workout_id = ? ORDER BY position'
  );
  const getSets = database.prepare<[string], SetRow>(
    'SELECT exercise_position, set_index, planned_reps, planned_weight_kg, planned_time_sec, planned_rest_sec, actual_reps, actual_weight_kg, actual_time_sec, done FROM client_workout_sets WHERE workout_id = ? ORDER BY exercise_position, set_index'
  );
  const delEx = database.prepare('DELETE FROM client_workout_exercises WHERE workout_id = ?');
  const insEx = database.prepare('INSERT INTO client_workout_exercises (workout_id, position, exercise_id) VALUES (?, ?, ?)');
  const insSet = database.prepare(
    'INSERT INTO client_workout_sets (workout_id, exercise_position, set_index, planned_reps, planned_weight_kg, planned_time_sec, planned_rest_sec, actual_reps, actual_weight_kg, actual_time_sec, done) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );

  const rebuild = database.transaction((workoutId: string, flat: { exerciseId: string; set: SetRow }[]) => {
    delEx.run(workoutId);
    flat.forEach((entry, pos) => {
      insEx.run(workoutId, pos, entry.exerciseId);
      const s = entry.set;
      insSet.run(
        workoutId, pos, 0,
        s.planned_reps, s.planned_weight_kg, s.planned_time_sec, s.planned_rest_sec,
        s.actual_reps, s.actual_weight_kg, s.actual_time_sec, s.done
      );
    });
  });

  let fixed = 0;
  for (const w of workouts) {
    const exs = getEx.all(w.id);
    const sets = getSets.all(w.id);
    const needsSplit = exs.some((e) => sets.filter((s) => s.exercise_position === e.position).length !== 1);
    if (!needsSplit) continue;
    const flat: { exerciseId: string; set: SetRow }[] = [];
    for (const e of exs) {
      for (const s of sets.filter((s) => s.exercise_position === e.position)) {
        flat.push({ exerciseId: e.exercise_id, set: s });
      }
    }
    rebuild(w.id, flat);
    fixed++;
  }
  if (fixed > 0) console.log(`[migrate] normalized ${fixed} workout(s) to one-set-per-exercise`);
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  runSeedIfEmpty();
  seedSessionsIfEmpty();
  seedTrainerIfEmpty();
  ensureTrainerShareCode();
  ensureSchemaUpgrades();
  normalizeWorkouts();
}
