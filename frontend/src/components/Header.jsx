import React from 'react';
import { Search, SlidersHorizontal, Plus, Download, Sparkles } from 'lucide-react';

export default function Header({ 
  searchQuery, 
  setSearchQuery, 
  barangays, 
  selectedBarangay, 
  onSelectBarangay,
  onOpenSimulation
}) {
  return (
    <header className="h-20 bg-white/70 backdrop-blur-md border-b border-slate-100 px-8 flex items-center justify-between sticky top-0 z-20">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            District V Demographics & Income Report
          </h1>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider">
            Live Intelligence
          </span>
        </div>
        <p className="text-xs text-slate-400 font-medium">
          Quezon City · 14 Novaliches Barangays · Stacking Ensemble (RF + XGBoost → LogReg)
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search barangay..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all w-52"
          />
        </div>

        {/* Quick Select */}
        <select
          value={selectedBarangay?.name || ''}
          onChange={(e) => {
            const b = barangays.find(item => item.name === e.target.value);
            if (b) onSelectBarangay(b);
          }}
          className="py-2 px-3 bg-white border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
        >
          <option value="">All 14 Barangays</option>
          {barangays.map(b => (
            <option key={b.name} value={b.name}>
              {b.name} ({b.community_label})
            </option>
          ))}
        </select>

        {/* Action Button: Run Simulation */}
        <button
          onClick={onOpenSimulation}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-600/20 active:scale-98 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Simulate Policy</span>
        </button>
      </div>
    </header>
  );
}
