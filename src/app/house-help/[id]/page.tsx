'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { HouseHelp, DayOfWeek, Frequency, DAYS_OF_WEEK, CATEGORIES } from '@/lib/types';
import { fetchHouseHelps, saveHouseHelpApi } from '@/lib/storage';
import { generateId } from '@/lib/utils';

export default function HouseHelpFormPage() {
  const router = useRouter();
  const params = useParams();
  const editId = params.id as string | undefined;
  const isEdit = editId && editId !== 'add';

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [workingDays, setWorkingDays] = useState<DayOfWeek[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
  const [frequency, setFrequency] = useState<Frequency>('once');
  const [rate, setRate] = useState('');
  const [existingCreatedAt, setExistingCreatedAt] = useState<string>('');

  useEffect(() => {
    if (isEdit) {
      fetchHouseHelps().then((helps) => {
        const found = helps.find((h) => h.id === editId);
        if (found) {
          setName(found.name);
          setPhone(found.phone || '');
          setCategory(found.category);
          setWorkingDays(found.workingDays);
          setFrequency(found.frequency);
          setRate(found.rate ? String(found.rate) : '');
          setExistingCreatedAt(found.createdAt);
        }
      });
    }
  }, [isEdit, editId]);

  function toggleDay(day: DayOfWeek) {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const help: HouseHelp = {
      id: isEdit ? editId : generateId(),
      name: name.trim(),
      phone: phone.trim() || undefined,
      category,
      workingDays,
      frequency,
      rate: rate ? Number(rate) : undefined,
      createdAt: isEdit
        ? existingCreatedAt || new Date().toISOString()
        : new Date().toISOString(),
    };

    await saveHouseHelpApi(help);
    router.push('/house-help');
  }

  return (
    <div className="px-4 pt-4">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => router.back()} className="p-1.5 -ml-1.5 text-slate-600 hover:text-slate-900">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-slate-900">
          {isEdit ? 'Edit House Help' : 'Add House Help'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder="Enter name"
            required
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone (optional)</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder="Phone number"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Working Days */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Working Days</label>
          <div className="flex gap-1.5">
            {DAYS_OF_WEEK.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
                  workingDays.includes(day)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Frequency */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Visits per day</label>
          <div className="flex gap-3">
            {(['once', 'twice'] as Frequency[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFrequency(f)}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg border-2 transition-colors ${
                  frequency === f
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                {f === 'once' ? 'Once a day' : 'Twice a day'}
              </button>
            ))}
          </div>
        </div>

        {/* Rate */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Monthly Rate (optional)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
            <input
              type="number"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="w-full pl-7 pr-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="0"
              min="0"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="w-full py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
        >
          {isEdit ? 'Update' : 'Add House Help'}
        </button>
      </form>
    </div>
  );
}
