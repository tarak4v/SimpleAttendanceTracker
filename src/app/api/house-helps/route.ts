import { NextRequest, NextResponse } from 'next/server';
import { readHouseHelps, writeHouseHelps } from '@/lib/csv';
import { HouseHelp } from '@/lib/types';

export async function GET() {
  const helps = readHouseHelps();
  return NextResponse.json(helps);
}

export async function POST(request: NextRequest) {
  const body: { action: string; data: HouseHelp; id?: string } = await request.json();

  const all = readHouseHelps();

  if (body.action === 'save') {
    const idx = all.findIndex((h) => h.id === body.data.id);
    if (idx >= 0) {
      all[idx] = body.data;
    } else {
      all.push(body.data);
    }
    writeHouseHelps(all);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'delete' && body.id) {
    const filtered = all.filter((h) => h.id !== body.id);
    writeHouseHelps(filtered);
    // Also remove attendance for this house help
    const { readAttendance, writeAttendance } = await import('@/lib/csv');
    const records = readAttendance().filter((r) => r.houseHelpId !== body.id);
    writeAttendance(records);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
