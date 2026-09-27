import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";

const PSA_TIER_META = {
  Low: {
    level: "Level 1",
    label: "Low-Income Tier",
    subLabel: "Survival",
    color: "#EF4444",
    bg: "bg-red-500/10",
    border: "border-red-300/80",
    text: "text-red-700",
  },
  Middle: {
    level: "Level 2",
    label: "Middle-Income Tier",
    subLabel: "Subsistence",
    color: "#F59E0B",
    bg: "bg-amber-500/10",
    border: "border-amber-300/80",
    text: "text-amber-700",
  },
  High: {
    level: "Level 3",
    label: "High-Income Tier",
    subLabel: "Self-Sufficient",
    color: "#10B981",
    bg: "bg-emerald-500/10",
    border: "border-emerald-300/80",
    text: "text-emerald-700",
  },
};

export default function PredictionCard({
  predictedClass,
  confidence,
  probabilities = {},
  targetName = "Target Subject",
  isIndividual = false,
}) {
  const meta = PSA_TIER_META[predictedClass] || PSA_TIER_META.Middle;
  const labelText = isIndividual ? meta.subLabel : meta.label;

  const chartData = Object.entries(probabilities).map(([cls, prob]) => ({
    name: PSA_TIER_META[cls]?.level || cls,
    label: isIndividual ? PSA_TIER_META[cls]?.subLabel : PSA_TIER_META[cls]?.label,
    percentage: Number((prob * 100).toFixed(1)),
    isWinner: cls === predictedClass,
  }));

  return (
    <div className="neu-surface rounded-3xl p-6 space-y-4">
      {/* Header Info */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400">
              {isIndividual ? "SWDI CLASSIFICATION" : "OFFICIAL INCOME TIER"}
            </span>
            <span
              className={`text-[10px] font-semibold uppercase tracking-[0.08em] px-2.5 py-0.5 rounded-full border ${meta.bg} ${meta.border} ${meta.text}`}
            >
              {labelText}
            </span>
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            {meta.level}
          </h2>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            {targetName}
          </p>
        </div>

        {/* Model Confidence Box with Debossed Inset */}
        <div className="text-right neu-inset-sm px-4 py-2.5 rounded-2xl">
          <span className="text-2xl font-bold font-mono tabular-nums text-indigo-600 leading-none">
            {(confidence * 100).toFixed(1)}%
          </span>
          <p className="text-[10px] font-medium text-slate-400 mt-1 font-mono">Model Confidence</p>
        </div>
      </div>

      {/* Probability Distribution Chart */}
      <div className="pt-2 border-t border-slate-200/60">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold text-slate-700">Tier Probability Distribution</p>
          <span className="text-[10px] font-mono text-slate-400">Stacking Ensemble Softmax</span>
        </div>

        <div className="h-36 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 12, right: 10, left: -20, bottom: 0 }}
            >
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fontWeight: 500, fill: "#64748b" }}
                axisLine={{ stroke: "#cbd5e1" }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                unit="%"
              />
              <Tooltip
                cursor={{ fill: "rgba(226, 232, 240, 0.4)" }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white text-[11px] px-3 py-2 rounded-xl shadow-xl space-y-0.5">
                        <p className="font-semibold text-slate-200">
                          {d.name} · {d.label}
                        </p>
                        <p className="text-indigo-300 font-bold font-mono text-xs">
                          {d.percentage}% probability
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="percentage"
                radius={[6, 6, 0, 0]}
                maxBarSize={48}
                animationDuration={800}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={entry.isWinner ? "#4f46e5" : "#94a3b8"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium px-1 pt-2">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600 inline-block shadow-xs" />
            Classified Tier (Highest Probability)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-400 inline-block" />
            Alternative Classes
          </span>
        </div>
      </div>
    </div>
  );
}
