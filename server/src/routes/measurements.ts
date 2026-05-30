import { Router } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { db, type MeasurementRow } from '../db.js';
import { asyncHandler, HttpError, parseBody, requireRow } from '../http.js';

export const measurementsRouter = Router();
export const clientMeasurementsRouter = Router({ mergeParams: true });

const measurementInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weightKg: z.number().positive().nullish(),
  bodyFatPct: z.number().min(0).max(100).nullish(),
  musclePct: z.number().min(0).max(100).nullish(),
  waterPct: z.number().min(0).max(100).nullish(),
  chestCm: z.number().positive().nullish(),
  shouldersCm: z.number().positive().nullish(),
  waistCm: z.number().positive().nullish(),
  hipsCm: z.number().positive().nullish(),
  bicepsLCm: z.number().positive().nullish(),
  bicepsRCm: z.number().positive().nullish(),
  thighLCm: z.number().positive().nullish(),
  thighRCm: z.number().positive().nullish(),
  calfLCm: z.number().positive().nullish(),
  calfRCm: z.number().positive().nullish(),
  neckCm: z.number().positive().nullish(),
  note: z.string().max(500).nullish(),
});

const clientExistsStmt = db.prepare<[string], { id: string }>(`SELECT id FROM clients WHERE id = ?`);
const listByClientStmt = db.prepare<[string], MeasurementRow>(
  `SELECT * FROM measurements WHERE client_id = ? ORDER BY date DESC, created_at DESC`
);
const getStmt = db.prepare<[string], MeasurementRow>(`SELECT * FROM measurements WHERE id = ?`);
const insertStmt = db.prepare(`
  INSERT INTO measurements (
    id, client_id, date, weight_kg, body_fat_pct, muscle_pct, water_pct,
    chest_cm, shoulders_cm, waist_cm, hips_cm,
    biceps_l_cm, biceps_r_cm, thigh_l_cm, thigh_r_cm, calf_l_cm, calf_r_cm, neck_cm,
    note, created_at
  ) VALUES (
    @id, @client_id, @date, @weight_kg, @body_fat_pct, @muscle_pct, @water_pct,
    @chest_cm, @shoulders_cm, @waist_cm, @hips_cm,
    @biceps_l_cm, @biceps_r_cm, @thigh_l_cm, @thigh_r_cm, @calf_l_cm, @calf_r_cm, @neck_cm,
    @note, @created_at
  )
`);
const updateStmt = db.prepare(`
  UPDATE measurements SET
    date = @date,
    weight_kg = @weight_kg,
    body_fat_pct = @body_fat_pct,
    muscle_pct = @muscle_pct,
    water_pct = @water_pct,
    chest_cm = @chest_cm,
    shoulders_cm = @shoulders_cm,
    waist_cm = @waist_cm,
    hips_cm = @hips_cm,
    biceps_l_cm = @biceps_l_cm,
    biceps_r_cm = @biceps_r_cm,
    thigh_l_cm = @thigh_l_cm,
    thigh_r_cm = @thigh_r_cm,
    calf_l_cm = @calf_l_cm,
    calf_r_cm = @calf_r_cm,
    neck_cm = @neck_cm,
    note = @note
  WHERE id = @id
`);
const deleteStmt = db.prepare(`DELETE FROM measurements WHERE id = ?`);

function toApi(r: MeasurementRow) {
  return {
    id: r.id,
    clientId: r.client_id,
    date: r.date,
    weightKg: r.weight_kg,
    bodyFatPct: r.body_fat_pct,
    musclePct: r.muscle_pct,
    waterPct: r.water_pct,
    chestCm: r.chest_cm,
    shouldersCm: r.shoulders_cm,
    waistCm: r.waist_cm,
    hipsCm: r.hips_cm,
    bicepsLCm: r.biceps_l_cm,
    bicepsRCm: r.biceps_r_cm,
    thighLCm: r.thigh_l_cm,
    thighRCm: r.thigh_r_cm,
    calfLCm: r.calf_l_cm,
    calfRCm: r.calf_r_cm,
    neckCm: r.neck_cm,
    note: r.note,
    createdAt: r.created_at,
  };
}

function toRowParams(id: string, clientId: string, input: z.infer<typeof measurementInput>) {
  return {
    id,
    client_id: clientId,
    date: input.date,
    weight_kg: input.weightKg ?? null,
    body_fat_pct: input.bodyFatPct ?? null,
    muscle_pct: input.musclePct ?? null,
    water_pct: input.waterPct ?? null,
    chest_cm: input.chestCm ?? null,
    shoulders_cm: input.shouldersCm ?? null,
    waist_cm: input.waistCm ?? null,
    hips_cm: input.hipsCm ?? null,
    biceps_l_cm: input.bicepsLCm ?? null,
    biceps_r_cm: input.bicepsRCm ?? null,
    thigh_l_cm: input.thighLCm ?? null,
    thigh_r_cm: input.thighRCm ?? null,
    calf_l_cm: input.calfLCm ?? null,
    calf_r_cm: input.calfRCm ?? null,
    neck_cm: input.neckCm ?? null,
    note: input.note ?? null,
    created_at: new Date().toISOString(),
  };
}

// GET /api/clients/:id/measurements
clientMeasurementsRouter.get(
  '/',
  asyncHandler((req, res) => {
    const id = req.params.id;
    requireRow(clientExistsStmt.get(id), 'Client');
    res.json(listByClientStmt.all(id).map(toApi));
  })
);

// POST /api/clients/:id/measurements
clientMeasurementsRouter.post(
  '/',
  asyncHandler((req, res) => {
    const id = req.params.id;
    requireRow(clientExistsStmt.get(id), 'Client');
    const input = parseBody(measurementInput, req.body);
    const newId = nanoid(12);
    insertStmt.run(toRowParams(newId, id, input));
    res.status(201).json(toApi(requireRow(getStmt.get(newId), 'Measurement')));
  })
);

// PUT /api/measurements/:id
measurementsRouter.put(
  '/:id',
  asyncHandler((req, res) => {
    const row = requireRow(getStmt.get(req.params.id), 'Measurement');
    const input = parseBody(measurementInput, req.body);
    updateStmt.run({ ...toRowParams(row.id, row.client_id, input), created_at: row.created_at });
    res.json(toApi(requireRow(getStmt.get(row.id), 'Measurement')));
  })
);

// DELETE /api/measurements/:id
measurementsRouter.delete(
  '/:id',
  asyncHandler((req, res) => {
    const result = deleteStmt.run(req.params.id);
    if (result.changes === 0) throw new HttpError(404, 'Measurement not found');
    res.status(204).send();
  })
);
