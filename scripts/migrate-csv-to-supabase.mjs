import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const rootDir = process.cwd();
const dataDir = path.join(rootDir, 'data');
const envLocalPath = path.join(rootDir, '.env.local');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function csvParseLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function readCsvRows(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf8').trim();
  if (!content) return [];
  const lines = content.split(/\r?\n/);
  if (lines.length <= 1) return [];
  return lines.slice(1).filter(Boolean).map(csvParseLine);
}

function mapHouseHelp(fields) {
  return {
    id: fields[0],
    name: fields[1],
    phone: fields[2] || null,
    category: fields[3],
    working_days: fields[4] ? fields[4].split(';') : [],
    frequency: fields[5] || 'once',
    rate: fields[6] ? Number(fields[6]) : null,
    created_at: fields[7] || new Date().toISOString(),
  };
}

function mapAttendance(fields) {
  return {
    id: fields[0],
    house_help_id: fields[1],
    date: fields[2],
    status: fields[3] || 'absent',
    comment: fields[4] || null,
    created_at: fields[5] || new Date().toISOString(),
    updated_at: fields[6] || new Date().toISOString(),
  };
}

function chunk(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

async function upsertBatches(supabase, table, rows, onConflict) {
  for (const batch of chunk(rows, 500)) {
    const { error } = await supabase.from(table).upsert(batch, { onConflict });
    if (error) {
      throw error;
    }
  }
}

async function main() {
  loadEnvFile(envLocalPath);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.');
  }

  if (!fs.existsSync(dataDir)) {
    console.log('No data directory found. Nothing to migrate.');
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const houseHelpRows = readCsvRows(path.join(dataDir, 'househelps.csv')).map(mapHouseHelp);
  const attendanceFiles = fs
    .readdirSync(dataDir)
    .filter((name) => name === 'attendance.csv' || /^attendance-\d{4}-\d{2}\.csv$/.test(name));

  const attendanceMap = new Map();
  for (const fileName of attendanceFiles) {
    const rows = readCsvRows(path.join(dataDir, fileName)).map(mapAttendance);
    for (const row of rows) {
      attendanceMap.set(`${row.house_help_id}:${row.date}`, row);
    }
  }

  const attendanceRows = [...attendanceMap.values()];

  if (houseHelpRows.length > 0) {
    await upsertBatches(supabase, 'house_helps', houseHelpRows, 'id');
  }

  if (attendanceRows.length > 0) {
    await upsertBatches(supabase, 'attendance_records', attendanceRows, 'house_help_id,date');
  }

  console.log(`Migrated ${houseHelpRows.length} house help rows.`);
  console.log(`Migrated ${attendanceRows.length} attendance rows.`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
