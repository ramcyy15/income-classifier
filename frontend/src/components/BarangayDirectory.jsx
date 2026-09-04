import React from 'react';
import { Users, TrendingUp, DollarSign, ShieldCheck, ArrowUpRight, Sparkles, Sliders, ChevronRight } from 'lucide-react';

export default function BarangayDirectory({ barangays, selectedBarangay, onSelectBarangay, onOpenSimulation }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] h-full flex flex-col justify-between overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">District V Barangay Roster</h3>
          <p className="text-xs text-slate-400 font-medium">Ranked by poverty priority & resource vulnerability</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg text-slate-500">
          14 Localities
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {barangays.map((b) => {
          const isSelected = selectedBarangay?.name === b.name;
          const badgeColor = 
            b.community_class === 'priority' ? 'bg-red-50 text-red-600 border-red-100' :
            b.community_class === 'developing' ? 'bg-amber-50 text-amber-600 border-amber-100' :
            'bg-emerald-50 text-emerald-600 border-emerald-100';

          return (
            <div
              key={b.name}
              onClick={() => onSelectBarangay(b)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-50/40 shadow-sm ring-1 ring-indigo-500/20'
                  : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/70'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                  isSelected ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700'
                }`}>
                  #{b.rank}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 leading-tight">
                      {b.name}
                    </h4>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border uppercase ${badgeColor}`}>
                      {b.community_label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 font-medium mt-1">
                    <span>{b.population.toLocaleString()} pop</span>
                    <span>·</span>
                    <span>₱{b.avg_per_capita_income.toLocaleString()} / mo</span>
                    <span>·</span>
                    <span>{b.four_ps_density} 4Ps/1k</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <span className="text-xs font-bold text-slate-800 block">
                    {b.tier_distribution.High_pct}% Self-Sufficient
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {b.tier_distribution.Low_pct}% Survival
                  </span>
                </div>
                <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-indigo-600' : 'text-slate-300'}`} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
