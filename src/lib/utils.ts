import { DayOfWeek } from './types';

export function generateId(): string {
  return crypto.randomUUID();
}

export function todayStr(): string {
  return formatDate(new Date());
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function getDayOfWeek(dateStr: string): DayOfWeek {
  const days: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[parseDate(dateStr).getDay()];
}

export function getMonthDays(year: number, month: number): string[] {
  const days: string[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(formatDate(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

export function getWeekDays(dateStr: string): string[] {
  const date = parseDate(dateStr);
  const day = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((day + 6) % 7));
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(formatDate(d));
  }
  return days;
}

export function getMonthName(month: number): string {
  return [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ][month];
}

export function getShortDay(dateStr: string): string {
  return getDayOfWeek(dateStr).slice(0, 3);
}

export function getDayNum(dateStr: string): number {
  return parseDate(dateStr).getDate();
}
