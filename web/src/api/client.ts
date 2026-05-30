import {
  mockTrainer,
  mockClients,
  mockExercises,
  mockSessions,
  mockConversations,
  mockGyms,
  mockAccountingSummary,
  mockIncomes,
  mockWorkoutTemplates,
  mockBalance,
  mockPackagesFor,
} from '../lib/mock-data';

export type ApiError = { error: string; details?: unknown; status: number };

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === '1';

function mockResponse(method: string, fullPath: string): unknown | undefined {
  const [path, qs = ''] = fullPath.split('?');
  const q = new URLSearchParams(qs);
  // GET ----------------------------------------------------------------
  if (method === 'GET') {
    if (path === '/api/trainer') return mockTrainer;
    if (path === '/api/clients') {
      const term = q.get('q')?.toLowerCase();
      if (term) {
        return mockClients.filter(
          (c) => c.firstName.toLowerCase().includes(term) || c.lastName.toLowerCase().includes(term),
        );
      }
      return mockClients;
    }
    const clientMatch = path.match(/^\/api\/clients\/([^/]+)$/);
    if (clientMatch) return mockClients.find((c) => c.id === clientMatch[1]) ?? mockClients[0];
    const balanceMatch = path.match(/^\/api\/clients\/([^/]+)\/balance$/);
    if (balanceMatch) return mockBalance(balanceMatch[1]);
    const packagesMatch = path.match(/^\/api\/clients\/([^/]+)\/packages$/);
    if (packagesMatch) return mockPackagesFor(packagesMatch[1]);
    if (path === '/api/exercises') {
      const term = q.get('q')?.toLowerCase();
      const cat = q.get('category');
      const equipment = q.get('equipment');
      const muscle = q.get('muscle');
      return mockExercises.filter((e) => {
        if (cat && e.category !== cat) return false;
        if (equipment && e.equipment !== equipment) return false;
        if (muscle && !e.targetMuscles.includes(muscle)) return false;
        if (term && !e.name.toLowerCase().includes(term)) return false;
        return true;
      });
    }
    const exMatch = path.match(/^\/api\/exercises\/([^/]+)$/);
    if (exMatch) return mockExercises.find((e) => e.id === exMatch[1]) ?? mockExercises[0];
    if (path === '/api/sessions') {
      const from = q.get('from') ?? '';
      const to = q.get('to') ?? '';
      const clientId = q.get('clientId');
      return mockSessions.filter(
        (s) => s.date >= from && s.date <= to && (!clientId || s.clientId === clientId),
      );
    }
    if (path === '/api/sessions/payment-status') {
      const map: Record<string, boolean> = {};
      mockSessions.forEach((s) => (map[s.id] = true));
      return map;
    }
    if (path === '/api/conversations') return mockConversations;
    if (path === '/api/conversations/unread') {
      const clientId = q.get('clientId');
      if (clientId) {
        // Демо: у Алины Кузнецовой (cl_001) одно непрочитанное сообщение.
        return { unread: clientId === 'cl_001' ? 1 : 0 };
      }
      return { unread: 3 };
    }
    const convByClient = path.match(/^\/api\/conversations\/by-client\/([^/]+)$/);
    if (convByClient) {
      return {
        id: `conv-${convByClient[1]}`,
        clientId: convByClient[1],
        trainerLastReceivedAt: null,
        trainerLastReadAt: null,
        clientLastReceivedAt: null,
        clientLastReadAt: null,
      };
    }
    const convMsgs = path.match(/^\/api\/conversations\/([^/]+)\/messages$/);
    if (convMsgs) {
      const convId = convMsgs[1];
      return [
        { id: `m1-${convId}`, conversationId: convId, senderRole: 'client', body: 'Привет, как дела?', createdAt: new Date(Date.now() - 3600_000).toISOString() },
        { id: `m2-${convId}`, conversationId: convId, senderRole: 'trainer', body: 'Привет! Завтра в 18:00 подойдёт?', createdAt: new Date(Date.now() - 1800_000).toISOString() },
        { id: `m3-${convId}`, conversationId: convId, senderRole: 'client', body: 'Да, до встречи', createdAt: new Date(Date.now() - 600_000).toISOString() },
      ];
    }
    if (path === '/api/gyms') return mockGyms;
    if (path === '/api/templates') return mockWorkoutTemplates;
    const tplMatch = path.match(/^\/api\/templates\/([^/]+)$/);
    if (tplMatch) return mockWorkoutTemplates.find((t) => t.id === tplMatch[1]) ?? mockWorkoutTemplates[0];
    if (path === '/api/accounting/summary') return mockAccountingSummary;
    if (path === '/api/accounting/incomes') return mockIncomes;
    if (path === '/api/accounting/expenses') return [];
    if (path === '/api/alerts') return [];
    if (path === '/api/trainer/alerts') {
      // Алерты: оплаченные занятия заканчиваются у нескольких клиентов + 1 unpaid + 1 no_upcoming.
      const pick = (i: number) => mockClients[i];
      return [
        {
          type: 'low_balance',
          severity: 'danger',
          clientId: pick(0).id,
          clientName: `${pick(0).firstName} ${pick(0).lastName}`,
          remaining: 1,
          message: 'Осталось 1 оплаченное занятие. Предложи продление пакета.',
        },
        {
          type: 'low_balance',
          severity: 'warn',
          clientId: pick(3).id,
          clientName: `${pick(3).firstName} ${pick(3).lastName}`,
          remaining: 2,
          message: 'Осталось 2 оплаченных занятия — пора напомнить о пакете.',
        },
        {
          type: 'low_balance',
          severity: 'warn',
          clientId: pick(7).id,
          clientName: `${pick(7).firstName} ${pick(7).lastName}`,
          remaining: 3,
          message: 'Осталось 3 оплаченных занятия. Скоро потребуется оплата.',
        },
        {
          type: 'unpaid',
          severity: 'danger',
          clientId: pick(12).id,
          clientName: `${pick(12).firstName} ${pick(12).lastName}`,
          remaining: 0,
          message: 'Оплата пакета просрочена на 4 дня. Запланированы 2 занятия без оплаты.',
        },
        {
          type: 'no_upcoming',
          severity: 'warn',
          clientId: pick(5).id,
          clientName: `${pick(5).firstName} ${pick(5).lastName}`,
          remaining: 0,
          message: 'Оплачен пакет, но на ближайшую неделю не назначено ни одного занятия.',
        },
      ];
    }
    const cwMatch = path.match(/^\/api\/clients\/([^/]+)\/workouts$/);
    if (cwMatch) return { current: null, history: [] };
    if (path === '/api/clients/stats') return mockClients.map((c) => ({ clientId: c.id, totalWorkouts: 4 + (parseInt(c.id.replace('c', ''), 10) || 0) % 12, lastWorkoutAt: null }));
  }
  // мутации — заглушки (возвращаем то, что пришло, с фейковым id)
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    if (path === '/api/auth/login' || path === '/api/auth/register') return { ok: true, token: 'mock-token' };
    return { id: `mock-${Date.now()}` };
  }
  if (method === 'DELETE') return undefined;
  return undefined;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (USE_MOCKS) {
    const mock = mockResponse(method, path);
    if (mock !== undefined) {
      // Имитируем сетевую задержку чтобы UI не «дёргался»
      await new Promise((r) => setTimeout(r, 80));
      return mock as T;
    }
    // Если конкретного мока нет — отдаём пустой массив или null, чтобы UI не падал.
    return (Array.isArray([]) ? ([] as unknown as T) : (null as unknown as T));
  }

  const res = await fetch(path, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: ApiError = { error: data.error ?? res.statusText, details: data.details, status: res.status };
    throw err;
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T = void>(path: string) => request<T>('DELETE', path),
};
