import React from "react";
import { BarChart2, ArrowRight } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell,
} from "recharts";

const LEVEL_META = {
  High:   { label: "Level 3 · Self-Sufficient", color: "#10B981", bg: "bg-emerald-500", light: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  Middle: { label: "Level 2 · Subsistence",     color: "#F59E0B", bg: "bg-amber-500",   light: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200" },
  Low:    { label: "Level 1 · Survival",         color: "#EF4444", bg: "bg-red-500",     light: "bg-red-50",     text: "text-red-700",     border: "border-red-200" },
};

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-bold text-slate-700 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="font-semibold" style={{ color: p.fill }}>
          {p.name}: {p.value} families
        </p>
      ))}
    </div>
  );
}

export default function DistrictOverviewPanel({ barangays, selectedBarangay, onSelectBarangay }) {
  if (!barangays || barangays.length === 0) {
    return (
      <div className="bg-white rounded-2xl px-4 pt-4 pb-3 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] h-full flex items-center justify-center">
        <p className="text-slate-400 text-xs font-medium">Loading district overview…</p>
      </div>
    );
  }

  // Build chart data: top 8 barangays by families surveyed, showing SWDI tier split
  const chartData = [...barangays]
    .sort((a, b) => (b.tier_distribution?.Low ?? 0) - (a.tier_distribution?.Low ?? 0))
    .slice(0, 8)
    .map((b) => ({
      name: b.name.replace("Novaliches Proper", "Novaliches").replace("Nagkaisang Nayon", "Nagkaisang").replace("Pasong Putik Proper", "Pasong Putik").replace("North Fairview", "N. Fairview").replace("Greater Lagro", "Gr. Lagro").replace("Santa Monica", "Sta. Monica").replace("Santa Lucia", "Sta. Lucia").replace("San Bartolome", "S. Bartolome").replace("San Agustin", "S. Agustin"),
      Level1: b.tier_distribution?.Low ?? 0,
      Level2: b.tier_distribution?.Middle ?? 0,
      Level3: b.tier_distribution?.High ?? 0,
    }));

  // Summary counts across all barangays
  const totals = barangays.reduce(
    (acc, b) => ({
      Low:    acc.Low    + (b.tier_distribution?.Low    ?? 0),
      Middle: acc.Middle + (b.tier_distribution?.Middle ?? 0),
      High:   acc.High   + (b.tier_distribution?.High   ?? 0),
    }),
    { Low: 0, Middle: 0, High: 0 }
  );
  const totalFams = totals.Low + totals.Middle + totals.High || 1;

  return (
    <div className="bg-white rounded-2xl px-4 pt-4 pb-3 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] h-full flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <BarChart2 className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-tight">District V · Income Tiers</p>
              <p className="text-[10px] text-slate-400 font-medium">SWDI level distribution by barangay</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {["Low", "Middle", "High"].map((t) => (
            <div key={t} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${LEVEL_META[t].bg}`} />
              <span className="text-[9px] font-bold text-slate-500">Lvl {t === "Low" ? 1 : t === "Middle" ? 2 : 3}</span>
            </div>
          ))}
        </div>
      </div>

      {/* District-wide tier summary pills */}
      <div className="grid grid-cols-3 gap-2 mb-3 flex-shrink-0">
        {["Low", "Middle", "High"].map((tier) => {
          const m = LEVEL_META[tier];
          const pct = Math.round((totals[tier] / totalFams) * 100);
          return (
            <div key={tier} className={`rounded-xl p-2.5 border ${m.border} ${m.light} text-center`}>
              <p className={`text-base font-black ${m.text}`}>{pct}%</p>
              <p className={`text-[9px] font-bold ${m.text} opacity-70 leading-tight mt-0.5`}>
                {tier === "Low" ? "Level 1" : tier === "Middle" ? "Level 2" : "Level 3"}
              </p>
              <p className={`text-[9px] font-medium ${m.text} opacity-60`}>{totals[tier].toLocaleString()} families</p>
            </div>
          );
        })}
      </div>

      {/* Stacked bar chart */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 8, left: 4, bottom: 0 }}
            barCategoryGap="25%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 9, fill: "#64748b", fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
              width={68}
            />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="Level1" name="Level 1 · Survival"   stackId="a" fill="#EF4444" radius={[0,0,0,0]} />
            <Bar dataKey="Level2" name="Level 2 · Subsistence" stackId="a" fill="#F59E0B" radius={[0,0,0,0]} />
            <Bar dataKey="Level3" name="Level 3 · Self-Sufficient" stackId="a" fill="#10B981" radius={[0,3,3,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
