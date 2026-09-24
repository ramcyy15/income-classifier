import React from "react";
import { ChevronRight } from "lucide-react";

export default function BarangayDirectory({ barangays, selectedBarangay, onSelectBarangay }) {
  return (
    <div className="bg-white rounded-2xl px-4 pt-4 pb-3 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] h-full flex flex-col overflow-hidden">

      {/* Header */}
      <div className="mb-2 flex-shrink-0">
        <h3 className="text-sm font-bold text-slate-900 leading-tight">District V</h3>
        <p className="text-[11px] text-slate-400 font-medium">Ranked by poverty priority</p>
      </div>

      {/* Roster list */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-0.5">
          {barangays.map((b) => {
            const isSelected = selectedBarangay?.name === b.name;
            const badgeColor =
              b.community_class === "priority"   ? "bg-red-50 text-red-600 border-red-100" :
              b.community_class === "developing" ? "bg-amber-50 text-amber-600 border-amber-100" :
                                                   "bg-emerald-50 text-emerald-600 border-emerald-100";
            return (
              <div
                key={b.name}
                onClick={() => onSelectBarangay(b)}
                className={`px-2.5 py-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                  isSelected
                    ? "border-indigo-500 bg-indigo-50/40 shadow-sm ring-1 ring-indigo-500/20"
                    : "border-slate-100 hover:border-slate-200 hover:bg-slate-50/70"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] flex-shrink-0 ${
                    isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}>
                    {b.rank}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 truncate">{b.name}</span>
                      <span
                        title="Priority Band: based on 4Ps coverage density & transition rate — NOT the SWDI income tier"
                        className={`text-[9px] font-bold px-1 py-0.5 rounded border uppercase flex-shrink-0 cursor-help ${badgeColor}`}
                      >
                        {b.community_label}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">
                      P{b.avg_per_capita_income?.toLocaleString()}/mo &middot; {b.four_ps_density} 4Ps/1k
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? "text-indigo-600" : "text-slate-300"}`} />
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}