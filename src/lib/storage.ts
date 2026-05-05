import { HouseHelp, AttendanceRecord } from './types';

// --- Auth (stays in localStorage — per browser session) ---
const AUTH_KEY = 'hht_auth';

export function isLoggedIn(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY) || 'false');
  } catch {
    return false;
  }
}

export function login(): void {
  if (typeof window !== 'undefined') localStorage.setItem(AUTH_KEY, 'true');
}

export function logout(): void {
  if (typeof window !== 'undefined') localStorage.setItem(AUTH_KEY, 'false');
}

// --- House Help (API -> Supabase) ---
export async function fetchHouseHelps(): Promise<HouseHelp[]> {
  const res = await fetch('/api/house-helps');
  if (!res.ok) return [];
  return res.json();
}

export async function saveHouseHelpApi(help: HouseHelp): Promise<void> {
  await fetch('/api/house-helps', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'save', data: help }),
  });
}

export async function deleteHouseHelpApi(id: string): Promise<void> {
  await fetch('/api/house-helps', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', id }),
  });
}

// --- Attendance (API -> Supabase) ---
export async function fetchAttendanceForDate(date: string): Promise<AttendanceRecord[]> {
  const res = await fetch(`/api/attendance?date=${date}`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchAttendanceForDateRange(startDate: string, endDate: string): Promise<AttendanceRecord[]> {
  const res = await fetch(`/api/attendance?startDate=${startDate}&endDate=${endDate}`);
  if (!res.ok) return [];
  return res.json();
}

export async function saveAttendanceApi(record: AttendanceRecord): Promise<void> {
  await fetch('/api/attendance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  });
}
