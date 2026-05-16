import { Router } from 'express';
import { z } from 'zod';
import { db, type TrainerRow } from '../db.js';
import { asyncHandler, parseBody, requireRow } from '../http.js';

export const trainerRouter = Router();

const TRAINER_ID = 'trainer';

const trainerInput = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  title: z.string().max(120).nullish(),
  specialties: z.string().max(200).nullish(),
  hashtags: z.string().max(300).nullish(),
  bio: z.string().max(2000).nullish(),
  phone: z.string().max(40).nullish(),
  email: z.string().max(120).nullish(),
  telegram: z.string().max(80).nullish(),
  instagram: z.string().max(80).nullish(),
});

const getStmt = db.prepare<[string], TrainerRow>('SELECT * FROM trainer WHERE id = ?');
const updateStmt = db.prepare(`
  UPDATE trainer SET
    first_name = @first_name,
    last_name = @last_name,
    title = @title,
    specialties = @specialties,
    hashtags = @hashtags,
    bio = @bio,
    phone = @phone,
    email = @email,
    telegram = @telegram,
    instagram = @instagram
  WHERE id = @id
`);

function toApi(r: TrainerRow) {
  return {
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    title: r.title,
    specialties: r.specialties,
    hashtags: r.hashtags,
    bio: r.bio,
    phone: r.phone,
    email: r.email,
    telegram: r.telegram,
    instagram: r.instagram,
    shareCode: r.share_code,
  };
}

trainerRouter.get(
  '/',
  asyncHandler((_req, res) => {
    res.json(toApi(requireRow(getStmt.get(TRAINER_ID), 'Trainer')));
  })
);

trainerRouter.put(
  '/',
  asyncHandler((req, res) => {
    const input = parseBody(trainerInput, req.body);
    requireRow(getStmt.get(TRAINER_ID), 'Trainer');
    updateStmt.run({
      id: TRAINER_ID,
      first_name: input.firstName,
      last_name: input.lastName,
      title: input.title ?? null,
      specialties: input.specialties ?? null,
      hashtags: input.hashtags ?? null,
      bio: input.bio ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      telegram: input.telegram ?? null,
      instagram: input.instagram ?? null,
    });
    res.json(toApi(requireRow(getStmt.get(TRAINER_ID), 'Trainer')));
  })
);
