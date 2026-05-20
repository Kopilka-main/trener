import express from 'express';
import cors from 'cors';
import { db } from './db.js';
import { clientsRouter } from './routes/clients.js';
import { exercisesRouter } from './routes/exercises.js';
import { workoutTemplatesRouter } from './routes/workout-templates.js';
import { clientWorkoutsRouter } from './routes/client-workouts.js';
import { sessionsRouter } from './routes/sessions.js';
import { trainerRouter } from './routes/trainer.js';
import { clientPackagesRouter, packagesRouter } from './routes/packages.js';
import { alertsRouter } from './routes/alerts.js';
import { gymsRouter } from './routes/gyms.js';
import { expensesRouter } from './routes/expenses.js';
import { accountingRouter } from './routes/accounting.js';
import { clientStatsRouter } from './routes/client-stats.js';
import { runSeedIfEmpty, seedSessionsIfEmpty, seedTrainerIfEmpty, ensureTrainerShareCode, ensureSchemaUpgrades, normalizeWorkouts } from './seed.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

app.use('/api/clients', clientsRouter);
app.use('/api/clients/:id/stats', clientStatsRouter);
app.use('/api/clients/:id/packages', clientPackagesRouter);
app.use('/api/packages', packagesRouter);
app.use('/api/exercises', exercisesRouter);
app.use('/api/workout-templates', workoutTemplatesRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/trainer', trainerRouter);
app.use('/api/trainer/alerts', alertsRouter);
app.use('/api/gyms', gymsRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/accounting', accountingRouter);
app.use('/api', clientWorkoutsRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err && typeof err === 'object' && 'status' in err && typeof (err as { status?: number }).status === 'number') {
    const e = err as { status: number; message?: string; details?: unknown };
    res.status(e.status).json({ error: e.message ?? 'Error', details: e.details });
    return;
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = Number(process.env.PORT ?? 3001);

runSeedIfEmpty(db);
seedSessionsIfEmpty(db);
seedTrainerIfEmpty(db);
ensureTrainerShareCode(db);
ensureSchemaUpgrades(db);
normalizeWorkouts(db);

app.listen(PORT, () => {
  console.log(`[trener-server] http://localhost:${PORT}`);
});
