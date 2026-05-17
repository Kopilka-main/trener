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
