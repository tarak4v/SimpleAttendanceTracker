import { NextRequest, NextResponse } from 'next/server';
import { HouseHelp } from '@/lib/types';
import { getSupabaseAdminClient } from '@/lib/supabase';

type HouseHelpRow = {
  id: string;
  name: string;
  phone: string | null;
  category: string;
  working_days: string[];
  frequency: 'once' | 'twice';
  rate: number | null;
  created_at: string;
};

function mapHouseHelpRow(row: HouseHelpRow): HouseHelp {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone || undefined,
    category: row.category,
    workingDays: row.working_days as HouseHelp['workingDays'],
    frequency: row.frequency,
    rate: row.rate ?? undefined,
    createdAt: row.created_at,
  };
}

function mapHouseHelpPayload(help: HouseHelp): Omit<HouseHelpRow, 'created_at'> & { created_at: string } {
  return {
    id: help.id,
    name: help.name,
    phone: help.phone || null,
    category: help.category,
    working_days: help.workingDays,
    frequency: help.frequency,
    rate: help.rate ?? null,
    created_at: help.createdAt,
  };
}

export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from('house_helps')
      .select('id,name,phone,category,working_days,frequency,rate,created_at')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json((data || []).map((r) => mapHouseHelpRow(r as HouseHelpRow)));
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body: { action: string; data: HouseHelp; id?: string } = await request.json();
  try {
    const supabase = getSupabaseAdminClient();

    if (body.action === 'save') {
      const { error } = await supabase
        .from('house_helps')
        .upsert(mapHouseHelpPayload(body.data), { onConflict: 'id' });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true });
    }

    if (body.action === 'delete' && body.id) {
      // Delete attendance rows explicitly; schema can also enforce ON DELETE CASCADE.
      const attendanceDelete = await supabase
        .from('attendance_records')
        .delete()
        .eq('house_help_id', body.id);

      if (attendanceDelete.error) {
        return NextResponse.json({ error: attendanceDelete.error.message }, { status: 500 });
      }

      const { error } = await supabase
        .from('house_helps')
        .delete()
        .eq('id', body.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
