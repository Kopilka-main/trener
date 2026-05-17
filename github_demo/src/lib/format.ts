const DAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTH_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

export function formatSchedule(day: number | null, time: string | null): string | null {
  if (day === null || time === null) return null;
  return `${DAY_SHORT[day] ?? '?'} ${time}`;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${MONTH_SHORT[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}`;
}

export function formatBirth(iso: string | null): string {
  if (!iso) return '';
  const [y, m, day] = iso.split('-').map(Number);
  const monthFull = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  return `${day} ${monthFull[m - 1]} ${y}`;
}

export function calcAge(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const beforeBirthday = now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate());
  if (beforeBirthday) age--;
  return age;
}
