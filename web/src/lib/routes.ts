// Раздельные адресные пространства двух приложений: тренерского и клиентского.
// Тренер живёт под /trainer/*, клиент — под /client/*.
export const TRAINER_BASE = '/trainer';
export const CLIENT_BASE = '/client';

// Демо-клиент, от лица которого работает клиентское приложение.
export const DEMO_CLIENT_ID = 'cl_001';

/** Префикс маршрутов для текущей роли (тренер — по умолчанию). */
export function appBase(): string {
  return localStorage.getItem('app_role') === 'client' ? CLIENT_BASE : TRAINER_BASE;
}

/** Экран тренировок клиента: у тренера — по id, у клиента — единый адрес. */
export function clientWorkoutsPath(clientId: string): string {
  return localStorage.getItem('app_role') === 'client'
    ? `${CLIENT_BASE}/workouts`
    : `${TRAINER_BASE}/clients/${clientId}/workouts`;
}

/**
 * Родительский экран для кнопки «назад» — переход по иерархии разделов,
 * а не по истории браузера.
 */
export function backTarget(pathname: string, search = ''): string {
  const segs = pathname.split('/').filter(Boolean);
  const base = segs[0] === 'client' ? CLIENT_BASE : TRAINER_BASE;
  const sub = segs[1] ?? '';
  const isClient = base === CLIENT_BASE;
  const sectionHome = isClient ? `${CLIENT_BASE}/workouts` : `${TRAINER_BASE}/clients`;

  if (sub === 'exercises' || sub === 'templates') return `${base}/exercises`;
  if (sub === 'profile') return segs[2] === 'edit' ? `${base}/profile` : sectionHome;
  if (sub === 'calendar') {
    const clientId = new URLSearchParams(search).get('clientId');
    // Календарь, открытый из карточки клиента, возвращает в карточку.
    if (clientId && !isClient) return `${TRAINER_BASE}/clients/${clientId}`;
    return sectionHome;
  }
  if (sub === 'clients') {
    // /clients/new и /clients/:id (карточка) возвращают в список.
    // /clients/:id/edit и /clients/:id/workouts — в карточку клиента.
    const idOrAction = segs[2];
    const action = segs[3];
    if (!idOrAction || idOrAction === 'new') return `${TRAINER_BASE}/clients`;
    if (!action) return `${TRAINER_BASE}/clients`;
    return `${TRAINER_BASE}/clients/${idOrAction}`;
  }
  if (sub === 'workouts') return sectionHome;
  return sectionHome;
}
