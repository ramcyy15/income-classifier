import React, { useState } from 'react';
import { Users, BarChart2, PieChart, Cpu } from 'lucide-react';
import { PredictedVsActualChart, ShapDriversChart, IncomeDonutChart } from './AnalyticsCharts';

const TABS = [
  { id: 'profile',   label: 'Profile',   icon: Users },
  { id: 'accuracy',  label: 'Accuracy',  icon: BarChart2 },
  { id: 'drivers',   label: 'Drivers',   icon: Cpu },
  { id: 'dist',      label: 'Dist.',     icon: PieChart },
];

export default function BarangayProfile({ barangay, onOpenSimulation, onOpenBrief }) {
  const [tab, setTab] = useState('profile');

  if (!barangay) {
    return (
      <div className="bg-white rounded-2xl px-4 pt-4 pb-3 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col items-center justify-center text-center h-full">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-2">
          <Users className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-bold text-slate-800">Select a Barangay</h3>
        <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
          Click a pin on the map or pick from the roster to view income tiers, model accuracy, and SHAP drivers.
        </p>
      </div>
    );
  }

  const {
    name, community_label, community_class, rank, total_ranks,
    population, families_surveyed, avg_per_capita_income,
    tier_distribution, actual_distribution, top_drivers, four_ps_density,
  } = barangay;

  const badgeColor =
    community_class === 'priority'   ? 'bg-red-50 text-red-700 border-red-200' :
    community_class === 'developing' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                       'bg-emerald-50 text-emerald-700 border-emerald-200';

  return (
    <div className="bg-white rounded-2xl px-4 pt-4 pb-3 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col h-full">

      {/* ── Top: Name + Rank (always visible) ── */}
      <div className="flex items-start justify-between mb-3 flex-shrink-0">
        <div>
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${badgeColor} uppercase tracking-wider inline-block mb-1`}>
            {community_label}
          </span>
          <h2 className="text-base font-extrabold text-slate-900 leading-tight">{name}</h2>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-slate-900">#{rank}</span>
          <span className="text-[10px] font-bold text-slate-400 block -mt-0.5">of {total_ranks}</span>
        </div>
      </div>

      {/* ── Tab Switcher ── */}
      <div className="flex gap-1 mb-3 bg-slate-50 p-1 rounded-xl flex-shrink-0">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
              tab === id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab Content (scrollable) ── */}
      <div className="flex-1 min-h-0 overflow-y-auto">

        {/* TAB: Profile */}
        {tab === 'profile' && (
          <div className="flex flex-col justify-between h-full gap-3">
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50/70 rounded-xl border border-slate-100">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Pop.</span>
                <span className="text-xs font-bold text-slate-800">{population.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Income/mo</span>
                <span className="text-xs font-bold text-slate-800">₱{avg_per_capita_income.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">4Ps/1k</span>
                <span className="text-xs font-bold text-slate-800">{four_ps_density}</span>
              </div>
            </div>

            {/* Income Bars */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-slate-700">Income Class Breakdown</span>
                <span className="text-[10px] text-slate-400">{families_surveyed} surveyed</span>
              </div>
              <div className="space-y-1.5">
                {[
                  { label: 'SWDI Level 3 · Self-Sufficient', pct: tier_distribution?.High_pct,   color: 'bg-emerald-500' },
                  { label: 'SWDI Level 2 · Subsistence',    pct: tier_distribution?.Middle_pct, color: 'bg-yellow-500' },
                  { label: 'SWDI Level 1 · Survival',       pct: tier_distribution?.Low_pct,    color: 'bg-red-500' },
                ].map(({ label, pct, color }) => (
                  <div key={label}>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-slate-500 font-medium">{label}</span>
                      <span className="font-bold text-slate-800">{pct}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SHAP Drivers mini */}
            {top_drivers?.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-slate-700">Top Decision Drivers</span>
                  <button onClick={() => setTab('drivers')} className="text-[10px] text-indigo-600 font-semibold hover:underline cursor-pointer">
                    See chart →
                  </button>
                </div>
                <div className="space-y-1">
                  {top_drivers.slice(0, 3).map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-500 truncate max-w-[160px]">{d.label}</span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${d.share_pct}%` }} />
                        </div>
                        <span className="font-bold text-slate-700 w-6 text-right">{d.share_pct}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: Model Accuracy (Predicted vs Actual) */}
        {tab === 'accuracy' && (
          <div className="flex flex-col h-full">
            <PredictedVsActualChart
              tierDistribution={tier_distribution}
              actualDistribution={actual_distribution}
            />
          </div>
        )}

        {/* TAB: SHAP Drivers */}
        {tab === 'drivers' && (
          <div className="flex flex-col h-full">
            <ShapDriversChart topDrivers={top_drivers} />
          </div>
        )}

        {/* TAB: Income Distribution Donut */}
        {tab === 'dist' && (
          <div className="flex flex-col h-full">
            <IncomeDonutChart
              tierDistribution={tier_distribution}
              actualDistribution={actual_distribution}
              familiesSurveyed={families_surveyed}
            />
          </div>
        )}
      </div>
    </div>
  );
}
