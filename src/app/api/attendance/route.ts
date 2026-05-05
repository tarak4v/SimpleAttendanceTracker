import { NextRequest, NextResponse } from 'next/server';
import {
  readAttendance,
  readAttendanceForDate,
  readAttendanceForDateRange,
  saveAttendanceRecord,
} from '@/lib/csv';
import { AttendanceRecord } from '@/lib/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (date) {
    return NextResponse.json(await readAttendanceForDate(date));
  }

  if (startDate && endDate) {
    return NextResponse.json(await readAttendanceForDateRange(startDate, endDate));
  }

  return NextResponse.json(await readAttendance());
}

export async function POST(request: NextRequest) {
  const record: AttendanceRecord = await request.json();

  await saveAttendanceRecord(record);
  return NextResponse.json({ ok: true });
}
