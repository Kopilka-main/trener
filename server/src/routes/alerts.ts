import { Router } from 'express';
import { db } from '../db.js';
import { asyncHandler } from '../http.js';

// Уведомления тренеру: пакет скоро закончится / требуется оплата.
export const alertsRouter = Router();

type Row = {
  id: string;
  first_name: string;
  last_name: string;
  paid: number;
  used: number;
  upcoming: number;       // запланировано на ближайшие 7 дней
};

const balancesStmt = db.prepare<[], Row>(`
  SELECT
    c.id,
    c.first_name,
    c.last_name,
    COALESCE((SELECT SUM(lessons_paid) FROM payment_packages
              WHERE client_id = c.id AND status = 'active'), 0) AS paid,
    (SELECT COUNT(*) FROM sessions
     WHERE client_id = c.id AND status = 'completed') AS used,
    (SELECT COUNT(*) FROM sessions
     WHERE client_id = c.id AND status = 'planned' AND is_online = 0
       AND date >= DATE('now') AND date <= DATE('now', '+7 days')) AS upcoming
  FROM clients c
`);

// Порог «скоро закончится» — 7 тренировок.
const LOW_BALANCE_THRESHOLD = 7;

type Alert = {
  type: 'low_balance' | 'unpaid' | 'no_upcoming' | 'online_today' | 'birthday';
  severity: 'warn' | 'danger' | 'info';
  clientId: string | null;        // null — сводный алерт (online_today)
  clientName: string | null;
  remaining: number;              // 0 для алертов без баланса
  message: string;
  clientNames?: string[];         // online_today: список имён клиентов
};

// Сегодняшние онлайн-тренировки (completed): для сводки «X тренировок проведено».
const onlineTodayStmt = db.prepare<[], { id: string; first_name: string; last_name: string }>(`
  SELECT DISTINCT c.id, c.first_name, c.last_name
  FROM sessions s
  JOIN clients c ON c.id = s.client_id
  WHERE s.is_online = 1 AND s.status = 'completed' AND s.date = DATE('now')
  ORDER BY c.first_name, c.last_name
`);

// Клиенты с днём рождения сегодня (по дню и месяцу, без учёта года).
const birthdaysTodayStmt = db.prepare<[], { id: string; first_name: string; last_name: string; birth_date: string }>(`
  SELECT id, first_name, last_name, birth_date
  FROM clients
  WHERE birth_date IS NOT NULL
    AND strftime('%m-%d', birth_date) = strftime('%m-%d', 'now')
`);

alertsRouter.get(
  '/',
  asyncHandler((_req, res) => {
    const alerts: Alert[] = [];
    for (const r of balancesStmt.all()) {
      const remaining = r.paid - r.used;
      const clientName = `${r.first_name} ${r.last_name}`;
      if (remaining < 0) {
        alerts.push({
          type: 'unpaid',
          severity: 'danger',
          clientId: r.id,
          clientName,
          remaining,
          message: `Требуется оплата ${Math.abs(remaining)} тренировок`,
        });
      } else if (r.paid > 0 && remaining <= LOW_BALANCE_THRESHOLD) {
        alerts.push({
          type: 'low_balance',
          severity: 'warn',
          clientId: r.id,
          clientName,
          remaining,
          message:
            remaining === 0
              ? 'Пакет закончился'
              : `Осталось ${remaining} ${plural(remaining, 'тренировка', 'тренировки', 'тренировок')}`,
        });
      }
      // Оплачены тренировки, но на ближайшую неделю ничего не назначено.
      if (remaining > 0 && r.upcoming === 0) {
        alerts.push({
          type: 'no_upcoming',
          severity: 'warn',
          clientId: r.id,
          clientName,
          remaining,
          message: `На следующую неделю не запланировано, хотя оплачено ${remaining} ${plural(remaining, 'тренировка', 'тренировки', 'тренировок')}`,
        });
      }
    }
    // Сегодняшние онлайн-тренировки — одна сводная карточка.
    const onlineToday = onlineTodayStmt.all();
    if (onlineToday.length > 0) {
      const names = onlineToday.map((r) => `${r.first_name} ${r.last_name}`);
      alerts.push({
        type: 'online_today',
        severity: 'info',
        clientId: null,
        clientName: null,
        remaining: 0,
        message: `Сегодня пройдено ${onlineToday.length} ${plural(onlineToday.length, 'тренировка', 'тренировки', 'тренировок')} онлайн`,
        clientNames: names,
      });
    }

    // Дни рождения сегодня — по одной карточке на клиента.
    for (const r of birthdaysTodayStmt.all()) {
      alerts.push({
        type: 'birthday',
        severity: 'info',
        clientId: r.id,
        clientName: `${r.first_name} ${r.last_name}`,
        remaining: 0,
        message: 'Ожидается поздравление с днём рождения',
      });
    }

    // Порядок: danger → warn → info; внутри уровня — по остатку (меньше = выше).
    const severityOrder = { danger: 0, warn: 1, info: 2 };
    alerts.sort(
      (a, b) =>
        severityOrder[a.severity] - severityOrder[b.severity] ||
        a.remaining - b.remaining
    );
    res.json(alerts);
  })
);

function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}
