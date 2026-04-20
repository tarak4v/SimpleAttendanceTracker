import { NextRequest, NextResponse } from 'next/server';
import { readAttendance, writeAttendance } from '@/lib/csv';
import { AttendanceRecord } from '@/lib/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  let records = await readAttendance();

  if (date) {
    records = records.filter((r) => r.date === date);
  } else if (startDate && endDate) {
    records = records.filter((r) => r.date >= startDate && r.date <= endDate);
  }

  return NextResponse.json(records);
}

export async function POST(request: NextRequest) {
  const record: AttendanceRecord = await request.json();

  const all = await readAttendance();
  const idx = all.findIndex(
    (r) => r.houseHelpId === record.houseHelpId && r.date === record.date
  );

  if (idx >= 0) {
    all[idx] = { ...record, updatedAt: new Date().toISOString() };
  } else {
    all.push(record);
  }

  await writeAttendance(all);
  return NextResponse.json({ ok: true });
}
