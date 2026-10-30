import React from "react";
import { Sparkles, ShieldAlert, Cpu, CheckCircle2 } from "lucide-react";
import kalingaLogo from "../assets/KalingaBot AI.png";

const SECTOR_COLORS = {
  "Livelihood":        { bg: "bg-emerald-500/10", text: "text-emerald-700", border: "border-emerald-300/80" },
  "Education":         { bg: "bg-blue-500/10",    text: "text-blue-700",    border: "border-blue-300/80"    },
  "Housing":           { bg: "bg-amber-500/10",   text: "text-amber-700",   border: "border-amber-300/80"   },
  "Health":            { bg: "bg-rose-500/10",    text: "text-rose-700",    border: "border-rose-300/80"    },
  "Financial Support": { bg: "bg-indigo-500/10",  text: "text-indigo-700",  border: "border-indigo-300/80"  },
  "Financial Assistance": { bg: "bg-indigo-500/10",  text: "text-indigo-700",  border: "border-indigo-300/80"  },
};

export default function AISuggestions({
  interpretation,
  recommendations = [],
  subtitle = "",
  isFallback = false,
  aiProvider = "none",
  aiNote = "",
}) {
  if (!interpretation && (!recommendations || recommendations.length === 0) && !aiNote) {
    return null;
  }

  const isSafeguarded = aiProvider === "safeguarded" || (!recommendations?.length && isFallback === false && aiNote.includes("Safeguard"));

  return (
    <div className="neu-surface rounded-3xl p-6 space-y-4 shadow-sm border border-white/80">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl neu-inset-sm p-1 flex items-center justify-center flex-shrink-0">
            <img
              src={kalingaLogo}
              alt="KalingaBot"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <p className="text-[13px] font-semibold tracking-[-0.01em] text-slate-800 flex items-center gap-1.5">
              <span>Suggested Programs</span>
              {aiProvider === "gemini" && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 uppercase tracking-wide">
                  AI
                </span>
              )}
            </p>
            {subtitle && <p className="text-[10px] text-slate-400 font-medium">{subtitle}</p>}
          </div>
        </div>
      </div>

      {/* Fallback Notice Banner (User Requirement) */}
      {isFallback && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-300/80 text-amber-900 space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
            <Cpu className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>Standard suggestions</span>
          </div>
          <p className="text-[11px] text-amber-700 leading-relaxed font-normal">
            The AI helper is unavailable, so standard DSWD and Quezon City programs are shown.
          </p>
        </div>
      )}

      {/* Safeguard Withheld Banner (User Requirement) */}
      {isSafeguarded && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-300/80 text-rose-900 space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-rose-800">
            <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>Some numbers look unusual</span>
          </div>
          <p className="text-[11px] text-rose-700 leading-relaxed font-normal">
            Suggestions are hidden. Please double-check the numbers entered.
          </p>
        </div>
      )}

      {/* AI Interpretation text in debossed well */}
      {interpretation && (
        <div className="neu-inset-sm rounded-2xl px-4.5 py-3.5 space-y-1 bg-white/40">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold block">
            Summary
          </span>
          <p className="text-[11px] text-slate-700 leading-relaxed">
            {interpretation}
          </p>
        </div>
      )}

      {/* Program Recommendations cards */}
      {recommendations?.length > 0 && (
        <div className="space-y-2.5 pt-0.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold block px-1">
            Tailored Philippine Government Interventions ({recommendations.length})
          </span>
          {recommendations.map((rec, i) => {
            const colors = SECTOR_COLORS[rec.sector] || {
              bg: "bg-slate-500/10",
              text: "text-slate-700",
              border: "border-slate-300/80",
            };

            return (
              <div
                key={i}
                className="p-3.5 rounded-2xl neu-surface-sm transition-all hover:border-slate-300 border border-slate-200/60"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-[11px] font-semibold text-slate-800 leading-tight">
                    {rec.name}
                  </p>
                  <span
                    className={`text-[9px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 uppercase tracking-wider ${colors.bg} ${colors.text} border ${colors.border}`}
                  >
                    {rec.sector}
                  </span>
                </div>
                <p className="text-[10px] font-mono font-semibold text-indigo-600 mb-1">
                  {rec.agency}
                </p>
                <p className="text-[10px] text-slate-500 leading-relaxed font-normal">
                  {rec.rationale}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
