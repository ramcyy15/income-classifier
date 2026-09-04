import React from 'react';
import { Sparkles, ArrowUpRight, TrendingUp, Users, BookOpen, AlertCircle, ChevronRight } from 'lucide-react';

export default function BarangayProfile({ barangay, onOpenSimulation, onOpenBrief }) {
  if (!barangay) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col items-center justify-center text-center h-full min-h-[480px]">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-3">
          <Users className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Select a Barangay</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
          Click any pin on the map or select from the dropdown above to inspect income tiers, SHAP drivers, and policy interventions.
        </p>
      </div>
    );
  }

  const {
    name,
    community_label,
    community_class,
    rank,
    total_ranks,
    population,
    families_surveyed,
    avg_per_capita_income,
    tier_distribution,
    top_drivers,
    four_ps_density,
    transition_rate_pct,
    active_4ps_share,
  } = barangay;

  const badgeColor = 
    community_class === 'priority' ? 'bg-red-50 text-red-700 border-red-200' :
    community_class === 'developing' ? 'bg-amber-50 text-amber-700 border-amber-200' :
    'bg-emerald-50 text-emerald-700 border-emerald-200';

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between h-full space-y-5">
      {/* Header section with Rank badge */}
      <div>
        <div className="flex items-start justify-between">
          <div>
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badgeColor} uppercase tracking-wider inline-block mb-1.5`}>
              {community_label}
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {name}
            </h2>
          </div>
          <div className="text-right">
            <span className="text-3xl font-black text-slate-900 font-display">
              #{rank}
            </span>
            <span className="text-[10px] font-bold text-slate-400 block -mt-1">
              of {total_ranks} in District V
            </span>
          </div>
        </div>

        {/* Highlight Stats Row */}
        <div className="grid grid-cols-3 gap-3 mt-4 p-3 bg-slate-50/70 rounded-xl border border-slate-100">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Population</span>
            <span className="text-sm font-bold text-slate-800">{population.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Income/mo</span>
            <span className="text-sm font-bold text-slate-800">₱{avg_per_capita_income.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">4Ps Pocket</span>
            <span className="text-sm font-bold text-slate-800">{four_ps_density}/1k pop</span>
          </div>
        </div>
      </div>

      {/* Progress Bars (Matching right panel of reference image) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-700">Income Class Breakdown</span>
          <span className="text-[11px] text-slate-400 font-medium">{families_surveyed} Surveyed</span>
        </div>

        <div className="space-y-2.5">
          {/* High Income */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Self-Sufficient (High)
              </span>
              <span className="font-bold text-slate-800">{tier_distribution.High_pct}%</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                style={{ width: `${tier_distribution.High_pct}%` }} 
              />
            </div>
          </div>

          {/* Middle Income */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span> Subsistence (Middle)
              </span>
              <span className="font-bold text-slate-800">{tier_distribution.Middle_pct}%</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-slate-400 rounded-full transition-all duration-500" 
                style={{ width: `${tier_distribution.Middle_pct}%` }} 
              />
            </div>
          </div>

          {/* Low Income */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span> Survival (Low)
              </span>
              <span className="font-bold text-slate-800">{tier_distribution.Low_pct}%</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-amber-500 rounded-full transition-all duration-500" 
                style={{ width: `${tier_distribution.Low_pct}%` }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Top SHAP Drivers */}
      {top_drivers && top_drivers.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700">Top Decision Drivers (SHAP)</span>
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Impact Share</span>
          </div>

          <div className="space-y-2">
            {top_drivers.slice(0, 3).map((driver, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="text-slate-600 truncate max-w-[170px]">{driver.label}</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-600 rounded-full" 
                      style={{ width: `${driver.share_pct}%` }} 
                    />
                  </div>
                  <span className="font-bold text-slate-800 w-7 text-right text-[11px]">{driver.share_pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="pt-2 flex items-center gap-2">
        <button
          onClick={onOpenSimulation}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-600/15 transition-all active:scale-98 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Simulate What-If</span>
        </button>

        <button
          onClick={onOpenBrief}
          className="flex items-center justify-center gap-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all cursor-pointer"
          title="View Policy Brief"
        >
          <span>Policy Brief</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>
    </div>
  );
}
