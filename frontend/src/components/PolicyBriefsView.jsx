import React, { useState } from 'react';
import { FileText, Building2, Sparkles, CheckCircle2, ChevronRight, ShieldAlert } from 'lucide-react';

export default function PolicyBriefsView({ barangays, selectedBarangay, onSelectBarangay, onOpenSimulation }) {
  const activeBrgy = selectedBarangay || barangays[0];
  const brief = activeBrgy?.policy_brief || {};
  const programs = brief.programs || [];
  const suggestions = brief.slider_suggestion || {};

  return (
    <div className="space-y-6">
      {/* Top Banner with Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
            <h2 className="text-lg font-bold text-slate-900">Government Policy Briefs & AI Recommendations</h2>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            Evidence-based policy synthesis combining 4Ps graduation data, household demographics, and poverty rankings.
          </p>
        </div>

        {/* Barangay select */}
        <select
          value={activeBrgy?.name || ''}
          onChange={(e) => {
            const match = barangays.find(b => b.name === e.target.value);
            if (match) onSelectBarangay(match);
          }}
          className="py-2 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          {barangays.map(b => (
            <option key={b.name} value={b.name}>
              {b.name} ({b.community_label})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Executive Synthesis and Suggested Resource Allocation */}
        <div className="lg:col-span-5 space-y-6">
          {/* Executive Summary Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border ${
                activeBrgy?.community_class === 'priority' ? 'bg-red-50 text-red-600 border-red-100' :
                activeBrgy?.community_class === 'developing' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                'bg-emerald-50 text-emerald-600 border-emerald-100'
              }`}>
                {activeBrgy?.community_label}
              </span>
              <h3 className="text-sm font-bold text-slate-900">{activeBrgy?.name} Synthesis</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {brief.summary || 'No policy brief found. Run python build_briefs.py to generate brief summaries.'}
            </p>

            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">4Ps Density</span>
                <span className="font-bold text-slate-800">{activeBrgy?.four_ps_density} per 1k</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Active Beneficiaries</span>
                <span className="font-bold text-slate-800">{activeBrgy?.active_4ps_share}%</span>
              </div>
            </div>
          </div>

          {/* Allocation Box */}
          {suggestions.financial !== undefined && (
            <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-3">
              <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                Recommended Resource Allocation Mix
              </span>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
                  <span className="text-[10px] font-semibold text-slate-400 block">Financial</span>
                  <span className="text-base font-black text-indigo-600">{suggestions.financial}%</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
                  <span className="text-[10px] font-semibold text-slate-400 block">Education</span>
                  <span className="text-base font-black text-indigo-600">{suggestions.education}%</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
                  <span className="text-[10px] font-semibold text-slate-400 block">Livelihood</span>
                  <span className="text-base font-black text-indigo-600">{suggestions.livelihood}%</span>
                </div>
              </div>
              <p className="text-xs text-slate-600 italic leading-normal">
                "{suggestions.reasoning}"
              </p>

              <button
                onClick={onOpenSimulation}
                className="w-full mt-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Simulate This Allocation</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Targeted Programs List */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900">Recommended Agency Programs</h3>
            <span className="text-xs font-semibold px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-md text-slate-500">
              {programs.length} Interventions
            </span>
          </div>

          <div className="space-y-3.5">
            {programs.map((p, idx) => {
              const isHigh = p.priority === 'High';
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border transition-all ${
                    isHigh ? 'border-indigo-100 bg-indigo-50/20' : 'border-slate-100 bg-white hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <h4 className="text-sm font-bold text-slate-900">
                      {p.name}
                    </h4>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                      isHigh ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                    }`}>
                      {p.priority} Priority
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase mb-2">
                    <Building2 className="w-3 h-3" />
                    <span>{p.agency}</span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    {p.rationale}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
