'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { HouseHelp, AttendanceRecord, AttendanceStatus, STATUS_LABELS, STATUS_COLORS } from '@/lib/types';
import { fetchHouseHelps, fetchAttendanceForDateRange } from '@/lib/storage';
import { todayStr, getDayOfWeek, getMonthDays, getMonthName, formatDate } from '@/lib/utils';

export default function DashboardPage() {
  const [helps, setHelps] = useState<HouseHelp[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const monthDays = useMemo(() => getMonthDays(year, month), [year, month]);
  const todayDate = todayStr();

  const loadData = useCallback(async () => {
    const [h, r] = await Promise.all([
      fetchHouseHelps(),
      fetchAttendanceForDateRange(monthDays[0], monthDays[monthDays.length - 1]),
    ]);
    setHelps(h);
    setRecords(r);
  }, [monthDays]);

  useEffect(() => {
    loadData();
    window.addEventListener('focus', loadData);
    return () => window.removeEventListener('focus', loadData);
  }, [loadData]);

  // Build per-help stats for the current month
  const helpStats = useMemo(() => {
    const recordMap = new Map<string, Map<string, AttendanceRecord>>();
    records.forEach((r) => {
      if (!recordMap.has(r.houseHelpId)) recordMap.set(r.houseHelpId, new Map());
      recordMap.get(r.houseHelpId)!.set(r.date, r);
    });

    return helps.map((help) => {
      const helpRecords = recordMap.get(help.id) || new Map<string, AttendanceRecord>();
      // Only count days up to today
      const workingDays = monthDays.filter(
        (d) => d <= todayDate && help.workingDays.includes(getDayOfWeek(d))
      );
      const totalDays = workingDays.length;

      const statusCounts: Record<AttendanceStatus, number> = {
        present: 0, absent: 0, leave: 0, holiday: 0, halfday: 0,
      };
      let marked = 0;

      workingDays.forEach((d) => {
        const r = helpRecords.get(d);
        if (r) {
          statusCounts[r.status]++;
          marked++;
        }
      });

      return {
        help,
        totalDays,
        marked,
        statusCounts,
        presentDays: statusCounts.present + statusCounts.halfday * 0.5,
      };
    });
  }, [helps, records, monthDays, todayDate]);

  // Overall stats
  const overallStats = useMemo(() => {
    const stats = { present: 0, absent: 0, leave: 0, holiday: 0, halfday: 0, unmarked: 0, total: 0 };
    helpStats.forEach((hs) => {
      stats.total += hs.totalDays;
      stats.present += hs.statusCounts.present;
      stats.absent += hs.statusCounts.absent;
      stats.leave += hs.statusCounts.leave;
      stats.holiday += hs.statusCounts.holiday;
      stats.halfday += hs.statusCounts.halfday;
      stats.unmarked += hs.totalDays - hs.marked;
    });
    return stats;
  }, [helpStats]);

  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  const dateDisplay = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // Today's scheduled helps
  const todayDow = getDayOfWeek(todayDate);
  const todayHelps = helps.filter((h) => h.workingDays.includes(todayDow));
  const todayRecordMap = new Map<string, AttendanceRecord>();
  records.forEach((r) => {
    if (r.date === todayDate) todayRecordMap.set(r.houseHelpId, r);
  });
  const todayMarked = todayHelps.filter((h) => todayRecordMap.has(h.id)).length;

  return (
    <div className="px-4 pt-4">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-lg font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">{dayName}, {dateDisplay}</p>
      </div>

      {helps.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
            </svg>
          </div>
          <p className="text-slate-500 text-sm">Get started by adding house help</p>
          <Link href="/house-help/add" className="text-indigo-600 text-sm font-medium mt-2 inline-block">
            + Add House Help
          </Link>
        </div>
      ) : (
        <>
          {/* Today quick status */}
          <Link href="/calendar" className="block bg-white rounded-xl border border-slate-200 p-4 mb-4 active:bg-slate-50">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-slate-900">Today&apos;s Attendance</h2>
              <span className="text-xs text-indigo-600 font-medium">Mark →</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-indigo-500 h-2 rounded-full transition-all"
                      style={{ width: todayHelps.length > 0 ? `${(todayMarked / todayHelps.length) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 font-medium">{todayMarked}/{todayHelps.length}</span>
                </div>
                <p className="text-xs text-slate-400">
                  {todayHelps.length === 0
                    ? 'No one scheduled today'
                    : todayMarked === todayHelps.length
                      ? 'All marked ✓'
                      : `${todayHelps.length - todayMarked} remaining`}
                </p>
              </div>
            </div>
          </Link>

          {/* Monthly summary heading */}
          <h2 className="text-sm font-semibold text-slate-900 mb-3">
            {getMonthName(month)} {year} — Summary
          </h2>

          {/* Overall stats row */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {([
              { label: 'Present', value: overallStats.present, color: 'bg-emerald-100 text-emerald-700' },
              { label: 'Absent', value: overallStats.absent, color: 'bg-red-100 text-red-700' },
              { label: 'Leave', value: overallStats.leave, color: 'bg-amber-100 text-amber-700' },
            ]).map(({ label, value, color }) => (
              <div key={label} className={`rounded-lg p-2.5 text-center ${color}`}>
                <div className="text-xl font-bold">{value}</div>
                <div className="text-[10px] font-medium">{label}</div>
              </div>
            ))}
          </div>

          {/* Per house help cards */}
          <div className="space-y-3">
            {helpStats.map(({ help, totalDays, statusCounts, presentDays }) => {
              const pct = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

              return (
                <div key={help.id} className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900 truncate">{help.name}</h3>
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-medium shrink-0">
                        {help.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {help.phone && (
                        <a
                          href={`https://wa.me/${help.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-green-500 hover:text-green-700 rounded hover:bg-green-50 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                        </a>
                      )}
                      <span className={`text-sm font-bold ${pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                        {pct}%
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden flex">
                      {totalDays > 0 && (
                        <>
                          <div className="bg-emerald-500 h-2" style={{ width: `${(statusCounts.present / totalDays) * 100}%` }} />
                          <div className="bg-orange-400 h-2" style={{ width: `${(statusCounts.halfday / totalDays) * 100}%` }} />
                          <div className="bg-amber-400 h-2" style={{ width: `${(statusCounts.leave / totalDays) * 100}%` }} />
                          <div className="bg-blue-400 h-2" style={{ width: `${(statusCounts.holiday / totalDays) * 100}%` }} />
                          <div className="bg-red-400 h-2" style={{ width: `${(statusCounts.absent / totalDays) * 100}%` }} />
                        </>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
                      {statusCounts.present}/{totalDays}
                    </span>
                  </div>

                  {/* Breakdown pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.keys(statusCounts) as AttendanceStatus[]).map((status) => {
                      const count = statusCounts[status];
                      if (count === 0) return null;
                      return (
                        <span key={status} className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white ${STATUS_COLORS[status]}`}>
                          {STATUS_LABELS[status]} {count}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
