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
};

const balancesStmt = db.prepare<[], Row>(`
  SELECT
    c.id,
    c.first_name,
    c.last_name,
    COALESCE((SELECT SUM(lessons_paid) FROM payment_packages
              WHERE client_id = c.id AND status = 'active'), 0) AS paid,
    (SELECT COUNT(*) FROM sessions
     WHERE client_id = c.id AND status = 'completed' AND approval = 'approved') AS used
  FROM clients c
`);

// Порог «скоро закончится» — 7 тренировок.
const LOW_BALANCE_THRESHOLD = 7;

type Alert = {
  type: 'low_balance' | 'unpaid';
  severity: 'warn' | 'danger';
  clientId: string;
  clientName: string;
  remaining: number;
  message: string;
};

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
    }
    // danger выше warn, дальше — по остатку (меньше = выше).
    alerts.sort(
      (a, b) =>
        (a.severity === 'danger' ? 0 : 1) - (b.severity === 'danger' ? 0 : 1) ||
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
