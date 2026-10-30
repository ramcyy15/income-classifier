import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LabelList } from "recharts";
import { LEVELS, LEVEL_ORDER, levelOf } from "../constants/levels";

export default function PredictionCard({ predictedClass, confidence, probabilities = {}, targetName = "Barangay" }) {
  const meta = levelOf(predictedClass);

  const chartData = LEVEL_ORDER.filter((cls) => probabilities[cls] != null).map((cls) => ({
    cls,
    name: LEVELS[cls].short,
    label: LEVELS[cls].name,
    percentage: Number((probabilities[cls] * 100).toFixed(1)),
  }));

  return (
    <div className="neu-surface rounded-3xl p-6 space-y-4">
      {/* Result */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium text-slate-500 mb-1">{targetName}</p>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">{meta.short}</h2>
            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${meta.badge}`}>
              {meta.name}
            </span>
          </div>
          <p className={`text-xs font-semibold mt-1 ${meta.text}`}>{meta.meaning}</p>
        </div>

        <div className="text-right neu-inset-sm px-4 py-2.5 rounded-2xl">
          <span className="text-2xl font-bold text-slate-900 leading-none">{(confidence * 100).toFixed(0)}%</span>
          <p className="text-[10px] font-medium text-slate-500 mt-1">Sure</p>
        </div>
      </div>

      {/* Chance of each level */}
      <div className="pt-3 border-t border-slate-200/60">
        <p className="text-[11px] font-semibold text-slate-700 mb-2">Chance of each level</p>
        <div className="h-36 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 16, right: 10, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fontWeight: 500, fill: "#475569" }}
                axisLine={{ stroke: "#cbd5e1" }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 50, 100]}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                unit="%"
              />
              <Tooltip
                cursor={{ fill: "rgba(226, 232, 240, 0.4)" }}
                content={({ active, payload }) =>
                  active && payload?.length ? (
                    <div className="bg-slate-900 text-white text-[11px] px-3 py-2 rounded-xl shadow-xl">
                      <p className="font-bold text-xs">{payload[0].payload.percentage}%</p>
                      <p className="text-slate-300">
                        {payload[0].payload.name} · {payload[0].payload.label}
                      </p>
                    </div>
                  ) : null
                }
              />
              <Bar dataKey="percentage" radius={[4, 4, 0, 0]} maxBarSize={24} animationDuration={800}>
                {chartData.map((entry) => (
                  <Cell key={entry.cls} fill={LEVELS[entry.cls].fill} />
                ))}
                <LabelList
                  dataKey="percentage"
                  position="top"
                  formatter={(v) => `${v}%`}
                  style={{ fontSize: 10, fontWeight: 600, fill: "#334155" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
