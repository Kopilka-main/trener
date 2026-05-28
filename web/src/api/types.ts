export type Client = {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  heightCm: number | null;
  weightKg: number | null;
  phone: string | null;
  telegram: string | null;
  whatsapp: string | null;
  instagram: string | null;
  max: string | null;
  hashtags: string | null;
  notes: string | null;
  medicalNotes: string | null;
  restingPulse: number | null;
  scheduleDay: number | null;
  scheduleTime: string | null;
  currentTrainingType: string | null;
  accountId: string | null;
  createdAt: string;
};

export type ClientInput = Omit<Client, 'id' | 'createdAt'>;

export type Exercise = {
  id: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  category: string;
  targetMuscles: string[];
  equipment: string | null;
  defaultReps: number | null;
  defaultWeightKg: number | null;
  defaultTimeSec: number | null;
  note: string | null;
};

export type ExerciseInput = Omit<Exercise, 'id'>;

export type TemplateExercise = {
  exerciseId: string;
  exerciseName: string;
  exerciseCategory: string;
  position: number;
  sets: number;
  reps: number | null;
  weightKg: number | null;
  timeSec: number | null;
};

export type WorkoutTemplate = {
  id: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  muscleGroup: string | null;
  categoryTag: string | null;
  exercises: TemplateExercise[];
};

export type WorkoutTemplateInput = {
  name: string;
  shortDescription: string | null;
  description: string | null;
  muscleGroup: string | null;
  categoryTag: string | null;
  exercises: Array<{
    exerciseId: string;
    sets: number;
    reps: number | null;
    weightKg: number | null;
    timeSec: number | null;
  }>;
};

export type WorkoutStatus = 'draft' | 'active' | 'completed' | 'skipped';

export type WorkoutSet = {
  setIndex: number;
  plannedReps: number | null;
  plannedWeightKg: number | null;
  plannedTimeSec: number | null;
  actualReps: number | null;
  actualWeightKg: number | null;
  actualTimeSec: number | null;
  done: boolean;
};

export type WorkoutExerciseDetail = {
  position: number;
  exerciseId: string;
  exerciseName: string;
  exerciseCategory: string;
  sets: WorkoutSet[];
};

export type ClientWorkoutSummary = {
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
};

export type ClientWorkout = ClientWorkoutSummary & {
  exercises: WorkoutExerciseDetail[];
};

export type ClientWorkoutsResponse = {
  current: ClientWorkout | null;
  history: ClientWorkoutSummary[];
};

export type SessionStatus = 'planned' | 'completed' | 'cancelled';
export type SessionApproval = 'none' | 'pending' | 'approved';

export type Session = {
  id: string;
  clientId: string;
  clientFirstName: string;
  clientLastName: string;
  workoutId: string | null;
  date: string;        // YYYY-MM-DD
  startTime: string;   // HH:MM
  durationMin: number;
  location: string | null;
  title: string | null;
  status: SessionStatus;
  approval: SessionApproval;
  deliveredAt: string | null;   // ✓✓ серые: клиент получил уведомление
  note: string | null;
  createdAt: string;
};

export type SessionInput = {
  clientId: string;
  workoutId?: string | null;
  date: string;
  startTime: string;
  durationMin: number;
  location?: string | null;
  title?: string | null;
  status?: SessionStatus;
  approval?: SessionApproval;
  deliveredAt?: string | null;          // undefined — не трогать; null — сброс; ISO — установить
  note?: string | null;
};

export type Gym = {
  id: string;
  name: string;
  monthlyRent: number | null;
  note: string | null;
};

export type GymInput = {
  name: string;
  monthlyRent?: number | null;
  note?: string | null;
};

export type Expense = {
  id: string;
  category: string;
  amount: number;
  date: string;
  gymId: string | null;
  note: string | null;
  createdAt: string;
};

export type ExpenseInput = {
  category: string;
  amount: number;
  date: string;
  gymId?: string | null;
  note?: string | null;
};

export type IncomeItem = {
  id: string;
  clientId: string;
  clientName: string;
  lessonsPaid: number;
  totalPaid: number;
  createdAt: string;
  status: string;
};

export type AccountingSummary = {
  month: string;
  range?: 'month' | 'quarter' | 'year';
  from?: string;
  to?: string;
  income: number;
  expenses: number;
  profit: number;
  topClients: Array<{ clientId: string; clientName: string; total: number }>;
};

export type PaymentPackageStatus = 'active' | 'closed' | 'cancelled';

export type PaymentPackage = {
  id: string;
  clientId: string;
  lessonsPaid: number;
  pricePerLesson: number;
  totalPaid: number;
  workoutType: string | null;
  startsAt: string;          // YYYY-MM-DD
  status: PaymentPackageStatus;
  note: string | null;
  createdAt: string;
};

export type PaymentPackageInput = {
  lessonsPaid: number;
  pricePerLesson: number;
  totalPaid?: number;
  workoutType?: string | null;
  startsAt: string;
  status?: PaymentPackageStatus;
  note?: string | null;
};

export type ClientBalance = {
  paid: number;
  scheduled: number;             // всего назначено в календаре (planned + completed)
  completed: number;             // тренер отметил status='completed' — факт проведения
  approvedTotal: number;         // всего согласовано клиентом (planned + completed)
  unapproved: number;            // запланированы и НЕ согласованы (любые: none + pending)
  needsSending: number;          // ещё не отправлены клиенту вовсе (approval='none')
  upcomingPlanned: number;       // только будущие запланированные (date ≥ сегодня)
  remaining: number;             // paid − completed
};

export type Trainer = {
  id: string;
  firstName: string;
  lastName: string;
  title: string | null;
  specialties: string | null;
  hashtags: string | null;
  bio: string | null;
  phone: string | null;
  email: string | null;
  telegram: string | null;
  instagram: string | null;
  shareCode: string | null;
};

export type TrainerInput = Omit<Trainer, 'id' | 'shareCode'>;
