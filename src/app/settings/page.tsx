'use client';

import { useAuth } from '@/lib/auth';

export default function SettingsPage() {
  const { logout } = useAuth();

  function handleClearData() {
    if (confirm('Clear ALL data? This cannot be undone.')) {
      localStorage.clear();
      window.location.reload();
    }
  }

  return (
    <div className="px-4 pt-4">
      <h1 className="text-lg font-bold text-slate-900 mb-5">Settings</h1>

      <div className="space-y-3">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-slate-900">Account</h3>
            <p className="text-xs text-slate-500 mt-0.5">Logged in as admin</p>
          </div>
          <div className="border-t border-slate-100">
            <button
              onClick={logout}
              className="w-full px-4 py-3 text-left text-sm text-red-600 font-medium hover:bg-red-50 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-slate-900">Data</h3>
            <p className="text-xs text-slate-500 mt-0.5">All data is stored locally in your browser</p>
          </div>
          <div className="border-t border-slate-100">
            <button
              onClick={handleClearData}
              className="w-full px-4 py-3 text-left text-sm text-red-600 font-medium hover:bg-red-50 transition-colors"
            >
              Clear All Data
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-slate-900">About</h3>
          <p className="text-xs text-slate-500 mt-1">House Help Tracker v1.0</p>
          <p className="text-xs text-slate-400 mt-0.5">Track attendance for your house help</p>
        </div>
      </div>
    </div>
  );
}
