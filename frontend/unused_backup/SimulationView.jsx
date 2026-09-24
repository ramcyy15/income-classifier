import React, { useState } from "react";
import { Sparkles, Sliders, Target, Check, RefreshCw } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend
} from "recharts";
import { runSimulation, runGoalSeek } from "../services/api";
import { InterventionDeltaChart } from "./AnalyticsCharts";
import kalingaLogo from "../assets/KalingaBot AI.png";

const TIER_COLORS = { Low: "#EF4444", Middle: "#EAB308", High: "#10B981" };

function SimTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-bold text-slate-800 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.fill }} className="font-semibold">
          {p.name}: {p.value} families
        </p>
      ))}
    </div>
  );
}

function IndicatorBar({ name, before, after }) {
  const max = Math.max(before, after, 1);
  const beforePct = (before / max) * 100;
  const afterPct  = (after  / max) * 100;
  const improved  = after <= before;
  return (
    <div>
      <div className="flex justify-between text-[10px] font-bold mb-0.5">
        <span className="text-slate-600">{name}</span>
        <span className={improved ? "text-emerald-600" : "text-red-500"}>
          {before} &rarr; {after}
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-slate-400 rounded-full" style={{ width: `${beforePct}%` }} />
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${improved ? "bg-emerald-500" : "bg-red-400"}`} style={{ width: `${afterPct}%` }} />
        </div>
      </div>
      <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
        <span>Before</span><span>After</span>
      </div>
    </div>
  );
}

export default function SimulationView({ barangays, selectedBarangay, onSelectBarangay }) {
  const [financial, setFinancial] = useState(40);
  const [education, setEducation] = useState(30);
  const [livelihood, setLivelihood] = useState(50);
  const [years, setYears] = useState(5);
  const [loading, setLoading]   = useState(false);
  const [result,  setResult]    = useState(null);

  // Goal-Seek Optimization State
  const [targetReduction, setTargetReduction] = useState(25);
  const [goalLoading, setGoalLoading] = useState(false);
  const [goalResult, setGoalResult] = useState(null);
  const [showGoalSeek, setShowGoalSeek] = useState(false);

  const activeBrgy = selectedBarangay || barangays[0];
  const aiSuggestion = activeBrgy?.policy_brief?.slider_suggestion || {};

  const handleSimulate = async () => {
    if (!activeBrgy) return;
    setLoading(true);
    try {
      const res = await runSimulation({ barangay: activeBrgy.name, financial, education, livelihood, years });
      setResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSolve = async () => {
    if (!activeBrgy || goalLoading) return;
    setGoalLoading(true);
    setGoalResult(null);
    try {
      const res = await runGoalSeek({
        barangay: activeBrgy.name,
        target_reduction_pct: Number(targetReduction),
        years: Number(years),
      });
      setGoalResult(res);
      if (res.best_plan) {
        setFinancial(res.best_plan.financial);
        setEducation(res.best_plan.education);
        setLivelihood(res.best_plan.livelihood);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGoalLoading(false);
    }
  };

  const handlePreset = (f, e, l) => { setFinancial(f); setEducation(e); setLivelihood(l); };

  const applyAiRecommendation = () => {
    if (aiSuggestion.financial !== undefined) {
      setFinancial(aiSuggestion.financial);
      setEducation(aiSuggestion.education);
      setLivelihood(aiSuggestion.livelihood);
    }
  };

  // Build chart data from result
  const SWDI_LABELS = { Low: 'SWDI Lvl 1', Middle: 'SWDI Lvl 2', High: 'SWDI Lvl 3' };
  const tierChartData = result
    ? ["Low", "Middle", "High"].map((t) => ({
        name: SWDI_LABELS[t],
        Current:   result.now.counts[t]       ?? 0,
        Projected: result.projected.counts[t] ?? 0,
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
            <h2 className="text-lg font-bold text-slate-900">Intervention Scenario Planner</h2>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            Test policy intensities on {activeBrgy?.name || "the selected barangay"} using the stacking ensemble model.
          </p>
        </div>
        <select
          value={activeBrgy?.name || ""}
          onChange={(e) => {
            const match = barangays.find((b) => b.name === e.target.value);
            if (match) { onSelectBarangay(match); setResult(null); }
          }}
          className="py-2 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          {barangays.map((b) => (
            <option key={b.name} value={b.name}>{b.name} (#{b.rank})</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ── LEFT: Sliders ── */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Policy Scenarios</span>
              <button
                onClick={() => setShowGoalSeek(!showGoalSeek)}
                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer bg-indigo-50/70 hover:bg-indigo-100/70 px-2 py-0.5 rounded-lg border border-indigo-100 transition-all"
              >
                <Target className="w-3 h-3 text-indigo-500" />
                {showGoalSeek ? "Hide Goal Optimizer" : "Auto-Solve Target Goal"}
              </button>
            </div>

            {/* Collapsible Goal Optimizer Box */}
            {showGoalSeek ? (
              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-2.5 mb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Target Low-Income Reduction</span>
                  <span className="text-xs font-black text-indigo-600">{targetReduction}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="10"
                    max="50"
                    step="5"
                    value={targetReduction}
                    onChange={(e) => setTargetReduction(Number(e.target.value))}
                    className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <button
                    onClick={handleAutoSolve}
                    disabled={goalLoading}
                    className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer flex-shrink-0"
                  >
                    {goalLoading ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    <span>{goalLoading ? "Optimizing..." : "Solve"}</span>
                  </button>
                </div>

                {goalResult && (
                  <div className="pt-2 border-t border-indigo-100/70 text-[11px] text-slate-600 space-y-1">
                    <p className="font-semibold text-indigo-900">
                      Optimal Mix: Financial {goalResult.best_plan?.financial}% &middot; Education {goalResult.best_plan?.education}% &middot; Livelihood {goalResult.best_plan?.livelihood}%
                    </p>
                    {goalResult.ai_roadmap && (
                      <p className="text-[10px] text-slate-500 leading-relaxed italic">
                        "{goalResult.ai_roadmap}"
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2.5">
                {[["Baseline (0%)", 0, 0, 0], ["Balanced (40%)", 40, 40, 40], ["Intensive (80%)", 80, 80, 80]].map(([label, f, e, l]) => (
                  <button
                    key={label}
                    onClick={() => handlePreset(f, e, l)}
                    className="py-2.5 px-3 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors text-slate-700 cursor-pointer"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
            {[
              {
                label: "Financial Assistance",
                target: aiSuggestion.financial_targets || "Cash grants, emergency aid, conditional transfers",
                val: financial,
                set: setFinancial,
              },
              {
                label: "Educational Support",
                target: aiSuggestion.education_targets || "School retention, ALS, youth educational subsidies",
                val: education,
                set: setEducation,
              },
              {
                label: "Livelihood & Employment",
                target: aiSuggestion.livelihood_targets || "Micro-enterprise capital, skills training, job placement",
                val: livelihood,
                set: setLivelihood,
              },
            ].map(({ label, target, val, set }) => (
              <div key={label}>
                <div className="flex justify-between items-baseline mb-0.5">
                  <span className="text-xs font-bold text-slate-800">{label}</span>
                  <span className="text-xs font-extrabold text-indigo-600">{val}%</span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium mb-1.5 truncate" title={target}>
                  {target}
                </p>
                <input type="range" min="0" max="100" value={val}
                  onChange={(e) => set(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            ))}

            <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
              <span className="font-bold text-slate-700">Policy Time Horizon</span>
              <div className="flex gap-2">
                {[3, 4, 5].map((y) => (
                  <button key={y} onClick={() => setYears(y)}
                    className={`px-3.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      years === y ? "bg-slate-900 text-white shadow-sm" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {y} Yrs
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button onClick={handleSimulate} disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading
              ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              : <><Sparkles className="w-4 h-4" /><span>Simulate &amp; Re-score Families in {activeBrgy?.name}</span></>
            }
          </button>
        </div>

        {/* ── RIGHT: Results + Charts ── */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col h-[505px] overflow-hidden">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <h3 className="text-base font-bold text-slate-900">Projected Policy Impact</h3>
            {result && (
              <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                {result.movement.low_tier_reduction_pct}% SWDI Lvl 1 Reduction
              </span>
            )}
          </div>

          {!result ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Sliders className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-500">Configure parameters on the left and click Simulate.</p>
              <p className="text-[11px] text-slate-400 mt-1">The ensemble model will re-score income tiers and show a before/after comparison.</p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto space-y-5 pr-1">

              {/* ── Chart 1: Before vs After grouped bar ── */}
              <div>
                <p className="text-xs font-bold text-slate-700 mb-0.5">Before vs After — Income Tier Counts</p>
                <p className="text-[10px] text-slate-400 mb-2">
                  Comparison between current family tier counts and projected counts after {years} years of policy intervention
                </p>

                {/* Custom clear legend */}
                <div className="flex items-center justify-center gap-6 mb-2 py-1.5 px-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-indigo-600 inline-block shadow-sm" />
                    <span className="font-bold text-slate-700">Current (Baseline)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-emerald-400 inline-block shadow-sm" />
                    <span className="font-bold text-slate-700">Projected ({years} Yrs)</span>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={tierChartData} barCategoryGap="28%" barGap={6} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<SimTooltip />} />
                    <Bar dataKey="Current" name="Current" fill="#6366f1" radius={[4,4,0,0]} />
                    <Bar dataKey="Projected" name="Projected" fill="#34d399" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* ── Mobility summary ── */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-center">
                {[
                  { label: "Moved Up",  val: `+${result.movement.moved_up}`,    color: "text-emerald-700" },
                  { label: "Stayed",    val: result.movement.stayed,             color: "text-slate-700" },
                  { label: "Moved Down",val: `-${result.movement.moved_down}`,   color: "text-red-500" },
                ].map(({ label, val, color }) => (
                  <div key={label}>
                    <p className={`text-base font-black ${color}`}>{val}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{label}</p>
                  </div>
                ))}
              </div>

              {/* ── AI Executive Interpretation ── */}
              {result.ai_analysis && (
                <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-2">
                    <img
                      src={kalingaLogo}
                      alt="KalingaBot"
                      className="w-5 h-5 rounded-md object-contain bg-white border border-indigo-100 p-0.5 shadow-2xs flex-shrink-0"
                    />
                    <span className="text-indigo-700 font-extrabold text-[10px] uppercase tracking-wider">
                      Policy Impact Assessment
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {result.ai_analysis}
                  </p>
                </div>
              )}

              {/* ── Chart 2: Enriched Indicator deltas ── */}
              <InterventionDeltaChart indicatorChanges={result.indicator_changes} />

            </div>
          )}
        </div>
      </div>
    </div>
  );
}