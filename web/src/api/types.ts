export type Client = {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  heightCm: number | null;
  weightKg: number | null;
  phone: string | null;
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
  note?: string | null;
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
  scheduled: number;
  completedApproved: number;
  unapproved: number;
  remaining: number;
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
