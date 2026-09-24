import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
  PieChart, Pie, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';

export const TIER_COLORS = { Low: '#EF4444', Middle: '#EAB308', High: '#10B981' };
const TIER_LIGHT   = { Low: '#FCA5A5', Middle: '#FEF08A', High: '#6EE7B7' };

// ─── Custom Tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-bold text-slate-700 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="font-semibold" style={{ color: p.fill || p.color }}>
          {p.name}: {p.value} families
        </p>
      ))}
    </div>
  );
}

// ─── 1. Predicted vs Actual Grouped Bar Chart ──────────────────────────────────
export function PredictedVsActualChart({ tierDistribution, actualDistribution }) {
  const SWDI_TIER_LABELS = { Low: 'Lvl 1', Middle: 'Lvl 2', High: 'Lvl 3' };
  const data = ['Low', 'Middle', 'High'].map((t) => ({
    name: SWDI_TIER_LABELS[t],
    Predicted: tierDistribution?.[t] ?? 0,
    Actual:    actualDistribution?.[t] ?? 0,
  }));

  // Compute per-barangay match rate
  const total = data.reduce((s, d) => s + d.Actual, 0);
  const matched = data.reduce((s, d) => s + Math.min(d.Predicted, d.Actual), 0);
  const matchRate = total > 0 ? Math.round((matched / total) * 100) : 0;

  return (
    <div>
      {/* Match rate badge */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-bold text-slate-800">Predicted vs Actual Income Classes</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={`text-lg font-black ${matchRate >= 70 ? 'text-emerald-600' : matchRate >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
            {matchRate}%
          </p>
          <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Match Rate</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} barCategoryGap="30%" barGap={4} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 10, paddingTop: 6 }} />
          <Bar dataKey="Predicted" name="Predicted" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Actual" name="Actual (SWDI)" fill="#6ee7b7" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* Explanation */}
      <div className="mt-2 p-2.5 bg-indigo-50/60 rounded-xl border border-indigo-100">
        <p className="text-[10px] text-indigo-700 font-medium leading-relaxed">
          <span className="font-bold">Solid bars</span> = Model prediction &nbsp;·&nbsp;
          <span className="font-bold">Light bars</span> = Actual SWDI record.
          {matchRate >= 70
            ? ' The model closely matches ground-truth labels for this barangay.'
            : ' Some discrepancy exists — this barangay has families near the income class boundary.'}
        </p>
      </div>
    </div>
  );
}

// ─── 2. SHAP Horizontal Bar Chart ─────────────────────────────────────────────
export function ShapDriversChart({ topDrivers }) {
  if (!topDrivers?.length) return (
    <p className="text-xs text-slate-400 text-center py-8">No SHAP data available for this barangay.</p>
  );

  const data = [...topDrivers].slice(0, 5).reverse(); // bottom-to-top

  return (
    <div>
      <div className="mb-3">
        <p className="text-xs font-bold text-slate-800">Top Decision Drivers (SHAP Analysis)</p>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false}
            tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
          <YAxis type="category" dataKey="label" tick={{ fontSize: 9, fill: '#475569', fontWeight: 500 }}
            axisLine={false} tickLine={false} width={130} />
          <Tooltip
            formatter={(val) => [`${val}% impact share`, 'SHAP weight']}
            contentStyle={{ fontSize: 11, borderRadius: 10, border: '1px solid #e2e8f0' }}
          />
          <Bar dataKey="share_pct" name="Impact Share" radius={[0, 4, 4, 0]} fill="#6366f1" />
        </BarChart>
      </ResponsiveContainer>


    </div>
  );
}

// ─── 3. Income Distribution Donut (Predicted + Actual side by side) ───────────
export function IncomeDonutChart({ tierDistribution, actualDistribution, familiesSurveyed }) {
  const TIERS = [
    { key: 'Low',    label: 'SWDI Lvl 1 · Survival',       color: '#EF4444' },
    { key: 'Middle', label: 'SWDI Lvl 2 · Subsistence',    color: '#EAB308' },
    { key: 'High',   label: 'SWDI Lvl 3 · Self-Sufficient', color: '#10B981' },
  ];

  const buildData = (dist) =>
    TIERS.map((t) => ({
      name:  t.label,
      key:   t.key,
      value: dist?.[t.key]     ?? 0,
      pct:   dist?.[`${t.key}_pct`] ?? 0,
      color: t.color,
    })).filter((d) => d.value > 0);

  const predicted = buildData(tierDistribution);
  const actual    = buildData(actualDistribution);

  const dominant = (arr) => arr.reduce((a, b) => (a.value > b.value ? a : b), arr[0] ?? {});

  const MiniDonut = ({ data, label }) => {
    const dom = dominant(data);
    return (
      <div className="flex flex-col items-center gap-1">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
        <div className="relative">
          <PieChart width={110} height={110}>
            <Pie data={data} cx={55} cy={55} innerRadius={35} outerRadius={50}
              dataKey="value" startAngle={90} endAngle={-270} stroke="none" paddingAngle={2}>
              {data.map((d) => <Cell key={d.key} fill={d.color} />)}
            </Pie>
          </PieChart>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-base font-black text-slate-800">{dom?.pct ?? 0}%</span>
            <span className="text-[8px] font-bold text-slate-500 leading-tight text-center px-1">
              {dom?.key}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <p className="text-xs font-bold text-slate-800 mb-3">Predicted vs Actual Income Distribution</p>

      {/* Two donuts */}
      <div className="flex justify-around mb-3">
        <MiniDonut data={predicted} label="Predicted (ML)" />
        <MiniDonut data={actual.length ? actual : predicted} label="Actual (SWDI)" />
      </div>

      {/* Shared legend */}
      <div className="space-y-1.5 border-t border-slate-100 pt-2">
        {TIERS.map((t) => {
          const p = tierDistribution?.[`${t.key}_pct`] ?? 0;
          const a = actualDistribution?.[`${t.key}_pct`] ?? 0;
          return (
            <div key={t.key} className="flex items-center gap-2 text-[10px]">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: t.color }} />
              <span className="flex-1 text-slate-600 font-medium truncate">{t.label}</span>
              <span className="font-bold text-slate-700 w-8 text-right">{p}%</span>
              <span className="text-slate-300 font-light">|</span>
              <span className="font-bold text-slate-500 w-8 text-right">{a}%</span>
            </div>
          );
        })}
        <div className="flex justify-between text-[9px] text-slate-400 pt-0.5">
          <span>{familiesSurveyed} families total</span>
          <div className="flex gap-3">
            <span className="font-semibold text-slate-600">Pred.</span>
            <span className="font-semibold text-slate-400">Act.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 4. Intervention Impact Bar (Before vs After enriched) ────────────────────
export function InterventionDeltaChart({ indicatorChanges }) {
  if (!indicatorChanges?.length) return null;

  const MEANINGS = {
    'Family size':       'Smaller families = more income per person',
    'Dependents (<18)':  'Fewer dependents = less financial pressure',
    'School Attendance': 'More kids in school = better future earnings',
    'Active 4Ps Share':  'Graduating from 4Ps = families becoming self-sufficient',
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-slate-700">What Changes & Why It Matters</p>
      {indicatorChanges.map((ind) => {
        const delta = ind.after - ind.before;
        const pctChange = ind.before !== 0 ? ((delta / ind.before) * 100).toFixed(1) : '0';
        const improved = delta <= 0 || ind.name === 'School Attendance';
        const barBefore = 100;
        const barAfter = ind.before > 0 ? Math.round((ind.after / ind.before) * 100) : 100;

        return (
          <div key={ind.name} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-700">{ind.name}</span>
              <span className={`text-[11px] font-extrabold ${improved ? 'text-emerald-600' : 'text-red-500'}`}>
                {ind.before} → {ind.after}
                <span className="text-[9px] ml-1 font-semibold opacity-80">({delta > 0 ? '+' : ''}{pctChange}%)</span>
              </span>
            </div>
            {/* Dual bars */}
            <div className="space-y-1 mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-slate-400 w-10 text-right">Before</span>
                <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-400 rounded-full" style={{ width: `${barBefore}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-slate-400 w-10 text-right">After</span>
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${improved ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    style={{ width: `${Math.min(barAfter, 100)}%` }}
                  />
                </div>
              </div>
            </div>
            {MEANINGS[ind.name] && (
              <p className={`text-[9px] font-medium ${improved ? 'text-emerald-700' : 'text-slate-500'}`}>
                {improved ? '✓ ' : ''}{MEANINGS[ind.name]}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
