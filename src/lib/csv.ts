import fs from 'fs';
import path from 'path';
import { HouseHelp, DayOfWeek, Frequency, AttendanceRecord, AttendanceStatus } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const HOUSEHELP_FILE = path.join(DATA_DIR, 'househelps.csv');
const ATTENDANCE_FILE = path.join(DATA_DIR, 'attendance.csv');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
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

export function readHouseHelps(): HouseHelp[] {
  ensureDataDir();
  if (!fs.existsSync(HOUSEHELP_FILE)) return [];
  const content = fs.readFileSync(HOUSEHELP_FILE, 'utf-8').trim();
  const lines = content.split('\n');
  if (lines.length <= 1) return [];
  return lines.slice(1).filter((l) => l.trim()).map((l) => csvRowToHouseHelp(csvParseLine(l)));
}

export function writeHouseHelps(helps: HouseHelp[]): void {
  ensureDataDir();
  const rows = [HH_HEADER, ...helps.map(houseHelpToCsvRow)];
  fs.writeFileSync(HOUSEHELP_FILE, rows.join('\n') + '\n', 'utf-8');
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

export function readAttendance(): AttendanceRecord[] {
  ensureDataDir();
  if (!fs.existsSync(ATTENDANCE_FILE)) return [];
  const content = fs.readFileSync(ATTENDANCE_FILE, 'utf-8').trim();
  const lines = content.split('\n');
  if (lines.length <= 1) return [];
  return lines.slice(1).filter((l) => l.trim()).map((l) => csvRowToAttendance(csvParseLine(l)));
}

export function writeAttendance(records: AttendanceRecord[]): void {
  ensureDataDir();
  const rows = [ATT_HEADER, ...records.map(attendanceToCsvRow)];
  fs.writeFileSync(ATTENDANCE_FILE, rows.join('\n') + '\n', 'utf-8');
}
