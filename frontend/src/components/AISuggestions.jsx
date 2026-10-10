import React from "react";
import kalingaLogo from "../assets/KalingaBot AI.png";

const SECTOR_COLORS = {
  "Livelihood":        { bg: "bg-emerald-500/10", text: "text-emerald-700", border: "border-emerald-300/80" },
  "Education":         { bg: "bg-blue-500/10",    text: "text-blue-700",    border: "border-blue-300/80"    },
  "Housing":           { bg: "bg-amber-500/10",   text: "text-amber-700",   border: "border-amber-300/80"   },
  "Health":            { bg: "bg-rose-500/10",    text: "text-rose-700",    border: "border-rose-300/80"    },
  "Financial Support": { bg: "bg-indigo-500/10",  text: "text-indigo-700",  border: "border-indigo-300/80"  },
};

export default function AISuggestions({
  interpretation,
  recommendations = [],
  subtitle = "Gemini-powered recommendations based on socio-economic indicators",
}) {
  if (!interpretation && (!recommendations || recommendations.length === 0)) {
    return null;
  }

  return (
    <div className="neu-surface rounded-3xl p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-2xl neu-inset-sm p-1 flex items-center justify-center flex-shrink-0">
          <img
            src={kalingaLogo}
            alt="KalingaBot"
            className="w-full h-full object-contain"
          />
        </div>
        <div>
          <p className="text-[13px] font-semibold tracking-[-0.01em] text-slate-800">
            KalingaBot AI Suggestions
          </p>
          <p className="text-[10px] text-slate-400 font-medium">
            {subtitle}
          </p>
        </div>
      </div>

      {/* AI Interpretation text in debossed well */}
      {interpretation && (
        <p className="text-[11px] text-slate-600 leading-relaxed neu-inset-sm rounded-2xl px-4.5 py-3.5">
          {interpretation}
        </p>
      )}

      {/* Program Recommendations cards */}
      {recommendations?.length > 0 && (
        <div className="space-y-2.5 pt-0.5">
          {recommendations.map((rec, i) => {
            const colors = SECTOR_COLORS[rec.sector] || {
              bg: "bg-slate-500/10",
              text: "text-slate-700",
              border: "border-slate-300/80",
            };

            return (
              <div
                key={i}
                className="p-3.5 rounded-2xl neu-surface-sm transition-all hover:border-slate-300"
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
