import fs from 'fs';
import path from 'path';
import { put, list, del } from '@vercel/blob';
import { HouseHelp, DayOfWeek, Frequency, AttendanceRecord, AttendanceStatus } from './types';

const IS_VERCEL = !!process.env.VERCEL;
const DATA_DIR = path.join(process.cwd(), 'data');
const HOUSEHELP_FILE = path.join(DATA_DIR, 'househelps.csv');
const LEGACY_ATTENDANCE_FILE = path.join(DATA_DIR, 'attendance.csv');
const ATTENDANCE_FILE_PREFIX = 'attendance-';

const BLOB_HH_KEY = 'househelps.csv';
const LEGACY_BLOB_ATT_KEY = 'attendance.csv';

function ensureDataDir() {
  if (!IS_VERCEL && !fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// --- CSV escape/unescape ---
function csvEscape(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function csvParseLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

// --- House Help CSV ---
const HH_HEADER = 'id,name,phone,category,workingDays,frequency,rate,createdAt';

function houseHelpToCsvRow(h: HouseHelp): string {
  return [
    csvEscape(h.id),
    csvEscape(h.name),
    csvEscape(h.phone || ''),
    csvEscape(h.category),
    csvEscape(h.workingDays.join(';')),
    csvEscape(h.frequency),
    h.rate !== undefined ? String(h.rate) : '',
    csvEscape(h.createdAt),
  ].join(',');
}

function csvRowToHouseHelp(fields: string[]): HouseHelp {
  return {
    id: fields[0],
    name: fields[1],
    phone: fields[2] || undefined,
    category: fields[3],
    workingDays: fields[4] ? (fields[4].split(';') as DayOfWeek[]) : [],
    frequency: (fields[5] || 'once') as Frequency,
    rate: fields[6] ? Number(fields[6]) : undefined,
    createdAt: fields[7] || new Date().toISOString(),
  };
}

// --- Blob helpers ---
async function readBlob(key: string): Promise<string> {
  try {
    const { blobs } = await list({ prefix: key });
    if (blobs.length === 0) return '';
    const res = await fetch(blobs[0].url);
    return res.text();
  } catch {
    return '';
  }
}

async function writeBlob(key: string, content: string): Promise<void> {
  // Delete old blob first
  try {
    const { blobs } = await list({ prefix: key });
    for (const b of blobs) {
      await del(b.url);
    }
  } catch { /* ignore */ }
  await put(key, content, { access: 'public', addRandomSuffix: false });
}

// --- House Help read/write ---
export async function readHouseHelps(): Promise<HouseHelp[]> {
  let content: string;
  if (IS_VERCEL) {
    content = (await readBlob(BLOB_HH_KEY)).trim();
  } else {
    ensureDataDir();
    if (!fs.existsSync(HOUSEHELP_FILE)) return [];
    content = fs.readFileSync(HOUSEHELP_FILE, 'utf-8').trim();
  }
  if (!content) return [];
  const lines = content.split('\n');
  if (lines.length <= 1) return [];
  return lines.slice(1).filter((l) => l.trim()).map((l) => csvRowToHouseHelp(csvParseLine(l)));
}

export async function writeHouseHelps(helps: HouseHelp[]): Promise<void> {
  const rows = [HH_HEADER, ...helps.map(houseHelpToCsvRow)];
  const csv = rows.join('\n') + '\n';
  if (IS_VERCEL) {
    await writeBlob(BLOB_HH_KEY, csv);
  } else {
    ensureDataDir();
    fs.writeFileSync(HOUSEHELP_FILE, csv, 'utf-8');
  }
}

// --- Attendance CSV ---
const ATT_HEADER = 'id,houseHelpId,date,status,comment,createdAt,updatedAt';

function attendanceToCsvRow(r: AttendanceRecord): string {
  return [
    csvEscape(r.id),
    csvEscape(r.houseHelpId),
    csvEscape(r.date),
    csvEscape(r.status),
    csvEscape(r.comment || ''),
    csvEscape(r.createdAt),
    csvEscape(r.updatedAt),
  ].join(',');
}

function csvRowToAttendance(fields: string[]): AttendanceRecord {
  return {
    id: fields[0],
    houseHelpId: fields[1],
    date: fields[2],
    status: (fields[3] || 'absent') as AttendanceStatus,
    comment: fields[4] || undefined,
    createdAt: fields[5] || new Date().toISOString(),
    updatedAt: fields[6] || new Date().toISOString(),
  };
}

function attendanceCsvFromRecords(records: AttendanceRecord[]): string {
  const rows = [ATT_HEADER, ...records.map(attendanceToCsvRow)];
  return rows.join('\n') + '\n';
}

function attendanceRecordsFromCsv(content: string): AttendanceRecord[] {
  const trimmed = content.trim();
  if (!trimmed) return [];
  const lines = trimmed.split('\n');
  if (lines.length <= 1) return [];
  return lines.slice(1).filter((l) => l.trim()).map((l) => csvRowToAttendance(csvParseLine(l)));
}

function monthKeyFromDate(date: string): string {
  return date.slice(0, 7);
}

function monthFileName(monthKey: string): string {
  return `${ATTENDANCE_FILE_PREFIX}${monthKey}.csv`;
}

function monthFilePath(monthKey: string): string {
  return path.join(DATA_DIR, monthFileName(monthKey));
}

function parseMonthKeyFromFileName(name: string): string | null {
  const m = /^attendance-(\d{4}-\d{2})\.csv$/.exec(name);
  return m ? m[1] : null;
}

function getMonthKeysInRange(startDate: string, endDate: string): string[] {
  const [sy, sm] = startDate.slice(0, 7).split('-').map(Number);
  const [ey, em] = endDate.slice(0, 7).split('-').map(Number);
  const cursor = new Date(sy, sm - 1, 1);
  const end = new Date(ey, em - 1, 1);
  const keys: string[] = [];

  while (cursor <= end) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, '0');
    keys.push(`${y}-${m}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return keys;
}

async function readLegacyAttendance(): Promise<AttendanceRecord[]> {
  let content = '';
  if (IS_VERCEL) {
    content = await readBlob(LEGACY_BLOB_ATT_KEY);
  } else {
    ensureDataDir();
    if (!fs.existsSync(LEGACY_ATTENDANCE_FILE)) return [];
    content = fs.readFileSync(LEGACY_ATTENDANCE_FILE, 'utf-8');
  }
  return attendanceRecordsFromCsv(content);
}

async function readAttendanceMonth(monthKey: string): Promise<AttendanceRecord[]> {
  let content = '';
  if (IS_VERCEL) {
    content = await readBlob(monthFileName(monthKey));
  } else {
    ensureDataDir();
    const file = monthFilePath(monthKey);
    if (!fs.existsSync(file)) return [];
    content = fs.readFileSync(file, 'utf-8');
  }
  return attendanceRecordsFromCsv(content);
}

async function writeAttendanceMonth(monthKey: string, records: AttendanceRecord[]): Promise<void> {
  const csv = attendanceCsvFromRecords(records);
  if (IS_VERCEL) {
    await writeBlob(monthFileName(monthKey), csv);
  } else {
    ensureDataDir();
    fs.writeFileSync(monthFilePath(monthKey), csv, 'utf-8');
  }
}

async function deleteAttendanceMonth(monthKey: string): Promise<void> {
  const key = monthFileName(monthKey);
  if (IS_VERCEL) {
    try {
      const { blobs } = await list({ prefix: key });
      for (const b of blobs) {
        await del(b.url);
      }
    } catch {
      // ignore missing month file
    }
  } else {
    const file = monthFilePath(monthKey);
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
}

async function listAttendanceMonthKeys(): Promise<string[]> {
  if (IS_VERCEL) {
    try {
      const { blobs } = await list({ prefix: ATTENDANCE_FILE_PREFIX });
      const keys = blobs
        .map((b) => {
          const pathname = (b as { pathname?: string }).pathname;
          const name = pathname || new URL(b.url).pathname.split('/').pop() || '';
          return parseMonthKeyFromFileName(name);
        })
        .filter((k): k is string => !!k);
      return [...new Set(keys)].sort();
    } catch {
      return [];
    }
  }

  ensureDataDir();
  if (!fs.existsSync(DATA_DIR)) return [];

  const keys = fs
    .readdirSync(DATA_DIR)
    .map((name) => parseMonthKeyFromFileName(name))
    .filter((k): k is string => !!k);
  return [...new Set(keys)].sort();
}

export async function readAttendanceForDate(date: string): Promise<AttendanceRecord[]> {
  const monthRecords = await readAttendanceMonth(monthKeyFromDate(date));
  const filtered = monthRecords.filter((r) => r.date === date);
  if (filtered.length > 0) return filtered;

  // Backward compatibility for older single-file data.
  const legacy = await readLegacyAttendance();
  return legacy.filter((r) => r.date === date);
}

export async function readAttendanceForDateRange(startDate: string, endDate: string): Promise<AttendanceRecord[]> {
  const monthKeys = getMonthKeysInRange(startDate, endDate);
  const chunks = await Promise.all(monthKeys.map((k) => readAttendanceMonth(k)));
  const records = chunks.flat().filter((r) => r.date >= startDate && r.date <= endDate);

  if (records.length > 0) return records;

  // Backward compatibility for older single-file data.
  const legacy = await readLegacyAttendance();
  return legacy.filter((r) => r.date >= startDate && r.date <= endDate);
}

export async function saveAttendanceRecord(record: AttendanceRecord): Promise<void> {
  const monthKey = monthKeyFromDate(record.date);
  const monthRecords = await readAttendanceMonth(monthKey);
  const idx = monthRecords.findIndex(
    (r) => r.houseHelpId === record.houseHelpId && r.date === record.date
  );

  if (idx >= 0) {
    monthRecords[idx] = { ...record, updatedAt: new Date().toISOString() };
  } else {
    monthRecords.push(record);
  }

  await writeAttendanceMonth(monthKey, monthRecords);
}

export async function deleteAttendanceForHouseHelp(houseHelpId: string): Promise<void> {
  const monthKeys = await listAttendanceMonthKeys();

  for (const monthKey of monthKeys) {
    const monthRecords = await readAttendanceMonth(monthKey);
    const filtered = monthRecords.filter((r) => r.houseHelpId !== houseHelpId);
    if (filtered.length === 0) {
      await deleteAttendanceMonth(monthKey);
    } else if (filtered.length !== monthRecords.length) {
      await writeAttendanceMonth(monthKey, filtered);
    }
  }

  // Also clean old single-file data if present.
  const legacy = await readLegacyAttendance();
  if (legacy.length > 0) {
    const filteredLegacy = legacy.filter((r) => r.houseHelpId !== houseHelpId);
    if (filteredLegacy.length !== legacy.length) {
      const csv = attendanceCsvFromRecords(filteredLegacy);
      if (IS_VERCEL) {
        await writeBlob(LEGACY_BLOB_ATT_KEY, csv);
      } else {
        ensureDataDir();
        fs.writeFileSync(LEGACY_ATTENDANCE_FILE, csv, 'utf-8');
      }
    }
  }
}

// Backward-compatible exports.
export async function readAttendance(): Promise<AttendanceRecord[]> {
  const monthKeys = await listAttendanceMonthKeys();
  const chunks = await Promise.all(monthKeys.map((k) => readAttendanceMonth(k)));
  const allMonthly = chunks.flat();

  if (allMonthly.length > 0) return allMonthly;
  return readLegacyAttendance();
}

export async function writeAttendance(records: AttendanceRecord[]): Promise<void> {
  const grouped = new Map<string, AttendanceRecord[]>();
  records.forEach((r) => {
    const monthKey = monthKeyFromDate(r.date);
    if (!grouped.has(monthKey)) grouped.set(monthKey, []);
    grouped.get(monthKey)!.push(r);
  });

  const existingMonthKeys = await listAttendanceMonthKeys();
  await Promise.all(existingMonthKeys.map((k) => (grouped.has(k) ? Promise.resolve() : deleteAttendanceMonth(k))));

  await Promise.all(
    [...grouped.entries()].map(([monthKey, monthRecords]) => writeAttendanceMonth(monthKey, monthRecords))
  );
}
