// Стартовые данные демо-версии. Переносят сид-данные сервера в браузер.
import type { Client, Exercise, Session, Trainer, WorkoutTemplate, TemplateExercise, WorkoutStatus } from './types';

// Сервер отдаёт restSec/plannedRestSec, хотя в публичных типах они опущены.
export type DemoExercise = Exercise & { restSec: number };
export type DemoTemplateExercise = TemplateExercise & { restSec: number };
export type DemoTemplate = Omit<WorkoutTemplate, 'exercises'> & { exercises: DemoTemplateExercise[] };
export type DemoSession = Omit<Session, 'clientFirstName' | 'clientLastName'>;

export type DemoSet = {
  setIndex: number;
  plannedReps: number | null;
  plannedWeightKg: number | null;
  plannedTimeSec: number | null;
  plannedRestSec: number | null;
  actualReps: number | null;
  actualWeightKg: number | null;
  actualTimeSec: number | null;
  done: boolean;
};

export type DemoWorkoutExercise = {
  position: number;
  exerciseId: string;
  exerciseName: string;
  exerciseCategory: string;
  sets: DemoSet[];
};

export type DemoWorkout = {
  id: string;
  clientId: string;
  sourceTemplateId: string | null;
  name: string;
  categoryTag: string | null;
  status: WorkoutStatus;
  startedAt: string | null;
  completedAt: string | null;
  durationSec: number | null;
  trainerNote: string | null;
  rpe: number | null;
  createdAt: string;
  exercises: DemoWorkoutExercise[];
};

export type DemoStore = {
  clients: Client[];
  exercises: DemoExercise[];
  templates: DemoTemplate[];
  workouts: DemoWorkout[];
  sessions: DemoSession[];
  trainer: Trainer;
};

const SEED_TS = '2026-01-10T09:00:00.000Z';
const rid = (prefix: string, n: number) => `${prefix}_${String(n).padStart(3, '0')}`;

function seedClients(): Client[] {
  const base = {
    birthDate: null as string | null,
    heightCm: null as number | null,
    weightKg: null as number | null,
    phone: null as string | null,
    hashtags: null as string | null,
    notes: null as string | null,
    medicalNotes: null as string | null,
    restingPulse: null as number | null,
    scheduleDay: null as number | null,
    scheduleTime: null as string | null,
    accountId: null as string | null,
    createdAt: SEED_TS,
  };
  return [
    {
      ...base,
      id: rid('cl', 1),
      firstName: 'Алина',
      lastName: 'Кузнецова',
      birthDate: '1997-03-14',
      heightCm: 168,
      weightKg: 62,
      phone: '+7 (903) 412-08-15',
      hashtags: '#онлайн #clubalex #сила #утро',
      notes: 'Цель — сила и рекомпозиция. 2 года в зале, хорошо переносит объём. Утренние тренировки, любит сложные базовые движения.',
      medicalNotes: 'L5–S1, грыжа (2022). Без осевой нагрузки на спину. Лактозная непереносимость. Пульс покоя ~62 уд/мин.',
      restingPulse: 62,
      scheduleDay: 0,
      scheduleTime: '18:00',
      currentTrainingType: 'Сила',
      accountId: '87874775',
    },
    { ...base, id: rid('cl', 2), firstName: 'Артём', lastName: 'Соловьёв', scheduleDay: 2, scheduleTime: '07:30', currentTrainingType: 'Кроссфит' },
    { ...base, id: rid('cl', 3), firstName: 'Борис', lastName: 'Гаврилов', currentTrainingType: 'Реабилитация' },
    { ...base, id: rid('cl', 4), firstName: 'Вера', lastName: 'Лосева', scheduleDay: 3, scheduleTime: '19:30', currentTrainingType: 'Похудение' },
    { ...base, id: rid('cl', 5), firstName: 'Даниил', lastName: 'Орешкин', scheduleDay: 4, scheduleTime: '08:00', currentTrainingType: 'Гипертрофия' },
    { ...base, id: rid('cl', 6), firstName: 'Елена', lastName: 'Морозова', scheduleDay: 1, scheduleTime: '10:00', currentTrainingType: 'Йога' },
    { ...base, id: rid('cl', 7), firstName: 'Игорь', lastName: 'Тарасов', scheduleDay: 5, scheduleTime: '11:00', currentTrainingType: 'Силовая' },
    { ...base, id: rid('cl', 8), firstName: 'Ксения', lastName: 'Белова', currentTrainingType: 'Подготовка к старту' },
    { ...base, id: rid('cl', 9), firstName: 'Михаил', lastName: 'Дроздов', scheduleDay: 0, scheduleTime: '20:00', currentTrainingType: 'Функционал' },
    { ...base, id: rid('cl', 10), firstName: 'Наталья', lastName: 'Зайцева', currentTrainingType: 'Растяжка' },
  ];
}

type RawEx = {
  n: number;
  name: string;
  short: string | null;
  desc: string | null;
  cat: string;
  muscles: string[];
  reps: number | null;
  weight: number | null;
  time: number | null;
  rest: number;
  note: string | null;
};

const RAW_EXERCISES: RawEx[] = [
  { n: 1, name: 'Жим ногами под углом 45°', short: 'Базовое упражнение для квадрицепса и ягодиц на тренажёре под углом.', desc: 'Ноги на ширине плеч, носки слегка развёрнуты. Опускание до 90° в коленях, без отрыва поясницы от спинки. Темп 2-0-1, без замка в верхней точке.', cat: 'Ноги', muscles: ['Квадрицепс', 'Ягодицы'], reps: 10, weight: 80, time: null, rest: 90, note: 'Ноги на ширине плеч, носки чуть наружу. Пауза 1 сек в нижней точке, мощный выжим вверх.' },
  { n: 2, name: 'Румынская тяга', short: 'Базовое упражнение для бицепса бедра и ягодиц.', desc: 'Штанга у бёдер, спина прямая. Наклон со сгибанием в тазобедренном суставе.', cat: 'Ноги', muscles: ['Бицепс бедра', 'Ягодицы'], reps: 12, weight: 60, time: null, rest: 120, note: null },
  { n: 3, name: 'Разгибания ног в тренажёре', short: 'Изоляция квадрицепса.', desc: null, cat: 'Ноги', muscles: ['Квадрицепс'], reps: 15, weight: 35, time: null, rest: 90, note: null },
  { n: 4, name: 'Подъёмы на носки сидя', short: 'Изоляция икроножных мышц.', desc: null, cat: 'Ноги', muscles: ['Икры'], reps: 20, weight: 40, time: null, rest: 60, note: null },
  { n: 5, name: 'Жим штанги лёжа', short: 'Базовое упражнение для груди.', desc: null, cat: 'Грудь', muscles: ['Грудные', 'Трицепс', 'Передняя дельта'], reps: 6, weight: 70, time: null, rest: 120, note: null },
  { n: 6, name: 'Тяга штанги в наклоне', short: 'База на среднюю часть спины.', desc: null, cat: 'Спина', muscles: ['Средняя часть спины', 'Широчайшие'], reps: 8, weight: 60, time: null, rest: 120, note: null },
  { n: 7, name: 'Жим гантелей сидя', short: 'Жим над головой для дельт.', desc: null, cat: 'Плечи', muscles: ['Дельты'], reps: 10, weight: 22, time: null, rest: 90, note: null },
  { n: 8, name: 'Подтягивания', short: 'Базовое упражнение собственным весом.', desc: null, cat: 'Спина', muscles: ['Широчайшие', 'Бицепс'], reps: 8, weight: 0, time: null, rest: 120, note: null },
  { n: 9, name: 'Тяга к лицу', short: 'Изоляция задней дельты и трапеций.', desc: null, cat: 'Плечи', muscles: ['Задняя дельта', 'Трапеции'], reps: 12, weight: 20, time: null, rest: 60, note: null },
  { n: 10, name: 'Молотки на бицепс', short: 'Гантели нейтральным хватом.', desc: null, cat: 'Руки', muscles: ['Бицепс', 'Брахиалис'], reps: 12, weight: 14, time: null, rest: 60, note: null },
  { n: 11, name: 'Тяга верхнего блока', short: 'Тяга к груди широким хватом.', desc: null, cat: 'Спина', muscles: ['Широчайшие'], reps: 10, weight: 50, time: null, rest: 90, note: null },
  { n: 12, name: 'Тяга горизонтального блока', short: 'Тяга сидя на блоке.', desc: null, cat: 'Спина', muscles: ['Средняя часть спины'], reps: 10, weight: 55, time: null, rest: 90, note: null },
  { n: 13, name: 'Подтягивания нейтральным хватом', short: 'Параллельный хват, акцент на широчайшие.', desc: null, cat: 'Спина', muscles: ['Широчайшие', 'Бицепс'], reps: 8, weight: 0, time: null, rest: 120, note: null },
  { n: 14, name: 'Шраги с гантелями', short: 'Изоляция трапеций.', desc: null, cat: 'Плечи', muscles: ['Трапеции'], reps: 12, weight: 24, time: null, rest: 60, note: null },
  { n: 15, name: 'Планка', short: 'Изометрия на корпус.', desc: null, cat: 'Корпус', muscles: ['Прямая мышца живота', 'Поперечная'], reps: null, weight: null, time: 45, rest: 60, note: null },
  { n: 16, name: 'Отжимания на брусьях', short: 'Базовое для трицепса и низа груди.', desc: null, cat: 'Грудь', muscles: ['Трицепс', 'Грудные'], reps: 10, weight: 0, time: null, rest: 90, note: null },
  { n: 17, name: 'Жим гантелей лёжа на наклонной', short: 'Акцент на верх груди.', desc: null, cat: 'Грудь', muscles: ['Грудные'], reps: 10, weight: 22, time: null, rest: 90, note: null },
  { n: 18, name: 'Махи гантелями в стороны', short: 'Изоляция средней дельты.', desc: null, cat: 'Плечи', muscles: ['Средняя дельта'], reps: 15, weight: 6, time: null, rest: 60, note: null },
  { n: 19, name: 'Разгибания на блоке', short: 'Изоляция трицепса.', desc: null, cat: 'Руки', muscles: ['Трицепс'], reps: 12, weight: 25, time: null, rest: 60, note: null },
  { n: 20, name: 'Растяжка квадрицепса', short: 'Стоя, нога к ягодице.', desc: null, cat: 'Кардио', muscles: ['Квадрицепс'], reps: null, weight: null, time: 30, rest: 0, note: null },
];

function seedExercises(): DemoExercise[] {
  return RAW_EXERCISES.map((e) => ({
    id: rid('ex', e.n),
    name: e.name,
    shortDescription: e.short,
    description: e.desc,
    category: e.cat,
    targetMuscles: e.muscles,
    defaultReps: e.reps,
    defaultWeightKg: e.weight,
    defaultTimeSec: e.time,
    restSec: e.rest,
    note: e.note,
  }));
}

type RawTpl = {
  n: number;
  name: string;
  short: string | null;
  desc: string | null;
  group: string;
  tag: string;
  exercises: Array<{ ex: number; sets: number; reps: number | null; weight: number | null; time: number | null; rest: number }>;
};

const RAW_TEMPLATES: RawTpl[] = [
  {
    n: 1, name: 'Верх · Сила',
    short: 'Силовая на верх — грудь, спина, плечи. 3 упражнения, ~55 мин.',
    desc: 'Разминка 5–7 мин: суставная + лёгкая активация. Основная — базовые жимы и тяги, 4×6–8 на 75–80% от 1ПМ. Финиш — короткий блок на стабилизаторы.',
    group: 'Грудь', tag: 'Сила',
    exercises: [
      { ex: 5, sets: 4, reps: 6, weight: 70, time: null, rest: 120 },
      { ex: 6, sets: 4, reps: 8, weight: 60, time: null, rest: 120 },
      { ex: 7, sets: 3, reps: 10, weight: 22, time: null, rest: 90 },
    ],
  },
  {
    n: 2, name: 'Низ · Гипертрофия',
    short: 'Объёмная работа на ноги и ягодицы. 4 упражнения, ~55 мин.',
    desc: 'Разминка 7 мин. Основная: жим ногами 3×10, румынская 3×12, разгибания 3×15, икры 3×20.',
    group: 'Ноги', tag: 'Гипертрофия',
    exercises: [
      { ex: 1, sets: 3, reps: 10, weight: 80, time: null, rest: 120 },
      { ex: 2, sets: 3, reps: 12, weight: 60, time: null, rest: 120 },
      { ex: 3, sets: 3, reps: 15, weight: 35, time: null, rest: 90 },
      { ex: 4, sets: 3, reps: 20, weight: 40, time: null, rest: 60 },
    ],
  },
  {
    n: 3, name: 'Push',
    short: 'Жимовые движения — грудь, плечи, трицепс.',
    desc: null, group: 'Грудь', tag: 'Push',
    exercises: [
      { ex: 5, sets: 4, reps: 8, weight: 65, time: null, rest: 120 },
      { ex: 17, sets: 3, reps: 10, weight: 20, time: null, rest: 90 },
      { ex: 18, sets: 3, reps: 15, weight: 6, time: null, rest: 60 },
      { ex: 19, sets: 3, reps: 12, weight: 25, time: null, rest: 60 },
    ],
  },
  {
    n: 4, name: 'Pull',
    short: 'Тяговые движения — спина и бицепс.',
    desc: null, group: 'Спина', tag: 'Pull',
    exercises: [
      { ex: 8, sets: 4, reps: 8, weight: 0, time: null, rest: 120 },
      { ex: 6, sets: 4, reps: 8, weight: 60, time: null, rest: 120 },
      { ex: 11, sets: 3, reps: 10, weight: 50, time: null, rest: 90 },
      { ex: 10, sets: 3, reps: 12, weight: 14, time: null, rest: 60 },
    ],
  },
  {
    n: 5, name: 'Восстановительная',
    short: 'Мобильность, дыхание и работа кора.',
    desc: null, group: 'Корпус', tag: 'Восстановительная',
    exercises: [
      { ex: 15, sets: 3, reps: null, weight: null, time: 45, rest: 60 },
      { ex: 20, sets: 2, reps: null, weight: null, time: 30, rest: 30 },
    ],
  },
];

function seedTemplates(exercises: DemoExercise[]): DemoTemplate[] {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  return RAW_TEMPLATES.map((t) => ({
    id: rid('tpl', t.n),
    name: t.name,
    shortDescription: t.short,
    description: t.desc,
    muscleGroup: t.group,
    categoryTag: t.tag,
    exercises: t.exercises.map((te, idx) => {
      const ex = byId.get(rid('ex', te.ex));
      return {
        exerciseId: rid('ex', te.ex),
        exerciseName: ex?.name ?? '—',
        exerciseCategory: ex?.category ?? '',
        position: idx,
        sets: te.sets,
        reps: te.reps,
        weightKg: te.weight,
        timeSec: te.time,
        restSec: te.rest,
      };
    }),
  }));
}

const RAW_SESSIONS = [
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

function seedSessions(): DemoSession[] {
  const today = new Date().toISOString().slice(0, 10);
  return RAW_SESSIONS.map((s, i) => ({
    id: rid('ses', i + 1),
    clientId: rid('cl', s.client),
    workoutId: null,
    date: s.date,
    startTime: s.time,
    durationMin: s.dur,
    location: s.loc,
    title: s.title,
    status: s.date < today ? 'completed' : 'planned',
    approval: 'none',
    note: null,
    createdAt: SEED_TS,
  }));
}

function genShareCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = '';
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function seedTrainer(): Trainer {
  return {
    id: 'trainer',
    firstName: 'Алексей',
    lastName: 'Морозов',
    title: 'Персональный тренер',
    specialties: 'Силовая · Реабилитация',
    hashtags: '#силовая #реабилитация #офп #утро',
    bio: 'Работаю с любителями и спортсменами-разрядниками. Силовая, постреабилитация после травм спины и колена. КМС по пауэрлифтингу.',
    phone: '+7 (905) 271-44-09',
    email: 'moroz.coach@mail.ru',
    telegram: '@moroz_coach',
    instagram: '@alexey.moroz.gym',
    shareCode: genShareCode(),
  };
}

export function buildSeed(): DemoStore {
  const exercises = seedExercises();
  return {
    clients: seedClients(),
    exercises,
    templates: seedTemplates(exercises),
    workouts: [],
    sessions: seedSessions(),
    trainer: seedTrainer(),
  };
}
