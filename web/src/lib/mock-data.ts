// Демо-данные для GitHub Pages билда (без бэкенда).
// Включается через import.meta.env.VITE_USE_MOCKS === '1'.
import type {
  Client,
  ClientBalance,
  Exercise,
  Session,
  Trainer,
  WorkoutTemplate,
  Gym,
  AccountingSummary,
  IncomeItem,
  PaymentPackage,
} from '../api/types';

const today = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();

const inDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const mockTrainer: Trainer = {
  id: 'trainer-1',
  firstName: 'Алексей',
  lastName: 'Морозов',
  title: 'Персональный тренер',
  specialties: 'Силовой тренинг, реабилитация, набор массы',
  hashtags: '#сила #реабилитация #гипертрофия',
  bio: 'Тренирую с 2016 года. Специализация — программы для взрослых, подготовка к соревнованиям, восстановление после травм.',
  phone: '+7 (916) 123-45-67',
  email: 'alex.morozov@trener.app',
  telegram: '@alex_morozov',
  instagram: '@alex.coach',
  shareCode: 'AM-2026',
};

const firstNames = ['Алина', 'Михаил', 'Екатерина', 'Дмитрий', 'Анна', 'Сергей', 'Ольга', 'Иван', 'Мария', 'Артём',
  'Юлия', 'Павел', 'Наталья', 'Кирилл', 'Светлана', 'Андрей', 'Полина', 'Виктор', 'Ксения', 'Роман',
  'Дарья', 'Алексей', 'Татьяна', 'Николай', 'Елена', 'Владимир', 'Ирина', 'Денис', 'Ангелина', 'Антон',
  'Валерия', 'Степан', 'Маргарита', 'Игорь', 'Софья', 'Глеб', 'Алиса', 'Семён', 'Зоя', 'Тимофей',
  'Лидия', 'Григорий', 'Жанна', 'Евгений', 'Карина', 'Леонид', 'Вероника', 'Олег'];
const lastNames = ['Кузнецова', 'Соколов', 'Петрова', 'Иванов', 'Смирнова', 'Морозов', 'Волкова', 'Лебедев',
  'Новикова', 'Орлов', 'Соколова', 'Иванова', 'Васильев', 'Михайлова', 'Фёдоров', 'Андреева', 'Романов',
  'Захарова', 'Алексеев', 'Никитина', 'Степанов', 'Зайцева', 'Шевелёв', 'Беляева', 'Тарасов', 'Гордеева',
  'Жуков', 'Поляков', 'Карпова', 'Богданов', 'Семёнова', 'Антонов', 'Гусева', 'Крылов', 'Маркова',
  'Сергеев', 'Васильева', 'Дмитриев', 'Тихонова', 'Сидоров', 'Афанасьева', 'Голубев', 'Воронова',
  'Куликов', 'Алексеева', 'Ильин', 'Соловьёва', 'Григорьев'];
const tags = ['#сила', '#гипертрофия', '#похудение', '#реабилитация', '#осанка', '#подвижность',
  '#жим', '#становая', '#приседания', '#кор', '#эндуранс'];

export const mockClients: Client[] = Array.from({ length: 48 }, (_, i) => {
  const f = firstNames[i % firstNames.length];
  const l = lastNames[i % lastNames.length];
  const yearBorn = 1985 + (i % 25);
  return {
    id: `c${i + 1}`,
    firstName: f,
    lastName: l,
    birthDate: `${yearBorn}-${String(((i * 7) % 12) + 1).padStart(2, '0')}-${String(((i * 11) % 27) + 1).padStart(2, '0')}`,
    heightCm: 160 + ((i * 3) % 30),
    weightKg: 55 + ((i * 5) % 45),
    phone: `+7 (9${(10 + i) % 100}) ${String(100 + i).slice(-3)}-${String(10 + i).slice(-2)}-${String(20 + i).slice(-2)}`,
    telegram: i % 2 === 0 ? `@${f.toLowerCase()}_${l.toLowerCase().slice(0, 3)}` : null,
    whatsapp: i % 3 === 0 ? `+7 (9${(10 + i) % 100}) ${String(100 + i).slice(-3)}-${String(10 + i).slice(-2)}-${String(20 + i).slice(-2)}` : null,
    instagram: i % 4 === 0 ? `@${f.toLowerCase()}.fitness` : null,
    max: i % 5 === 0 ? `${f.toLowerCase()}.${l.toLowerCase()}` : null,
    hashtags: [tags[i % tags.length], tags[(i + 3) % tags.length], tags[(i + 7) % tags.length]].join(' '),
    notes: i % 3 === 0 ? 'Тренируется 2 раза в неделю, цели: силовая.' : null,
    medicalNotes: i % 7 === 0 ? 'Береги колени, левое колено после операции 2024.' : null,
    restingPulse: 60 + (i % 20),
    scheduleDay: i % 7,
    scheduleTime: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'][i % 7],
    currentTrainingType: ['Сила', 'Низ', 'Верх', 'Кардио', 'Кор'][i % 5],
    accountId: null,
    createdAt: inDays(-((i % 60) + 1)) + 'T10:00:00Z',
  };
});

const categories = ['Грудь', 'Спина', 'Ноги', 'Плечи', 'Руки', 'Кор', 'Кардио'];
const muscleGroups: Record<string, string[]> = {
  Грудь: ['Большая грудная', 'Малая грудная', 'Трицепс'],
  Спина: ['Широчайшие', 'Трапеция', 'Бицепс'],
  Ноги: ['Квадрицепс', 'Бицепс бедра', 'Ягодицы'],
  Плечи: ['Дельты передние', 'Дельты средние', 'Дельты задние'],
  Руки: ['Бицепс', 'Трицепс', 'Предплечья'],
  Кор: ['Прямая мышца живота', 'Косые мышцы'],
  Кардио: ['Сердце'],
};
const exerciseNames: Record<string, string[]> = {
  Грудь: ['Жим штанги лёжа', 'Жим гантелей лёжа', 'Жим на наклонной', 'Разводка гантелей', 'Отжимания на брусьях', 'Жим в Хаммере', 'Кроссовер', 'Пуловер', 'Отжимания', 'Сведение в тренажёре', 'Жим узким хватом', 'Гильотина'],
  Спина: ['Подтягивания', 'Тяга штанги в наклоне', 'Становая тяга', 'Тяга верхнего блока', 'Тяга нижнего блока', 'Тяга в Хаммере', 'Шраги', 'Гиперэкстензия', 'Тяга гантели в наклоне', 'Прямая тяга', 'Австралийские подтягивания', 'T-bar тяга'],
  Ноги: ['Приседания со штангой', 'Жим ногами', 'Выпады', 'Сгибания ног лёжа', 'Разгибания ног', 'Болгарские выпады', 'Гакк-приседания', 'Ягодичный мост', 'Икры стоя', 'Икры сидя', 'Зашагивания на тумбу', 'Сумо приседания'],
  Плечи: ['Жим штанги стоя', 'Жим гантелей сидя', 'Махи в стороны', 'Махи перед собой', 'Махи в наклоне', 'Тяга к подбородку', 'Шраги со штангой', 'Жим Арнольда', 'Кубинский жим'],
  Руки: ['Подъём штанги на бицепс', 'Молотки', 'Французский жим', 'Жим узким хватом', 'Подъём на скамье Скотта', 'Разгибания на блоке', 'Концентрированный подъём', 'Отжимания на трицепс', 'Кистевые сгибания'],
  Кор: ['Скручивания', 'Планка', 'Велосипед', 'Подъём ног лёжа', 'Боковая планка', 'Русский поворот', 'Ролик для пресса', 'Подъём ног в висе'],
  Кардио: ['Бег на дорожке', 'Велотренажёр', 'Эллипс', 'Гребной тренажёр'],
};

const equipmentByCategory: Record<string, string[]> = {
  'Грудь': ['Штанга', 'Гантели', 'Тренажёр блочный', 'Собственный вес'],
  'Спина': ['Штанга', 'Гантели', 'Тренажёр блочный', 'Собственный вес'],
  'Ноги': ['Штанга', 'Тренажёр свободного веса', 'Тренажёр блочный', 'Собственный вес'],
  'Плечи': ['Штанга', 'Гантели', 'Тренажёр блочный'],
  'Руки': ['Штанга', 'Гантели', 'Тренажёр блочный'],
  'Кор': ['Собственный вес', 'Коврик', 'Тренажёр блочный'],
  'Кардио': ['Кардио-машина'],
  'Растяжка': ['Коврик', 'Резина', 'TRX'],
  'Йога': ['Коврик'],
};

const mockExercisesList: Exercise[] = [];
let exerciseId = 1;
for (const cat of categories) {
  const names = exerciseNames[cat] || [];
  for (const [idx, name] of names.entries()) {
    const eq = (equipmentByCategory[cat] ?? ['Собственный вес'])[idx % (equipmentByCategory[cat]?.length ?? 1)];
    mockExercisesList.push({
      id: `ex${exerciseId++}`,
      name,
      shortDescription: `${cat.toLowerCase()} · ${eq.toLowerCase()}`,
      description: `${name}. Контролируй технику: спина прямая, движение плавное.`,
      category: cat,
      targetMuscles: muscleGroups[cat] ?? [],
      equipment: eq,
      defaultReps: cat === 'Кардио' ? null : 10,
      defaultWeightKg: cat === 'Кор' || cat === 'Кардио' ? null : 60,
      defaultTimeSec: cat === 'Кардио' ? 600 : null,
      note: null,
    });
  }
}

// Добавим несколько растяжек / йоги.
const flexNames = ['Складка стоя', 'Кошка-корова', 'Растяжка плеч на лямках', 'Поза ребёнка', 'Голубь', 'Скрутка лёжа'];
const yogaNames = ['Приветствие солнцу A', 'Поза воина II', 'Поза дерева', 'Поза собаки мордой вниз', 'Поза трупа', 'Поза лотоса'];
for (const name of flexNames) {
  mockExercisesList.push({
    id: `ex${exerciseId++}`,
    name,
    shortDescription: 'растяжка · коврик',
    description: `${name}. Удерживай каждую позицию 30–60 сек, дыхание ровное.`,
    category: 'Растяжка',
    targetMuscles: ['Бицепс бедра', 'Грудные', 'Широчайшие'],
    equipment: 'Коврик',
    defaultReps: null,
    defaultWeightKg: null,
    defaultTimeSec: 45,
    note: null,
  });
}
for (const name of yogaNames) {
  mockExercisesList.push({
    id: `ex${exerciseId++}`,
    name,
    shortDescription: 'йога · коврик',
    description: `${name}. Сохраняй медленное дыхание, не форсируй амплитуду.`,
    category: 'Йога',
    targetMuscles: ['Корпус', 'Бицепс бедра', 'Грудные'],
    equipment: 'Коврик',
    defaultReps: null,
    defaultWeightKg: null,
    defaultTimeSec: 60,
    note: null,
  });
}

export const mockExercises: Exercise[] = mockExercisesList;

export const mockWorkoutTemplates: WorkoutTemplate[] = [
  {
    id: 'tpl-1',
    name: 'Верх · Сила',
    shortDescription: 'Силовая на верх — грудь, спина, плечи. 3 упражнения, ~55 мин.',
    description: null,
    muscleGroup: 'Верх тела',
    categoryTag: 'Сила',
    exercises: [],
  },
  {
    id: 'tpl-2',
    name: 'Верх силовая женская',
    shortDescription: 'Для новичков с недостаточным весом и дистрофией мышц',
    description: null,
    muscleGroup: 'Верх тела',
    categoryTag: 'Сила',
    exercises: [],
  },
  {
    id: 'tpl-3',
    name: 'Низ · Гипертрофия',
    shortDescription: 'Объёмная на ноги — приседы, выпады, изоляция.',
    description: null,
    muscleGroup: 'Низ тела',
    categoryTag: 'Гипертрофия',
    exercises: [],
  },
  {
    id: 'tpl-4',
    name: 'Full Body Express',
    shortDescription: '40 минут, всё тело — для занятых клиентов',
    description: null,
    muscleGroup: 'Всё тело',
    categoryTag: 'Поддержка',
    exercises: [],
  },
  {
    id: 'tpl-5',
    name: 'Кор + кардио',
    shortDescription: 'Корпус и аэробка — для жиросжигания',
    description: null,
    muscleGroup: 'Кор',
    categoryTag: 'Кардио',
    exercises: [],
  },
  {
    id: 'tpl-6',
    name: 'Реабилитация колено',
    shortDescription: 'После операции на колене — мягкое восстановление',
    description: null,
    muscleGroup: 'Низ тела',
    categoryTag: 'Реабилитация',
    exercises: [],
  },
];

// Сессии: разбросаны по неделе, 6 сегодня + ещё на 7 дней.
const trainingTypes = ['Сила', 'Низ', 'Верх', 'Кардио', 'Кор', 'Гипертрофия'];
const locations = ['Зал 1', 'Зал 2', 'Outdoor'];

function makeSession(i: number, clientIdx: number, dayOffset: number, hour: number, minute: number): Session {
  const date = inDays(dayOffset);
  const client = mockClients[clientIdx % mockClients.length];
  const startTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  return {
    id: `s${i}`,
    clientId: client.id,
    clientFirstName: client.firstName,
    clientLastName: client.lastName,
    workoutId: null,
    date,
    startTime,
    durationMin: 60,
    location: locations[i % locations.length],
    title: trainingTypes[i % trainingTypes.length],
    status: dayOffset < 0 ? 'completed' : 'planned',
    approval: 'approved',
    deliveredAt: dayOffset >= 0 ? new Date().toISOString() : null,
    note: null,
    createdAt: new Date().toISOString(),
  };
}

const sessionsRaw: Session[] = [];
let sessionId = 1;
// 6 сегодняшних — раскидать по часам с 9 до 20, разные клиенты.
const todayHours = [9, 11, 13, 15, 18, 20];
for (let i = 0; i < todayHours.length; i++) {
  sessionsRaw.push(makeSession(sessionId++, i * 3, 0, todayHours[i], 0));
}
// 34 на ближайшие 7 дней
for (let d = 1; d <= 7; d++) {
  const perDay = d === 1 ? 7 : d === 2 ? 5 : 4;
  for (let h = 0; h < perDay; h++) {
    sessionsRaw.push(makeSession(sessionId++, (d * 5 + h) % mockClients.length, d, 8 + h * 2, 0));
  }
}
// Несколько прошедших (для статистики)
for (let d = 1; d <= 5; d++) {
  sessionsRaw.push(makeSession(sessionId++, d, -d, 10, 0));
  sessionsRaw.push(makeSession(sessionId++, d + 10, -d, 16, 0));
}

export const mockSessions: Session[] = sessionsRaw;

// Подгоняем «следующее» — ближайшую сегодняшнюю на ≈18:00, чтобы выглядело как в макете.
const nextHour = new Date().getHours() < 18 ? 18 : Math.min(new Date().getHours() + 2, 23);
const nextSessionMock = makeSession(999, 0, 0, nextHour, 0);
nextSessionMock.title = 'Сила';
// Заменяем подходящий слот, если есть.
const existingIdx = mockSessions.findIndex((s) => s.date === today && s.startTime === `${String(nextHour).padStart(2, '0')}:00`);
if (existingIdx >= 0) mockSessions[existingIdx] = nextSessionMock;
else mockSessions.push(nextSessionMock);

// Списки диалогов
import type { ConversationListItem } from '../api/chat';
export const mockConversations: ConversationListItem[] = mockClients.slice(0, 12).map((c, i) => ({
  id: `conv-${i + 1}`,
  clientId: c.id,
  clientFirstName: c.firstName,
  clientLastName: c.lastName,
  lastBody: i === 0 ? 'Перенесём завтра на 19:00?' : i === 1 ? 'Спасибо, было супер!' : i === 2 ? 'А во вторник во сколько?' : 'Окей',
  lastAt: new Date(Date.now() - i * 3600_000).toISOString(),
  lastSenderRole: i % 2 === 0 ? 'client' : 'trainer',
  unread: i < 3 ? 1 : 0,
}));

export const mockGyms: Gym[] = [
  { id: 'g1', name: 'World Class · Тверская', monthlyRent: 35000, note: 'Основной зал' },
  { id: 'g2', name: 'X-Fit · Кутузовский', monthlyRent: 28000, note: null },
  { id: 'g3', name: 'Outdoor · Парк Горького', monthlyRent: null, note: 'Лето' },
];

export const mockAccountingSummary: AccountingSummary = {
  month: today.slice(0, 7),
  income: 348000,
  expenses: 78500,
  profit: 269500,
  topClients: [
    { clientId: mockClients[0].id, clientName: `${mockClients[0].firstName} ${mockClients[0].lastName}`, total: 48000 },
    { clientId: mockClients[1].id, clientName: `${mockClients[1].firstName} ${mockClients[1].lastName}`, total: 36000 },
    { clientId: mockClients[2].id, clientName: `${mockClients[2].firstName} ${mockClients[2].lastName}`, total: 32000 },
  ],
};

export const mockIncomes: IncomeItem[] = mockClients.slice(0, 8).map((c, i) => ({
  id: `inc-${i + 1}`,
  clientId: c.id,
  clientName: `${c.firstName} ${c.lastName}`,
  lessonsPaid: 8 + (i % 6),
  totalPaid: (8 + (i % 6)) * 3000,
  createdAt: inDays(-((i % 20) + 1)) + 'T10:00:00Z',
  status: 'active',
}));

export function mockBalance(clientId: string): ClientBalance {
  const idx = mockClients.findIndex((c) => c.id === clientId);
  const base = idx >= 0 ? idx : 0;
  const paid = 8 + (base % 8);
  const completed = Math.floor(paid * 0.6);
  const upcoming = paid - completed;
  return {
    paid,
    scheduled: paid,
    completed,
    approvedTotal: paid,
    unapproved: 0,
    needsSending: 0,
    upcomingPlanned: upcoming,
    remaining: paid - completed,
  };
}

export function mockPackagesFor(clientId: string): PaymentPackage[] {
  return [
    {
      id: `pkg-${clientId}-1`,
      clientId,
      lessonsPaid: 12,
      pricePerLesson: 3000,
      totalPaid: 36000,
      workoutType: 'Сила',
      startsAt: inDays(-7),
      status: 'active',
      note: null,
      createdAt: inDays(-7) + 'T10:00:00Z',
    },
  ];
}
