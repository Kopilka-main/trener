// Демо-бэкенд: повторяет REST API сервера, но хранит всё в localStorage.
// Позволяет публиковать приложение как чистую статику (GitHub Pages).
import {
  buildSeed,
  type DemoStore,
  type DemoWorkout,
  type DemoWorkoutExercise,
  type DemoExercise,
  type DemoTemplate,
  type DemoTemplateExercise,
  type DemoSession,
} from './demo-seed';
import type { Client, Session, Trainer } from './types';

const STORAGE_KEY = 'trener_demo_db_v1';

function loadStore(): DemoStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as DemoStore;
  } catch {
    /* битые данные — пересоздаём из сида */
  }
  const seed = buildSeed();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  } catch {
    /* localStorage недоступен — работаем в памяти */
  }
  return seed;
}

let store: DemoStore = loadStore();

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* localStorage недоступен — работаем в памяти */
  }
}

/** Полный сброс демо-данных к стартовому состоянию. */
export function resetDemoData() {
  store = buildSeed();
  save();
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const nowISO = () => new Date().toISOString();
const uid = (prefix: string) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

type DemoError = { error: string; status: number; details?: unknown };
function fail(status: number, message: string, details?: unknown): never {
  const e: DemoError = { error: message, status };
  if (details !== undefined) e.details = details;
  throw e;
}

// ─── Клиенты ────────────────────────────────────────────────────────────────

function findClient(id: string): Client {
  const c = store.clients.find((x) => x.id === id);
  if (!c) fail(404, 'Client not found');
  return c;
}

function clientFromInput(body: Record<string, unknown>, id: string, createdAt: string): Client {
  const v = body as Partial<Client>;
  return {
    id,
    firstName: String(v.firstName ?? ''),
    lastName: String(v.lastName ?? ''),
    birthDate: v.birthDate ?? null,
    heightCm: v.heightCm ?? null,
    weightKg: v.weightKg ?? null,
    phone: v.phone ?? null,
    hashtags: v.hashtags ?? null,
    notes: v.notes ?? null,
    medicalNotes: v.medicalNotes ?? null,
    restingPulse: v.restingPulse ?? null,
    scheduleDay: v.scheduleDay ?? null,
    scheduleTime: v.scheduleTime ?? null,
    currentTrainingType: v.currentTrainingType ?? null,
    accountId: v.accountId ?? null,
    createdAt,
  };
}

function listClients(q: string): Client[] {
  const sorted = [...store.clients].sort(
    (a, b) => a.lastName.localeCompare(b.lastName, 'ru') || a.firstName.localeCompare(b.firstName, 'ru')
  );
  if (!q) return sorted;
  const needle = q.toLowerCase();
  return sorted.filter((c) =>
    `${c.firstName} ${c.lastName} ${c.hashtags ?? ''} ${c.currentTrainingType ?? ''}`.toLowerCase().includes(needle)
  );
}

// ─── Упражнения ─────────────────────────────────────────────────────────────

function findExercise(id: string): DemoExercise {
  const e = store.exercises.find((x) => x.id === id);
  if (!e) fail(404, 'Exercise not found');
  return e;
}

function exerciseFromInput(body: Record<string, unknown>, id: string): DemoExercise {
  const v = body as Partial<DemoExercise>;
  return {
    id,
    name: String(v.name ?? ''),
    shortDescription: v.shortDescription ?? null,
    description: v.description ?? null,
    category: String(v.category ?? ''),
    targetMuscles: Array.isArray(v.targetMuscles) ? v.targetMuscles : [],
    defaultReps: v.defaultReps ?? null,
    defaultWeightKg: v.defaultWeightKg ?? null,
    defaultTimeSec: v.defaultTimeSec ?? null,
    restSec: typeof v.restSec === 'number' ? v.restSec : 90,
    note: v.note ?? null,
  };
}

function listExercises(q: string, category: string): DemoExercise[] {
  let rows = [...store.exercises].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  if (category) rows = rows.filter((r) => r.category === category);
  if (q) {
    const needle = q.toLowerCase();
    rows = rows.filter((r) => `${r.name} ${r.category}`.toLowerCase().includes(needle));
  }
  return rows;
}

// ─── Шаблоны тренировок ─────────────────────────────────────────────────────

type TemplateExInput = {
  exerciseId: string;
  sets: number;
  reps: number | null;
  weightKg: number | null;
  timeSec: number | null;
  restSec: number;
};

function findTemplate(id: string): DemoTemplate {
  const t = store.templates.find((x) => x.id === id);
  if (!t) fail(404, 'Template not found');
  return t;
}

function templateFromInput(body: Record<string, unknown>, id: string): DemoTemplate {
  const v = body as Record<string, unknown>;
  const rawExercises = (Array.isArray(v.exercises) ? v.exercises : []) as TemplateExInput[];
  const exercises: DemoTemplateExercise[] = rawExercises.map((te, idx) => {
    const ex = store.exercises.find((e) => e.id === te.exerciseId);
    return {
      exerciseId: te.exerciseId,
      exerciseName: ex?.name ?? '—',
      exerciseCategory: ex?.category ?? '',
      position: idx,
      sets: te.sets,
      reps: te.reps ?? null,
      weightKg: te.weightKg ?? null,
      timeSec: te.timeSec ?? null,
      restSec: te.restSec,
    };
  });
  return {
    id,
    name: String(v.name ?? ''),
    shortDescription: (v.shortDescription as string | null) ?? null,
    description: (v.description as string | null) ?? null,
    muscleGroup: (v.muscleGroup as string | null) ?? null,
    categoryTag: (v.categoryTag as string | null) ?? null,
    exercises,
  };
}

function listTemplates(q: string): DemoTemplate[] {
  if (!q) return store.templates;
  const needle = q.toLowerCase();
  return store.templates.filter((t) =>
    `${t.name} ${t.categoryTag ?? ''} ${t.muscleGroup ?? ''}`.toLowerCase().includes(needle)
  );
}

// ─── Тренировки клиента ─────────────────────────────────────────────────────

function findWorkout(id: string): DemoWorkout {
  const w = store.workouts.find((x) => x.id === id);
  if (!w) fail(404, 'Workout not found');
  return w;
}

function workoutSummary(w: DemoWorkout) {
  const { exercises: _drop, ...summary } = w;
  void _drop;
  return summary;
}

function assertEditable(w: DemoWorkout) {
  if (w.status === 'completed' || w.status === 'skipped') fail(400, 'Workout is already finished');
}

// Каждый подход — отдельная запись упражнения (плоский список).
function flattenExercise(
  exerciseId: string,
  name: string,
  category: string,
  setsCount: number,
  plan: { reps: number | null; weightKg: number | null; timeSec: number | null; restSec: number },
  startPosition: number
): DemoWorkoutExercise[] {
  const out: DemoWorkoutExercise[] = [];
  for (let s = 0; s < setsCount; s++) {
    out.push({
      position: startPosition + s,
      exerciseId,
      exerciseName: name,
      exerciseCategory: category,
      sets: [
        {
          setIndex: 0,
          plannedReps: plan.reps,
          plannedWeightKg: plan.weightKg,
          plannedTimeSec: plan.timeSec,
          plannedRestSec: plan.restSec,
          actualReps: null,
          actualWeightKg: null,
          actualTimeSec: null,
          done: false,
        },
      ],
    });
  }
  return out;
}

function newWorkoutShell(clientId: string, sourceTemplateId: string | null, name: string, categoryTag: string | null): DemoWorkout {
  return {
    id: uid('w'),
    clientId,
    sourceTemplateId,
    name,
    categoryTag,
    status: 'draft',
    startedAt: null,
    completedAt: null,
    durationSec: null,
    trainerNote: null,
    rpe: null,
    createdAt: nowISO(),
    exercises: [],
  };
}

function assignFromTemplate(clientId: string, templateId: string, name?: string, categoryTag?: string | null): DemoWorkout {
  const tpl = findTemplate(templateId);
  if (tpl.exercises.length === 0) fail(400, 'Template has no exercises');
  const w = newWorkoutShell(clientId, templateId, name ?? tpl.name, categoryTag ?? tpl.categoryTag);
  let position = 0;
  for (const te of tpl.exercises) {
    const flat = flattenExercise(
      te.exerciseId,
      te.exerciseName,
      te.exerciseCategory,
      te.sets,
      { reps: te.reps, weightKg: te.weightKg, timeSec: te.timeSec, restSec: te.restSec },
      position
    );
    w.exercises.push(...flat);
    position += flat.length;
  }
  return w;
}

function assignFromExercises(clientId: string, name: string, categoryTag: string | null, exercises: TemplateExInput[]): DemoWorkout {
  const w = newWorkoutShell(clientId, null, name, categoryTag);
  let position = 0;
  for (const te of exercises) {
    const ex = store.exercises.find((e) => e.id === te.exerciseId);
    const flat = flattenExercise(
      te.exerciseId,
      ex?.name ?? '—',
      ex?.category ?? '',
      te.sets,
      { reps: te.reps ?? null, weightKg: te.weightKg ?? null, timeSec: te.timeSec ?? null, restSec: te.restSec },
      position
    );
    w.exercises.push(...flat);
    position += flat.length;
  }
  return w;
}

function cloneFromHistory(clientId: string, sourceWorkoutId: string): DemoWorkout {
  const src = findWorkout(sourceWorkoutId);
  if (src.exercises.length === 0) fail(400, 'Source workout has no exercises');
  const w = newWorkoutShell(clientId, src.sourceTemplateId, src.name, src.categoryTag);
  w.exercises = src.exercises.map((e) => ({
    position: e.position,
    exerciseId: e.exerciseId,
    exerciseName: e.exerciseName,
    exerciseCategory: e.exerciseCategory,
    // План переносим, факт сбрасываем.
    sets: e.sets.map((s) => ({
      setIndex: s.setIndex,
      plannedReps: s.plannedReps,
      plannedWeightKg: s.plannedWeightKg,
      plannedTimeSec: s.plannedTimeSec,
      plannedRestSec: s.plannedRestSec,
      actualReps: null,
      actualWeightKg: null,
      actualTimeSec: null,
      done: false,
    })),
  }));
  return w;
}

// ─── Занятия (календарь) ────────────────────────────────────────────────────

function sessionToApi(s: DemoSession): Session | null {
  const c = store.clients.find((x) => x.id === s.clientId);
  if (!c) return null;
  return { ...s, clientFirstName: c.firstName, clientLastName: c.lastName };
}

function sessionFromInput(body: Record<string, unknown>, id: string, createdAt: string, prev?: DemoSession): DemoSession {
  const v = body as Partial<DemoSession>;
  return {
    id,
    clientId: String(v.clientId ?? ''),
    workoutId: v.workoutId ?? null,
    date: String(v.date ?? ''),
    startTime: String(v.startTime ?? ''),
    durationMin: typeof v.durationMin === 'number' ? v.durationMin : 60,
    location: v.location ?? null,
    title: v.title ?? null,
    status: v.status ?? prev?.status ?? 'planned',
    approval: v.approval ?? prev?.approval ?? 'none',
    note: v.note ?? null,
    createdAt,
  };
}

// ─── Маршрутизатор ──────────────────────────────────────────────────────────

function dispatch(method: string, parts: string[], query: URLSearchParams, body: Record<string, unknown>): unknown {
  const [resource, p1, p2, p3, p4] = parts;

  // /api/health
  if (resource === 'health') return { ok: true, ts: nowISO() };

  // /api/clients ...
  if (resource === 'clients') {
    if (!p1) {
      if (method === 'GET') return listClients(query.get('q')?.trim() ?? '');
      if (method === 'POST') {
        const c = clientFromInput(body, uid('cl'), nowISO());
        store.clients.push(c);
        save();
        return c;
      }
    } else if (p1 && p2 === 'workouts') {
      // /api/clients/:id/workouts
      if (method === 'GET') {
        const rows = store.workouts.filter((w) => w.clientId === p1);
        const current = rows.find((w) => w.status === 'draft' || w.status === 'active') ?? null;
        const history = rows
          .filter((w) => w.status === 'completed' || w.status === 'skipped')
          .sort((a, b) => (b.completedAt ?? b.createdAt).localeCompare(a.completedAt ?? a.createdAt));
        return { current, history: history.map(workoutSummary) };
      }
      if (method === 'POST') {
        const existing = store.workouts.find((w) => w.clientId === p1 && (w.status === 'draft' || w.status === 'active'));
        if (existing) fail(409, 'Client already has a current workout', { workoutId: existing.id });
        let w: DemoWorkout;
        if (typeof body.sourceTemplateId === 'string') {
          w = assignFromTemplate(p1, body.sourceTemplateId, body.name as string | undefined, body.categoryTag as string | null);
        } else if (typeof body.cloneFromWorkoutId === 'string') {
          w = cloneFromHistory(p1, body.cloneFromWorkoutId);
        } else if (Array.isArray(body.exercises) && typeof body.name === 'string') {
          w = assignFromExercises(p1, body.name, (body.categoryTag as string | null) ?? null, body.exercises as TemplateExInput[]);
        } else {
          fail(400, 'Provide sourceTemplateId, cloneFromWorkoutId, or name+exercises');
        }
        store.workouts.push(w);
        save();
        return w;
      }
    } else if (p1 && !p2) {
      // /api/clients/:id
      if (method === 'GET') return findClient(p1);
      if (method === 'PUT') {
        const existing = findClient(p1);
        const updated = clientFromInput(body, existing.id, existing.createdAt);
        store.clients = store.clients.map((c) => (c.id === existing.id ? updated : c));
        save();
        return updated;
      }
      if (method === 'DELETE') {
        const existing = findClient(p1);
        store.clients = store.clients.filter((c) => c.id !== existing.id);
        store.workouts = store.workouts.filter((w) => w.clientId !== existing.id);
        store.sessions = store.sessions.filter((s) => s.clientId !== existing.id);
        save();
        return undefined;
      }
    }
  }

  // /api/exercises ...
  if (resource === 'exercises') {
    if (!p1) {
      if (method === 'GET') return listExercises(query.get('q')?.trim() ?? '', query.get('category')?.trim() ?? '');
      if (method === 'POST') {
        const e = exerciseFromInput(body, uid('ex'));
        store.exercises.push(e);
        save();
        return e;
      }
    } else if (p1 && !p2) {
      if (method === 'GET') return findExercise(p1);
      if (method === 'PUT') {
        const existing = findExercise(p1);
        const updated = exerciseFromInput(body, existing.id);
        store.exercises = store.exercises.map((e) => (e.id === existing.id ? updated : e));
        save();
        return updated;
      }
      if (method === 'DELETE') {
        const existing = findExercise(p1);
        store.exercises = store.exercises.filter((e) => e.id !== existing.id);
        save();
        return undefined;
      }
    }
  }

  // /api/workout-templates ...
  if (resource === 'workout-templates') {
    if (!p1) {
      if (method === 'GET') return listTemplates(query.get('q')?.trim() ?? '');
      if (method === 'POST') {
        const t = templateFromInput(body, uid('tpl'));
        store.templates.push(t);
        save();
        return t;
      }
    } else if (p1 && !p2) {
      if (method === 'GET') return findTemplate(p1);
      if (method === 'PUT') {
        const existing = findTemplate(p1);
        const updated = templateFromInput(body, existing.id);
        store.templates = store.templates.map((t) => (t.id === existing.id ? updated : t));
        save();
        return updated;
      }
      if (method === 'DELETE') {
        const existing = findTemplate(p1);
        store.templates = store.templates.filter((t) => t.id !== existing.id);
        save();
        return undefined;
      }
    }
  }

  // /api/client-workouts/:id ...
  if (resource === 'client-workouts' && p1) {
    if (!p2) {
      if (method === 'GET') return findWorkout(p1);
      if (method === 'DELETE') {
        findWorkout(p1);
        store.workouts = store.workouts.filter((w) => w.id !== p1);
        save();
        return undefined;
      }
    }
    if (p2 === 'start' && method === 'PATCH') {
      const w = findWorkout(p1);
      if (w.status !== 'draft') fail(400, `Cannot start workout in status "${w.status}"`);
      w.status = 'active';
      w.startedAt = nowISO();
      save();
      return w;
    }
    if (p2 === 'finish' && method === 'PATCH') {
      const w = findWorkout(p1);
      assertEditable(w);
      w.status = 'completed';
      w.completedAt = nowISO();
      w.durationSec = typeof body.durationSec === 'number' ? body.durationSec : 0;
      w.trainerNote = (body.trainerNote as string | null) ?? null;
      w.rpe = (body.rpe as number | null) ?? null;
      save();
      return w;
    }
    if (p2 === 'reorder' && method === 'PATCH') {
      const w = findWorkout(p1);
      assertEditable(w);
      const order = (Array.isArray(body.order) ? body.order : []) as number[];
      const positions = w.exercises.map((e) => e.position);
      const samePermutation =
        order.length === positions.length &&
        [...order].sort((a, b) => a - b).join(',') === [...positions].sort((a, b) => a - b).join(',');
      if (!samePermutation) fail(400, 'order must be a permutation of current exercise positions');
      w.exercises = order.map((oldPos, newPos) => {
        const ex = w.exercises.find((e) => e.position === oldPos)!;
        return { ...ex, position: newPos };
      });
      save();
      return w;
    }
    if (p2 === 'sets' && p3 !== undefined && p4 !== undefined && method === 'PATCH') {
      const w = findWorkout(p1);
      assertEditable(w);
      const exPos = Number(p3);
      const setIdx = Number(p4);
      const ex = w.exercises.find((e) => e.position === exPos);
      const set = ex?.sets.find((s) => s.setIndex === setIdx);
      if (set) {
        set.actualReps = (body.actualReps as number | null) ?? null;
        set.actualWeightKg = (body.actualWeightKg as number | null) ?? null;
        set.actualTimeSec = (body.actualTimeSec as number | null) ?? null;
        set.done = body.done === true;
        save();
      }
      return w;
    }
    if (p2 === 'exercises' && !p3 && method === 'POST') {
      const w = findWorkout(p1);
      assertEditable(w);
      const ex = findExercise(String(body.exerciseId ?? ''));
      const count = typeof body.sets === 'number' ? body.sets : 1;
      const flat = flattenExercise(
        ex.id,
        ex.name,
        ex.category,
        count,
        { reps: ex.defaultReps, weightKg: ex.defaultWeightKg, timeSec: ex.defaultTimeSec, restSec: ex.restSec },
        w.exercises.length
      );
      w.exercises.push(...flat);
      save();
      return w;
    }
    if (p2 === 'exercises' && p3 !== undefined && method === 'DELETE') {
      const w = findWorkout(p1);
      assertEditable(w);
      const pos = Number(p3);
      if (!w.exercises.some((e) => e.position === pos)) fail(404, 'Exercise not found');
      w.exercises = w.exercises
        .filter((e) => e.position !== pos)
        .map((e, idx) => ({ ...e, position: idx }));
      save();
      return w;
    }
  }

  // /api/sessions ...
  if (resource === 'sessions') {
    if (!p1) {
      if (method === 'GET') {
        const from = query.get('from') ?? '0000-01-01';
        const to = query.get('to') ?? '9999-12-31';
        const clientId = query.get('clientId');
        return store.sessions
          .filter((s) => s.date >= from && s.date <= to && (!clientId || s.clientId === clientId))
          .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
          .map(sessionToApi)
          .filter((s): s is Session => s !== null);
      }
      if (method === 'POST') {
        const s = sessionFromInput(body, uid('ses'), nowISO());
        store.sessions.push(s);
        save();
        return sessionToApi(s);
      }
    } else if (p1 && !p2) {
      const existing = store.sessions.find((s) => s.id === p1);
      if (method === 'GET') {
        if (!existing) fail(404, 'Session not found');
        return sessionToApi(existing);
      }
      if (method === 'PUT') {
        if (!existing) fail(404, 'Session not found');
        const updated = sessionFromInput(body, existing.id, existing.createdAt, existing);
        store.sessions = store.sessions.map((s) => (s.id === existing.id ? updated : s));
        save();
        return sessionToApi(updated);
      }
      if (method === 'DELETE') {
        if (!existing) fail(404, 'Session not found');
        store.sessions = store.sessions.filter((s) => s.id !== existing.id);
        save();
        return undefined;
      }
    }
  }

  // /api/trainer
  if (resource === 'trainer' && !p1) {
    if (method === 'GET') return store.trainer;
    if (method === 'PUT') {
      const v = body as Partial<Trainer>;
      store.trainer = {
        ...store.trainer,
        firstName: String(v.firstName ?? store.trainer.firstName),
        lastName: String(v.lastName ?? store.trainer.lastName),
        title: v.title ?? null,
        specialties: v.specialties ?? null,
        hashtags: v.hashtags ?? null,
        bio: v.bio ?? null,
        phone: v.phone ?? null,
        email: v.email ?? null,
        telegram: v.telegram ?? null,
        instagram: v.instagram ?? null,
      };
      save();
      return store.trainer;
    }
  }

  fail(404, `No demo route for ${method} /${parts.join('/')}`);
}

/** Точка входа: имитирует fetch к серверному API. */
export function demoRequest<T>(method: string, rawPath: string, body?: unknown): T {
  const [pathOnly, queryStr] = rawPath.split('?');
  const query = new URLSearchParams(queryStr ?? '');
  const segments = pathOnly.split('/').filter(Boolean); // ['api', ...]
  const parts = segments[0] === 'api' ? segments.slice(1) : segments;
  const result = dispatch(method, parts, query, (body ?? {}) as Record<string, unknown>);
  // DELETE-эндпоинты возвращают undefined (аналог 204) — клонировать нечего.
  return (result === undefined ? undefined : clone(result)) as T;
}
