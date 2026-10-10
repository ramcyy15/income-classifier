import React from "react";
import kalingaLogo from "../assets/KalingaBot AI.png";

const SECTOR_COLORS = {
  "Livelihood":        { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  "Education":         { bg: "bg-blue-500/10",    text: "text-blue-400",    border: "border-blue-500/30"    },
  "Housing":           { bg: "bg-amber-500/10",   text: "text-amber-400",   border: "border-amber-500/30"   },
  "Health":            { bg: "bg-rose-500/10",    text: "text-rose-400",    border: "border-rose-500/30"    },
  "Financial Support": { bg: "bg-indigo-500/10",  text: "text-indigo-400",  border: "border-indigo-500/30"  },
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
    <div className="surface-card rounded-2xl p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 p-1 flex items-center justify-center flex-shrink-0">
          <img
            src={kalingaLogo}
            alt="KalingaBot"
            className="w-full h-full object-contain"
          />
        </div>
        <div>
          <p className="text-[13px] font-semibold tracking-[-0.01em] text-[#e6edf3]">
            KalingaBot AI Suggestions
          </p>
          <p className="text-[10px] text-[#8b949e] font-medium">
            {subtitle}
          </p>
        </div>
      </div>

      {/* AI Interpretation text in inset panel */}
      {interpretation && (
        <p className="text-[11px] text-[#c9d1d9] leading-relaxed surface-inset rounded-xl px-4 py-3 border border-white/5">
          {interpretation}
        </p>
      )}

      {/* Program Recommendations cards */}
      {recommendations?.length > 0 && (
        <div className="space-y-2.5 pt-0.5">
          {recommendations.map((rec, i) => {
            const colors = SECTOR_COLORS[rec.sector] || {
              bg: "bg-slate-500/10",
              text: "text-[#8b949e]",
              border: "border-white/10",
            };

            return (
              <div
                key={i}
                className="p-3.5 rounded-xl bg-[#090f18] border border-white/6 hover:border-white/12 transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="text-[11px] font-semibold text-[#e6edf3] leading-tight">
                    {rec.name}
                  </p>
                  <span
                    className={`text-[9px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 uppercase tracking-wider ${colors.bg} ${colors.text} border ${colors.border}`}
                  >
                    {rec.sector}
                  </span>
                </div>
                <p className="text-[10px] font-mono font-semibold text-blue-400 mb-1">
                  {rec.agency}
                </p>
                <p className="text-[10px] text-[#8b949e] leading-relaxed font-normal">
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
