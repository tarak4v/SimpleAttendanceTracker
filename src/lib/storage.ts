import { HouseHelp, AttendanceRecord } from './types';

const STORAGE_KEYS = {
  houseHelps: 'hht_house_helps',
  attendance: 'hht_attendance',
  auth: 'hht_auth',
} as const;

function getItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

// House Help CRUD
export function getHouseHelps(): HouseHelp[] {
  return getItem<HouseHelp[]>(STORAGE_KEYS.houseHelps, []);
}

export function saveHouseHelp(help: HouseHelp): void {
  const all = getHouseHelps();
  const idx = all.findIndex((h) => h.id === help.id);
  if (idx >= 0) {
    all[idx] = help;
  } else {
    all.push(help);
  }
  setItem(STORAGE_KEYS.houseHelps, all);
}

export function deleteHouseHelp(id: string): void {
  const all = getHouseHelps().filter((h) => h.id !== id);
  setItem(STORAGE_KEYS.houseHelps, all);
  // Also delete related attendance records
  const records = getAttendanceRecords().filter((r) => r.houseHelpId !== id);
  setItem(STORAGE_KEYS.attendance, records);
}

// Attendance CRUD
export function getAttendanceRecords(): AttendanceRecord[] {
  return getItem<AttendanceRecord[]>(STORAGE_KEYS.attendance, []);
}

export function getAttendanceForDate(date: string): AttendanceRecord[] {
  return getAttendanceRecords().filter((r) => r.date === date);
}

export function getAttendanceForHouseHelp(houseHelpId: string): AttendanceRecord[] {
  return getAttendanceRecords().filter((r) => r.houseHelpId === houseHelpId);
}

export function getAttendanceForHouseHelpAndDateRange(
  houseHelpId: string,
  startDate: string,
  endDate: string
): AttendanceRecord[] {
  return getAttendanceRecords().filter(
    (r) => r.houseHelpId === houseHelpId && r.date >= startDate && r.date <= endDate
  );
}

export function getAllAttendanceForDateRange(
  startDate: string,
  endDate: string
): AttendanceRecord[] {
  return getAttendanceRecords().filter(
    (r) => r.date >= startDate && r.date <= endDate
  );
}

export function saveAttendance(record: AttendanceRecord): void {
  const all = getAttendanceRecords();
  const idx = all.findIndex(
    (r) => r.houseHelpId === record.houseHelpId && r.date === record.date
  );
  if (idx >= 0) {
    all[idx] = { ...record, updatedAt: new Date().toISOString() };
  } else {
    all.push(record);
  }
  setItem(STORAGE_KEYS.attendance, all);
}

// Auth
export function isLoggedIn(): boolean {
  return getItem<boolean>(STORAGE_KEYS.auth, false);
}

export function login(): void {
  setItem(STORAGE_KEYS.auth, true);
}

export function logout(): void {
  setItem(STORAGE_KEYS.auth, false);
}
