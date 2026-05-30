import { Router } from 'express';
import { nanoid } from 'nanoid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db, type ProgressPhotoRow } from '../db.js';
import { asyncHandler, HttpError, requireRow } from '../http.js';

export const progressPhotosRouter = Router();
export const clientProgressPhotosRouter = Router({ mergeParams: true });

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'progress-photos');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${nanoid(16)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB на фото
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(jpe?g|png|webp)$/i.test(file.mimetype)) {
      cb(new HttpError(400, 'Unsupported image type'));
      return;
    }
    cb(null, true);
  },
});

const clientExistsStmt = db.prepare<[string], { id: string }>(`SELECT id FROM clients WHERE id = ?`);
const listByClientStmt = db.prepare<[string], ProgressPhotoRow>(
  `SELECT * FROM progress_photos WHERE client_id = ? ORDER BY date DESC, angle ASC, created_at DESC`
);
const getStmt = db.prepare<[string], ProgressPhotoRow>(`SELECT * FROM progress_photos WHERE id = ?`);
const insertStmt = db.prepare(`
  INSERT INTO progress_photos (id, client_id, date, angle, file_path, note, created_at)
  VALUES (@id, @client_id, @date, @angle, @file_path, @note, @created_at)
`);
const deleteStmt = db.prepare(`DELETE FROM progress_photos WHERE id = ?`);

function toApi(r: ProgressPhotoRow) {
  return {
    id: r.id,
    clientId: r.client_id,
    date: r.date,
    angle: r.angle,
    url: `/uploads/progress-photos/${path.basename(r.file_path)}`,
    note: r.note,
    createdAt: r.created_at,
  };
}

// GET /api/clients/:id/progress-photos
clientProgressPhotosRouter.get(
  '/',
  asyncHandler((req, res) => {
    const id = req.params.id;
    requireRow(clientExistsStmt.get(id), 'Client');
    res.json(listByClientStmt.all(id).map(toApi));
  })
);

// POST /api/clients/:id/progress-photos (multipart: file, date, angle, note?)
clientProgressPhotosRouter.post(
  '/',
  upload.single('file'),
  asyncHandler((req, res) => {
    const id = req.params.id;
    requireRow(clientExistsStmt.get(id), 'Client');
    if (!req.file) throw new HttpError(400, 'File required');
    const date = String(req.body.date ?? '');
    const angle = String(req.body.angle ?? 'front');
    const note = req.body.note ? String(req.body.note) : null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      fs.unlinkSync(req.file.path);
      throw new HttpError(400, 'date must be YYYY-MM-DD');
    }
    if (!['front', 'side', 'back'].includes(angle)) {
      fs.unlinkSync(req.file.path);
      throw new HttpError(400, 'angle must be front/side/back');
    }
    const newId = nanoid(12);
    insertStmt.run({
      id: newId,
      client_id: id,
      date,
      angle,
      file_path: req.file.filename,
      note,
      created_at: new Date().toISOString(),
    });
    res.status(201).json(toApi(requireRow(getStmt.get(newId), 'ProgressPhoto')));
  })
);

// DELETE /api/progress-photos/:id
progressPhotosRouter.delete(
  '/:id',
  asyncHandler((req, res) => {
    const row = getStmt.get(req.params.id);
    if (!row) throw new HttpError(404, 'ProgressPhoto not found');
    deleteStmt.run(row.id);
    const filePath = path.join(UPLOAD_DIR, path.basename(row.file_path));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(204).send();
  })
);
