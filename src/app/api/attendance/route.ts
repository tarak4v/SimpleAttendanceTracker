import { NextRequest, NextResponse } from 'next/server';
import { AttendanceRecord } from '@/lib/types';
import { getSupabaseAdminClient } from '@/lib/supabase';

type AttendanceRow = {
  id: string;
  house_help_id: string;
  date: string;
  status: 'present' | 'absent' | 'leave' | 'holiday' | 'halfday';
  comment: string | null;
  created_at: string;
  updated_at: string;
};

function mapAttendanceRow(row: AttendanceRow): AttendanceRecord {
  return {
    id: row.id,
    houseHelpId: row.house_help_id,
    date: row.date,
    status: row.status,
    comment: row.comment || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAttendancePayload(record: AttendanceRecord): Omit<AttendanceRow, 'created_at' | 'updated_at'> & {
  created_at: string;
  updated_at: string;
} {
  return {
    id: record.id,
    house_help_id: record.houseHelpId,
    date: record.date,
    status: record.status,
    comment: record.comment || null,
    created_at: record.createdAt,
    updated_at: new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  try {
    const supabase = getSupabaseAdminClient();
    let query = supabase
      .from('attendance_records')
      .select('id,house_help_id,date,status,comment,created_at,updated_at')
      .order('date', { ascending: true });

    if (date) {
      query = query.eq('date', date);
    } else if (startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json((data || []).map((r) => mapAttendanceRow(r as AttendanceRow)));
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const record: AttendanceRecord = await request.json();

  try {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase
      .from('attendance_records')
      .upsert(mapAttendancePayload(record), { onConflict: 'house_help_id,date' });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
