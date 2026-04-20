'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { HouseHelp } from '@/lib/types';
import { getHouseHelps, deleteHouseHelp } from '@/lib/storage';

export default function HouseHelpListPage() {
  const [helps, setHelps] = useState<HouseHelp[]>([]);

  useEffect(() => {
    setHelps(getHouseHelps());
  }, []);

  function handleDelete(id: string, name: string) {
    if (confirm(`Delete ${name}? This will also remove all attendance records.`)) {
      deleteHouseHelp(id);
      setHelps(getHouseHelps());
    }
  }

  return (
    <div className="px-4 pt-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-slate-900">House Help</h1>
        <Link
          href="/house-help/add"
          className="inline-flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add
        </Link>
      </div>

      {helps.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <p className="text-slate-500 text-sm">No house help added yet</p>
          <Link href="/house-help/add" className="text-indigo-600 text-sm font-medium mt-2 inline-block">
            + Add your first house help
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {helps.map((h) => (
            <div key={h.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 truncate">{h.name}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {h.category} · {h.frequency === 'once' ? 'Once' : 'Twice'}/day
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {h.workingDays.map((d) => (
                      <span key={d} className="text-[10px] font-medium px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded">
                        {d}
                      </span>
                    ))}
                  </div>
                  {h.phone && (
                    <p className="text-xs text-slate-400 mt-1.5">📞 {h.phone}</p>
                  )}
                  {h.rate !== undefined && h.rate > 0 && (
                    <p className="text-xs text-slate-400">₹{h.rate}/month</p>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <Link
                    href={`/house-help/${h.id}`}
                    className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </Link>
                  <button
                    onClick={() => handleDelete(h.id, h.name)}
                    className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
