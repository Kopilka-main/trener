import { Router } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { db, type ConversationRow, type MessageRow } from '../db.js';
import { asyncHandler, HttpError, parseBody, requireRow } from '../http.js';

// Простой чат: 1 диалог на клиента, polling. Тренер видит всех клиентов,
// клиент — свой единственный диалог. Для 40 000 пользователей понадобится
// миграция на Postgres + WebSocket + реальная многопользовательская
// авторизация — TODO в эту итерацию не входит.
export const chatRouter = Router();

const messageInput = z.object({
  senderRole: z.enum(['trainer', 'client']),
  body: z.string().min(1).max(4000),
});

const conversationByClientStmt = db.prepare<[string], ConversationRow>(
  `SELECT * FROM conversations WHERE client_id = ?`
);

const conversationByIdStmt = db.prepare<[string], ConversationRow>(
  `SELECT * FROM conversations WHERE id = ?`
);

const insertConversationStmt = db.prepare(
  `INSERT INTO conversations (id, client_id) VALUES (@id, @client_id)`
);

function getOrCreateConversation(clientId: string): ConversationRow {
  const existing = conversationByClientStmt.get(clientId);
  if (existing) return existing;
  const id = nanoid(12);
  insertConversationStmt.run({ id, client_id: clientId });
  return requireRow(conversationByIdStmt.get(id), 'Conversation');
}

// ─── Список диалогов с превью и счётчиком непрочитанных (для тренера) ───

type ConvListRow = {
  id: string;
  client_id: string;
  trainer_last_read_at: string | null;
  first_name: string;
  last_name: string;
  last_body: string | null;
  last_at: string | null;
  last_sender: string | null;
  unread: number;
};

const conversationsListStmt = db.prepare<[], ConvListRow>(`
  SELECT
    c.id, c.client_id, c.trainer_last_read_at,
    cl.first_name, cl.last_name,
    (SELECT body FROM messages m WHERE m.conversation_id = c.id
     ORDER BY m.created_at DESC LIMIT 1) AS last_body,
    (SELECT created_at FROM messages m WHERE m.conversation_id = c.id
     ORDER BY m.created_at DESC LIMIT 1) AS last_at,
    (SELECT sender_role FROM messages m WHERE m.conversation_id = c.id
     ORDER BY m.created_at DESC LIMIT 1) AS last_sender,
    (SELECT COUNT(*) FROM messages m
     WHERE m.conversation_id = c.id
       AND m.sender_role = 'client'
       AND (c.trainer_last_read_at IS NULL OR m.created_at > c.trainer_last_read_at)
    ) AS unread
  FROM conversations c
  JOIN clients cl ON cl.id = c.client_id
  ORDER BY (last_at IS NULL) ASC, last_at DESC
`);

chatRouter.get(
  '/',
  asyncHandler((_req, res) => {
    res.json(
      conversationsListStmt.all().map((r) => ({
        id: r.id,
        clientId: r.client_id,
        clientFirstName: r.first_name,
        clientLastName: r.last_name,
        lastBody: r.last_body,
        lastAt: r.last_at,
        lastSenderRole: r.last_sender,
        unread: r.unread,
      }))
    );
  })
);

// ─── Сообщения диалога ──────────────────────────────────────────────────────

const messagesSinceStmt = db.prepare<[string, string], MessageRow>(
  `SELECT * FROM messages WHERE conversation_id = ? AND created_at > ? ORDER BY created_at ASC`
);
const messagesAllStmt = db.prepare<[string], MessageRow>(
  `SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`
);

function toMsg(r: MessageRow) {
  return {
    id: r.id,
    conversationId: r.conversation_id,
    senderRole: r.sender_role,
    body: r.body,
    createdAt: r.created_at,
  };
}

// Получить диалог по clientId с авто-созданием и сразу сообщения.
function convToApi(conv: ConversationRow) {
  return {
    id: conv.id,
    clientId: conv.client_id,
    trainerLastReceivedAt: conv.trainer_last_received_at,
    trainerLastReadAt: conv.trainer_last_read_at,
    clientLastReceivedAt: conv.client_last_received_at,
    clientLastReadAt: conv.client_last_read_at,
  };
}

chatRouter.get(
  '/by-client/:clientId',
  asyncHandler((req, res) => {
    const conv = getOrCreateConversation(req.params.clientId);
    res.json(convToApi(conv));
  })
);

const markTrainerReceivedStmt = db.prepare(`UPDATE conversations SET trainer_last_received_at = ? WHERE id = ?`);
const markClientReceivedStmt = db.prepare(`UPDATE conversations SET client_last_received_at = ? WHERE id = ?`);

chatRouter.get(
  '/:id/messages',
  asyncHandler((req, res) => {
    const conv = requireRow(conversationByIdStmt.get(req.params.id), 'Conversation');
    const since = String(req.query.since ?? '');
    const role = req.query.role === 'trainer' || req.query.role === 'client' ? req.query.role : null;
    const rows = since ? messagesSinceStmt.all(conv.id, since) : messagesAllStmt.all(conv.id);
    // Опрос «другой стороны» = подтверждение получения её сообщений (✓✓ серые).
    if (role) {
      const ts = new Date().toISOString();
      if (role === 'trainer') markTrainerReceivedStmt.run(ts, conv.id);
      else markClientReceivedStmt.run(ts, conv.id);
    }
    res.json(rows.map(toMsg));
  })
);

// Полный объект conversation (нужен фронту для расчёта галочек ✓ / ✓✓ / ✓✓ синие).
chatRouter.get(
  '/:id',
  asyncHandler((req, res) => {
    const conv = requireRow(conversationByIdStmt.get(req.params.id), 'Conversation');
    res.json(convToApi(conv));
  })
);

const insertMessageStmt = db.prepare(`
  INSERT INTO messages (id, conversation_id, sender_role, body, created_at)
  VALUES (@id, @conversation_id, @sender_role, @body, @created_at)
`);

chatRouter.post(
  '/:id/messages',
  asyncHandler((req, res) => {
    const conv = requireRow(conversationByIdStmt.get(req.params.id), 'Conversation');
    const input = parseBody(messageInput, req.body);
    const id = nanoid(12);
    const created_at = new Date().toISOString();
    insertMessageStmt.run({
      id,
      conversation_id: conv.id,
      sender_role: input.senderRole,
      body: input.body,
      created_at,
    });
    res.status(201).json(toMsg({
      id,
      conversation_id: conv.id,
      sender_role: input.senderRole,
      body: input.body,
      created_at,
    }));
  })
);

const markTrainerReadStmt = db.prepare(
  `UPDATE conversations SET trainer_last_read_at = ? WHERE id = ?`
);
const markClientReadStmt = db.prepare(
  `UPDATE conversations SET client_last_read_at = ? WHERE id = ?`
);

const readInput = z.object({ role: z.enum(['trainer', 'client']) });

chatRouter.patch(
  '/:id/read',
  asyncHandler((req, res) => {
    const conv = requireRow(conversationByIdStmt.get(req.params.id), 'Conversation');
    const input = parseBody(readInput, req.body);
    const ts = new Date().toISOString();
    if (input.role === 'trainer') markTrainerReadStmt.run(ts, conv.id);
    else markClientReadStmt.run(ts, conv.id);
    res.json({ ok: true, at: ts });
  })
);

const unreadTotalForTrainerStmt = db.prepare<[], { n: number }>(`
  SELECT COUNT(*) AS n FROM messages m
  JOIN conversations c ON c.id = m.conversation_id
  WHERE m.sender_role = 'client'
    AND (c.trainer_last_read_at IS NULL OR m.created_at > c.trainer_last_read_at)
`);

const unreadForTrainerByClientStmt = db.prepare<[string], { n: number }>(`
  SELECT COUNT(*) AS n FROM messages m
  JOIN conversations c ON c.id = m.conversation_id
  WHERE c.client_id = ?
    AND m.sender_role = 'client'
    AND (c.trainer_last_read_at IS NULL OR m.created_at > c.trainer_last_read_at)
`);

const unreadForClientStmt = db.prepare<[string], { n: number }>(`
  SELECT COUNT(*) AS n FROM messages m
  JOIN conversations c ON c.id = m.conversation_id
  WHERE c.client_id = ?
    AND m.sender_role = 'trainer'
    AND (c.client_last_read_at IS NULL OR m.created_at > c.client_last_read_at)
`);

chatRouter.get(
  '/unread',
  asyncHandler((req, res) => {
    const role = String(req.query.role ?? 'trainer');
    const clientId = req.query.clientId ? String(req.query.clientId) : null;
    if (role === 'client' && !clientId) throw new HttpError(400, 'clientId required for client role');
    let n: number;
    if (role === 'trainer') {
      n = clientId
        ? unreadForTrainerByClientStmt.get(clientId)?.n ?? 0
        : unreadTotalForTrainerStmt.get()?.n ?? 0;
    } else {
      n = unreadForClientStmt.get(clientId!)?.n ?? 0;
    }
    res.json({ unread: n });
  })
);
