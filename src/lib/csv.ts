import fs from 'fs';
import path from 'path';
import { put, list, del } from '@vercel/blob';
import { HouseHelp, DayOfWeek, Frequency, AttendanceRecord, AttendanceStatus } from './types';

const IS_VERCEL = !!process.env.VERCEL;
const DATA_DIR = path.join(process.cwd(), 'data');
const HOUSEHELP_FILE = path.join(DATA_DIR, 'househelps.csv');
const ATTENDANCE_FILE = path.join(DATA_DIR, 'attendance.csv');

const BLOB_HH_KEY = 'househelps.csv';
const BLOB_ATT_KEY = 'attendance.csv';

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

export async function readAttendance(): Promise<AttendanceRecord[]> {
  let content: string;
  if (IS_VERCEL) {
    content = (await readBlob(BLOB_ATT_KEY)).trim();
  } else {
    ensureDataDir();
    if (!fs.existsSync(ATTENDANCE_FILE)) return [];
    content = fs.readFileSync(ATTENDANCE_FILE, 'utf-8').trim();
  }
  if (!content) return [];
  const lines = content.split('\n');
  if (lines.length <= 1) return [];
  return lines.slice(1).filter((l) => l.trim()).map((l) => csvRowToAttendance(csvParseLine(l)));
}

export async function writeAttendance(records: AttendanceRecord[]): Promise<void> {
  const rows = [ATT_HEADER, ...records.map(attendanceToCsvRow)];
  const csv = rows.join('\n') + '\n';
  if (IS_VERCEL) {
    await writeBlob(BLOB_ATT_KEY, csv);
  } else {
    ensureDataDir();
    fs.writeFileSync(ATTENDANCE_FILE, csv, 'utf-8');
  }
}
