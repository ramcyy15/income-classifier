import React, { useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import BotInfoModal from './BotInfoModal';
import kalingaLogo from '../assets/KalingaBot AI.png';

export default function Header({ 
  searchQuery, 
  setSearchQuery, 
  barangays, 
  selectedBarangay, 
  onSelectBarangay
}) {
  const [botModalOpen, setBotModalOpen] = useState(false);

  return (
    <>
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
            Stacking Ensemble (RF + XGBoost → LogReg)
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* KalingaBot Badge Button */}
          <button
            onClick={() => setBotModalOpen(true)}
            className="flex items-center gap-2 py-1.5 px-3 bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100/80 hover:to-purple-100/80 border border-indigo-100/80 rounded-xl transition-all shadow-xs group cursor-pointer"
            title="Learn about KalingaBot AI"
          >
            <div className="w-6 h-6 rounded-lg bg-white p-0.5 border border-indigo-100 flex items-center justify-center flex-shrink-0">
              <img
                src={kalingaLogo}
                alt="KalingaBot AI"
                className="w-full h-full object-contain rounded"
              />
            </div>
            <div className="text-left leading-tight hidden sm:block">
              <p className="text-[11px] font-bold text-indigo-900 flex items-center gap-1">
                KalingaBot <Sparkles className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
              </p>
              <p className="text-[9px] text-indigo-500 font-medium">Who is he?</p>
            </div>
          </button>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search barangay..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all w-48"
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
        </div>
      </header>

      {/* Pop-up Bot Information Modal */}
      <BotInfoModal
        isOpen={botModalOpen}
        onClose={() => setBotModalOpen(false)}
      />
    </>
  );
}
