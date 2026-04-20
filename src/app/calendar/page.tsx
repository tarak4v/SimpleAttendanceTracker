'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { HouseHelp, AttendanceRecord, AttendanceStatus, STATUS_LABELS, STATUS_COLORS } from '@/lib/types';
import { getHouseHelps, getAllAttendanceForDateRange, getAttendanceForDate, saveAttendance } from '@/lib/storage';
import { formatDate, getMonthDays, getWeekDays, getMonthName, getDayOfWeek, todayStr, parseDate, generateId } from '@/lib/utils';

type ViewMode = 'weekly' | 'monthly';

const STATUS_OPTIONS: AttendanceStatus[] = ['present', 'absent', 'leave', 'holiday', 'halfday'];

const STATUS_CAL_CLASSES: Record<AttendanceStatus, string> = {
  present: 'cal-present',
  absent: 'cal-absent',
  leave: 'cal-leave',
  holiday: 'cal-holiday',
  halfday: 'cal-halfday',
};

const STATUS_PILL_STYLES: Record<AttendanceStatus, string> = {
  present: 'bg-emerald-500 text-white',
  absent: 'bg-red-500 text-white',
  leave: 'bg-amber-500 text-white',
  holiday: 'bg-blue-500 text-white',
  halfday: 'bg-orange-400 text-white',
};

const STATUS_OUTLINE_STYLES: Record<AttendanceStatus, string> = {
  present: 'border-emerald-300 text-emerald-700 hover:bg-emerald-50',
  absent: 'border-red-300 text-red-700 hover:bg-red-50',
  leave: 'border-amber-300 text-amber-700 hover:bg-amber-50',
  holiday: 'border-blue-300 text-blue-700 hover:bg-blue-50',
  halfday: 'border-orange-300 text-orange-700 hover:bg-orange-50',
};

export default function CalendarPage() {
  const [helps, setHelps] = useState<HouseHelp[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [view, setView] = useState<ViewMode>('monthly');
  const [selectedHelpId, setSelectedHelpId] = useState<string>('all');
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [editingHelpId, setEditingHelpId] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const days = useMemo(() => {
    if (view === 'monthly') {
      return getMonthDays(year, month);
    }
    return getWeekDays(formatDate(currentDate));
  }, [view, year, month, currentDate]);

  const startDate = days[0];
  const endDate = days[days.length - 1];

  useEffect(() => {
    setHelps(getHouseHelps());
  }, []);

  const loadRecords = useCallback(() => {
    if (startDate && endDate) {
      setRecords(getAllAttendanceForDateRange(startDate, endDate));
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // Build a map: date -> houseHelpId -> record
  const recordMap = useMemo(() => {
    const map = new Map<string, Map<string, AttendanceRecord>>();
    records.forEach((r) => {
      if (!map.has(r.date)) map.set(r.date, new Map());
      map.get(r.date)!.set(r.houseHelpId, r);
    });
    return map;
  }, [records]);

  const filteredHelps = selectedHelpId === 'all' ? helps : helps.filter((h) => h.id === selectedHelpId);

  function navigate(dir: -1 | 1) {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (view === 'monthly') {
        d.setMonth(d.getMonth() + dir);
      } else {
        d.setDate(d.getDate() + dir * 7);
      }
      return d;
    });
    setSelectedDay(null);
    setEditingHelpId(null);
  }

  function goToToday() {
    setCurrentDate(new Date());
    setSelectedDay(todayStr());
  }

  function navigateSelectedDay(dir: -1 | 1) {
    if (!selectedDay) return;
    const d = parseDate(selectedDay);
    d.setDate(d.getDate() + dir);
    const newDate = formatDate(d);
    // If navigating out of current view range, shift the view too
    if (newDate < startDate || newDate > endDate) {
      setCurrentDate(d);
    }
    setSelectedDay(newDate);
    setEditingHelpId(null);
  }

  // Get dominant status for a day across selected helps
  function getDayStatus(date: string): AttendanceStatus | null {
    const dayRecords = recordMap.get(date);
    if (!dayRecords) return null;

    if (selectedHelpId !== 'all') {
      return dayRecords.get(selectedHelpId)?.status || null;
    }

    const statuses: AttendanceStatus[] = [];
    filteredHelps.forEach((h) => {
      const r = dayRecords.get(h.id);
      if (r) statuses.push(r.status);
    });

    if (statuses.length === 0) return null;
    const counts = new Map<AttendanceStatus, number>();
    statuses.forEach((s) => counts.set(s, (counts.get(s) || 0) + 1));
    let max: AttendanceStatus = statuses[0];
    let maxCount = 0;
    counts.forEach((count, status) => {
      if (count > maxCount) { max = status; maxCount = count; }
    });
    return max;
  }

  // Get scheduled helps for a particular day
  function getScheduledHelpsForDay(date: string) {
    const dayOfWeek = getDayOfWeek(date);
    return filteredHelps.filter((h) => h.workingDays.includes(dayOfWeek));
  }

  function handleStatusChange(helpId: string, date: string, status: AttendanceStatus) {
    const dayRecords = recordMap.get(date);
    const existing = dayRecords?.get(helpId);
    const record: AttendanceRecord = {
      id: existing?.id || generateId(),
      houseHelpId: helpId,
      date,
      status,
      comment: existing?.comment,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveAttendance(record);
    loadRecords();
  }

  const today = todayStr();

  // For monthly view, compute the padding for the first day
  const firstDayOfMonth = view === 'monthly' ? parseDate(days[0]).getDay() : 0;
  const paddingDays = view === 'monthly' ? ((firstDayOfMonth + 6) % 7) : 0;

  const title = view === 'monthly'
    ? `${getMonthName(month)} ${year}`
    : `Week of ${new Date(days[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  // Helpers for selected day panel
  const scheduledForSelectedDay = selectedDay ? getScheduledHelpsForDay(selectedDay) : [];
  const selectedDayRecords = selectedDay ? recordMap.get(selectedDay) : undefined;

  // Summary stats for the period
  const summaryStats = useMemo(() => {
    const stats = { present: 0, absent: 0, leave: 0, holiday: 0, halfday: 0, unmarked: 0 };
    days.forEach((date) => {
      filteredHelps.forEach((h) => {
        if (!h.workingDays.includes(getDayOfWeek(date))) return;
        const dayRecords = recordMap.get(date);
        const r = dayRecords?.get(h.id);
        if (r) {
          stats[r.status]++;
        } else {
          stats.unmarked++;
        }
      });
    });
    return stats;
  }, [days, filteredHelps, recordMap]);

  return (
    <div className="px-4 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-slate-900">Calendar</h1>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={() => setView('weekly')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              view === 'weekly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setView('monthly')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              view === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            Month
          </button>
        </div>
      </div>

      {/* House help filter */}
      <select
        value={selectedHelpId}
        onChange={(e) => { setSelectedHelpId(e.target.value); setSelectedDay(null); setEditingHelpId(null); }}
        className="w-full px-3 py-2 mb-4 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
      >
        <option value="all">All House Help (Combined)</option>
        {helps.map((h) => (
          <option key={h.id} value={h.id}>{h.name} — {h.category}</option>
        ))}
      </select>

      {/* Month/Week Navigation */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => navigate(-1)} className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <button onClick={goToToday} className="text-sm font-semibold text-slate-900 hover:text-indigo-600">
          {title}
        </button>
        <button onClick={() => navigate(1)} className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-medium text-slate-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {view === 'monthly' &&
          Array.from({ length: paddingDays }).map((_, i) => (
            <div key={`pad-${i}`} className="aspect-square" />
          ))}

        {days.map((date) => {
          const status = getDayStatus(date);
          const isToday = date === today;
          const isSelected = date === selectedDay;
          const dayNum = parseDate(date).getDate();

          return (
            <button
              key={date}
              onClick={() => { setSelectedDay(isSelected ? null : date); setEditingHelpId(null); }}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-all relative ${
                status ? STATUS_CAL_CLASSES[status] : 'bg-slate-50 text-slate-400'
              } ${isToday ? 'ring-2 ring-indigo-500 ring-offset-1' : ''} ${
                isSelected ? 'ring-2 ring-slate-900 ring-offset-1' : ''
              }`}
            >
              <span className="font-medium">{dayNum}</span>
              {status && view === 'monthly' && (
                <span className="text-[7px] mt-0.5 opacity-80">{STATUS_LABELS[status].slice(0, 3)}</span>
              )}
              {status && view === 'weekly' && (
                <span className="text-[8px] mt-0.5 opacity-80">{STATUS_LABELS[status]}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-4 justify-center">
        {(Object.keys(STATUS_LABELS) as AttendanceStatus[]).map((status) => (
          <div key={status} className="flex items-center gap-1">
            <span className={`w-2.5 h-2.5 rounded-sm ${STATUS_COLORS[status]}`} />
            <span className="text-[10px] text-slate-500">{STATUS_LABELS[status]}</span>
          </div>
        ))}
      </div>

      {/* Selected day detail with attendance editing */}
      {selectedDay && (
        <div className="mt-4 bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Day navigation header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
            <button
              onClick={() => navigateSelectedDay(-1)}
              className="p-1 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-200"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <h3 className="text-sm font-semibold text-slate-900">
              {parseDate(selectedDay).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </h3>
            <button
              onClick={() => navigateSelectedDay(1)}
              className="p-1 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-200"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>

          <div className="p-4">
            {scheduledForSelectedDay.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-2">No house help scheduled for this day</p>
            ) : (
              <div className="space-y-3">
                {scheduledForSelectedDay.map((help) => {
                  const record = selectedDayRecords?.get(help.id);
                  const isEditing = editingHelpId === help.id;

                  return (
                    <div key={help.id} className="border border-slate-100 rounded-lg overflow-hidden">
                      <div
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 active:bg-slate-100"
                        onClick={() => setEditingHelpId(isEditing ? null : help.id)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium text-slate-900 truncate">{help.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-medium shrink-0">
                            {help.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {record ? (
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full text-white ${STATUS_COLORS[record.status]}`}>
                              {STATUS_LABELS[record.status]}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Not marked</span>
                          )}
                          <svg
                            className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isEditing ? 'rotate-180' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                          </svg>
                        </div>
                      </div>

                      {isEditing && (
                        <div className="px-3 pb-3 border-t border-slate-100">
                          <div className="pt-2 flex flex-wrap gap-1.5">
                            {STATUS_OPTIONS.map((status) => {
                              const isActive = record?.status === status;
                              return (
                                <button
                                  key={status}
                                  onClick={() => handleStatusChange(help.id, selectedDay, status)}
                                  className={`px-2.5 py-1 text-[11px] font-medium rounded-full border transition-all ${
                                    isActive
                                      ? STATUS_PILL_STYLES[status]
                                      : STATUS_OUTLINE_STYLES[status]
                                  }`}
                                >
                                  {STATUS_LABELS[status]}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Period summary */}
      <div className="mt-4 bg-white rounded-xl border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">
          {view === 'monthly' ? 'Monthly' : 'Weekly'} Summary
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {([
            { key: 'present', color: 'bg-emerald-100 text-emerald-700' },
            { key: 'absent', color: 'bg-red-100 text-red-700' },
            { key: 'leave', color: 'bg-amber-100 text-amber-700' },
            { key: 'holiday', color: 'bg-blue-100 text-blue-700' },
            { key: 'halfday', color: 'bg-orange-100 text-orange-700' },
            { key: 'unmarked', color: 'bg-slate-100 text-slate-500' },
          ] as const).map(({ key, color }) => (
            <div key={key} className={`rounded-lg p-2 text-center ${color}`}>
              <div className="text-lg font-bold">{summaryStats[key]}</div>
              <div className="text-[10px] font-medium capitalize">{key}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
