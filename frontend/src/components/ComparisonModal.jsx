import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpDown, X, TrendingUp, TrendingDown, Scale, ShieldAlert,
  Award, FileText, CheckCircle2, ChevronRight, BarChart3, Radar as RadarIcon, Compass
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from "recharts";

const TIER_COLORS = {
  Low: {
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    border: "border-rose-500/30",
    dot: "bg-rose-500",
    label: "Survival (Level 1)",
  },
  Middle: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
    dot: "bg-amber-500",
    label: "Subsistence (Level 2)",
  },
  High: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    dot: "bg-emerald-500",
    label: "Self-Sufficient (Level 3)",
  },
};

export default function ComparisonModal({ isOpen, onClose, itemA, itemB }) {
  const [activeTab, setActiveTab] = useState("matrix"); // "matrix" | "charts" | "interventions"
  const [chartSubTab, setChartSubTab] = useState("bar"); // "bar" | "radar"

  const parseNum = (val) => {
    if (typeof val === "number") return val;
    if (!val) return 0;
    const cleaned = String(val).replace(/[^0-9.]/g, "");
    return parseFloat(cleaned) || 0;
  };

  if (!isOpen || !itemA || !itemB) return null;

  const metaA = TIER_COLORS[itemA.predicted_class] || TIER_COLORS.Middle;
  const metaB = TIER_COLORS[itemB.predicted_class] || TIER_COLORS.Middle;

  const inputsA = itemA.inputs || {};
  const inputsB = itemB.inputs || {};
  const allKeys = Array.from(new Set([...Object.keys(inputsA), ...Object.keys(inputsB)]));

  const rawMetrics = allKeys.map((k) => {
    const rawA = parseNum(inputsA[k]);
    const rawB = parseNum(inputsB[k]);
    const diff = rawA - rawB;
    const higherSubject = diff > 0 ? "A" : diff < 0 ? "B" : "Equal";
    const percentDiff = rawB > 0 ? ((diff / rawB) * 100).toFixed(1) : "0.0";

    return {
      metric: k,
      valA: inputsA[k] ?? "—",
      valB: inputsB[k] ?? "—",
      rawA,
      rawB,
      diff,
      higherSubject,
      percentDiff,
    };
  });

  // Calculate synthetic normalized data for Recharts
  const normalizedData = rawMetrics.map((d) => {
    const max = Math.max(d.rawA, d.rawB, 1);
    return {
      subject: d.metric.replace(/pct/gi, "%").replace(/php/gi, "").trim(),
      A: Math.round((d.rawA / max) * 100),
      B: Math.round((d.rawB / max) * 100),
      rawA: d.rawA,
      rawB: d.rawB,
    };
  });

  // Executive synthesis analysis
  const confDelta = (itemA.confidence || 0) - (itemB.confidence || 0);

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ type: "spring", duration: 0.4, bounce: 0.1 }}
          className="glass-card rounded-2xl max-w-5xl w-full border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] flex flex-col max-h-[92vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Modal Header */}
          <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between bg-[#0a1018]/80 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <ArrowUpDown className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold tracking-[-0.01em] text-[#e6edf3]">
                  Forensic Dual-Profile Comparative Analysis
                </h3>
                <p className="text-[11px] font-mono text-[#8b949e]">
                  Socio-economic indicators & model inference divergence
                </p>
              </div>
            </div>

            {/* View Mode Tabs & Tactile Close */}
            <div className="flex items-center gap-3">
              <div className="flex items-center surface-inset p-1 rounded-xl gap-1 border border-white/5">
                <button
                  onClick={() => setActiveTab("matrix")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-150 ${
                    activeTab === "matrix"
                      ? "bg-blue-600/20 border border-blue-500/30 text-blue-400 font-bold"
                      : "text-[#8b949e] hover:text-[#e6edf3]"
                  }`}
                >
                  Delta Matrix
                </button>
                <button
                  onClick={() => setActiveTab("charts")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-150 ${
                    activeTab === "charts"
                      ? "bg-blue-600/20 border border-blue-500/30 text-blue-400 font-bold"
                      : "text-[#8b949e] hover:text-[#e6edf3]"
                  }`}
                >
                  Visual Analytics
                </button>
                <button
                  onClick={() => setActiveTab("interventions")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-150 ${
                    activeTab === "interventions"
                      ? "bg-blue-600/20 border border-blue-500/30 text-blue-400 font-bold"
                      : "text-[#8b949e] hover:text-[#e6edf3]"
                  }`}
                >
                  Policy Alignment
                </button>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl btn-ghost text-[#8b949e] hover:text-[#e6edf3] flex items-center justify-center transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Modal Content Body */}
          <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-[#080d14]">
            {/* Subject Profile Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Profile A */}
              <div className="surface-card rounded-xl p-4.5 flex flex-col justify-between relative overflow-hidden border border-white/6">
                <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                      Subject A · {itemA.type.toUpperCase()}
                    </span>
                    <h4 className="text-base font-bold text-[#e6edf3] mt-1.5">{itemA.target}</h4>
                  </div>
                  <div className={`px-2.5 py-1 rounded-xl border text-xs font-semibold ${metaA.bg} ${metaA.border} ${metaA.text}`}>
                    {metaA.label}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-white/8">
                  <div className="surface-inset p-2 rounded-xl text-center border border-white/5">
                    <span className="text-[9.5px] uppercase font-mono tracking-wider text-[#8b949e] block">Confidence</span>
                    <span className="text-base font-bold font-mono tabular-nums text-[#e6edf3]">{itemA.confidence ?? 0}%</span>
                  </div>
                  <div className="surface-inset p-2 rounded-xl text-center border border-white/5">
                    <span className="text-[9.5px] uppercase font-mono tracking-wider text-[#8b949e] block">Primary Driver</span>
                    <span className="text-xs font-semibold text-[#8b949e] truncate block mt-0.5">{itemA.top_feature ?? "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Profile B */}
              <div className="surface-card rounded-xl p-4.5 flex flex-col justify-between relative overflow-hidden border border-white/6">
                <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      Subject B · {itemB.type.toUpperCase()}
                    </span>
                    <h4 className="text-base font-bold text-[#e6edf3] mt-1.5">{itemB.target}</h4>
                  </div>
                  <div className={`px-2.5 py-1 rounded-xl border text-xs font-semibold ${metaB.bg} ${metaB.border} ${metaB.text}`}>
                    {metaB.label}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-white/8">
                  <div className="surface-inset p-2 rounded-xl text-center border border-white/5">
                    <span className="text-[9.5px] uppercase font-mono tracking-wider text-[#8b949e] block">Confidence</span>
                    <span className="text-base font-bold font-mono tabular-nums text-[#e6edf3]">{itemB.confidence ?? 0}%</span>
                  </div>
                  <div className="surface-inset p-2 rounded-xl text-center border border-white/5">
                    <span className="text-[9.5px] uppercase font-mono tracking-wider text-[#8b949e] block">Primary Driver</span>
                    <span className="text-xs font-semibold text-[#8b949e] truncate block mt-0.5">{itemB.top_feature ?? "N/A"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Executive Synthesis Banner */}
            <div className="surface-card rounded-xl p-4 border border-blue-500/20 flex items-start gap-3 bg-blue-500/5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0 mt-0.5">
                <Compass className="w-4 h-4" />
              </div>
              <div className="space-y-1 text-xs text-[#8b949e]">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#e6edf3]">Comparative Analytical Synthesis:</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Delta Confidence: {confDelta > 0 ? `+${confDelta}% (Subject A)` : confDelta < 0 ? `+${Math.abs(confDelta)}% (Subject B)` : "0%"}
                  </span>
                </div>
                <p className="leading-relaxed font-normal">
                  {itemA.predicted_class === itemB.predicted_class
                    ? `Both profiles converge within the same ${metaA.label} socio-economic bracket. Divergences in feature impacts indicate local variations in infrastructural access and demographic burden.`
                    : `Subject A is classified at ${metaA.label} whereas Subject B is positioned at ${metaB.label}. The model isolates significant variances in livelihood security and community deprivation indexes.`}
                </p>
              </div>
            </div>

            {/* TAB 1: DELTA MATRIX */}
            {activeTab === "matrix" && (
              <div className="surface-card rounded-xl p-5 space-y-4 border border-white/6">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-semibold text-[#e6edf3] uppercase tracking-wider">
                      Indicator Variance & Divergence Matrix
                    </h5>
                    <p className="text-[10px] text-[#8b949e] font-medium">
                      Exact indicator values, relative delta percentage, and diverging benchmark
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-medium">
                    <span className="flex items-center gap-1.5 text-blue-400 font-semibold">
                      <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" /> {itemA.target} (A)
                    </span>
                    <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                      <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> {itemB.target} (B)
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {rawMetrics.map((row) => {
                    const maxVal = Math.max(row.rawA, row.rawB, 1);
                    const pA = Math.round((row.rawA / maxVal) * 100);
                    const pB = Math.round((row.rawB / maxVal) * 100);

                    return (
                      <div
                        key={row.metric}
                        className="bg-[#090f18] border border-white/5 p-3.5 rounded-xl flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold font-mono tabular-nums text-blue-400 min-w-[80px] text-left">
                            {String(row.valA)}
                          </span>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-[#e6edf3] uppercase tracking-wider">
                              {row.metric}
                            </span>
                            {row.higherSubject !== "Equal" && (
                              <span
                                className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                  row.higherSubject === "A"
                                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                }`}
                              >
                                {row.higherSubject === "A" ? "▲ A leads" : "▲ B leads"}
                              </span>
                            )}
                          </div>

                          <span className="font-bold font-mono tabular-nums text-emerald-400 min-w-[80px] text-right">
                            {String(row.valB)}
                          </span>
                        </div>

                        {/* Dual Diverging Gauge Bar */}
                        <div className="grid grid-cols-2 gap-2 h-2 surface-inset rounded-full overflow-hidden border border-white/5">
                          <div className="flex justify-end">
                            <div
                              className="bg-blue-500 h-full rounded-l-full transition-all duration-500"
                              style={{ width: `${pA}%` }}
                            />
                          </div>
                          <div className="flex justify-start">
                            <div
                              className="bg-emerald-500 h-full rounded-r-full transition-all duration-500"
                              style={{ width: `${pB}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: VISUAL ANALYTICS */}
            {activeTab === "charts" && (
              <div className="surface-card rounded-xl p-5 space-y-4 border border-white/6">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-semibold text-[#e6edf3] uppercase tracking-wider">
                      Normalized Benchmark Comparison
                    </h5>
                    <p className="text-[10px] text-[#8b949e] font-medium">
                      Multi-dimensional distribution scaled across 0-100 relative index
                    </p>
                  </div>

                  <div className="flex items-center surface-inset p-1 rounded-xl gap-1 border border-white/5">
                    <button
                      onClick={() => setChartSubTab("bar")}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                        chartSubTab === "bar"
                          ? "bg-blue-600/20 border border-blue-500/30 text-blue-400 font-bold"
                          : "text-[#8b949e] hover:text-[#e6edf3]"
                      }`}
                    >
                      <BarChart3 className="w-3.5 h-3.5 inline mr-1" /> Bar Matrix
                    </button>
                    <button
                      onClick={() => setChartSubTab("radar")}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                        chartSubTab === "radar"
                          ? "bg-blue-600/20 border border-blue-500/30 text-blue-400 font-bold"
                          : "text-[#8b949e] hover:text-[#e6edf3]"
                      }`}
                    >
                      <RadarIcon className="w-3.5 h-3.5 inline mr-1" /> Radar Overlay
                    </button>
                  </div>
                </div>

                {normalizedData.length === 0 ? (
                  <p className="text-xs text-[#8b949e] py-6 text-center">No numerical indicators found for comparison.</p>
                ) : chartSubTab === "radar" ? (
                  <div className="h-72 w-full flex items-center justify-center pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={normalizedData}>
                        <PolarGrid stroke="#1e293b" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: "#8b949e", fontSize: 10, fontWeight: 500 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: "#484f58" }} />
                        <Radar name={itemA.target} dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} />
                        <Radar name={itemB.target} dataKey="B" stroke="#10b981" fill="#10b981" fillOpacity={0.25} />
                        <Tooltip
                          formatter={(value, name) => [`${value}% relative score`, name]}
                          contentStyle={{ backgroundColor: "#0d1520", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#e6edf3", fontSize: "11px" }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={normalizedData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                        <XAxis
                          dataKey="subject"
                          tick={{ fontSize: 10, fill: "#8b949e" }}
                          angle={-15}
                          textAnchor="end"
                          interval={0}
                        />
                        <YAxis tick={{ fontSize: 10, fill: "#484f58" }} domain={[0, 100]} />
                        <Tooltip
                          formatter={(value, name) => [`${value}% relative intensity`, name]}
                          contentStyle={{ backgroundColor: "#0d1520", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#e6edf3", fontSize: "11px" }}
                        />
                        <Bar dataKey="A" name={itemA.target} fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={30} />
                        <Bar dataKey="B" name={itemB.target} fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: POLICY ALIGNMENT */}
            {activeTab === "interventions" && (
              <div className="surface-card rounded-xl p-5 space-y-4 border border-white/6">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-semibold text-[#e6edf3] uppercase tracking-wider">
                      Targeted Policy & Intervention Trajectory
                    </h5>
                    <p className="text-[10px] text-[#8b949e] font-medium">
                      Comparing government assistance programs and community resource prioritization
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Intervention Column A */}
                  <div className="bg-[#090f18] border border-white/6 p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between border-b border-white/8 pb-2">
                      <span className="text-xs font-bold text-blue-400">{itemA.target}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {metaA.label}
                      </span>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="p-2.5 surface-inset rounded-lg border border-white/5">
                        <p className="font-semibold text-[#e6edf3]">Primary Welfare Need:</p>
                        <p className="text-[#8b949e] text-[11px] mt-0.5">
                          {itemA.top_feature ? `Mitigate vulnerability driven by ${itemA.top_feature}.` : "Sustain economic baseline."}
                        </p>
                      </div>
                      <div className="p-2.5 surface-inset rounded-lg border border-white/5">
                        <p className="font-semibold text-[#e6edf3]">Recommended Agency Pipeline:</p>
                        <p className="text-[#8b949e] text-[11px] mt-0.5">
                          {itemA.predicted_class === "Low"
                            ? "DSWD 4Ps Emergency Relief + DOLE Livelihood Grant"
                            : itemA.predicted_class === "Middle"
                            ? "TESDA Skills Upgrading + QC Microfinance Assistance"
                            : "DTI SME Capitalization + Local Tax Incentives"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Intervention Column B */}
                  <div className="bg-[#090f18] border border-white/6 p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between border-b border-white/8 pb-2">
                      <span className="text-xs font-bold text-emerald-400">{itemB.target}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {metaB.label}
                      </span>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="p-2.5 surface-inset rounded-lg border border-white/5">
                        <p className="font-semibold text-[#e6edf3]">Primary Welfare Need:</p>
                        <p className="text-[#8b949e] text-[11px] mt-0.5">
                          {itemB.top_feature ? `Mitigate vulnerability driven by ${itemB.top_feature}.` : "Sustain economic baseline."}
                        </p>
                      </div>
                      <div className="p-2.5 surface-inset rounded-lg border border-white/5">
                        <p className="font-semibold text-[#e6edf3]">Recommended Agency Pipeline:</p>
                        <p className="text-[#8b949e] text-[11px] mt-0.5">
                          {itemB.predicted_class === "Low"
                            ? "DSWD 4Ps Emergency Relief + DOLE Livelihood Grant"
                            : itemB.predicted_class === "Middle"
                            ? "TESDA Skills Upgrading + QC Microfinance Assistance"
                            : "DTI SME Capitalization + Local Tax Incentives"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Bottom Footer */}
          <div className="px-6 py-3.5 border-t border-white/8 bg-[#0a1018]/80 backdrop-blur-md flex items-center justify-between">
            <span className="text-[11px] font-mono text-[#8b949e]">
              District V Multi-Criteria Decision Support Model
            </span>
            <button
              onClick={onClose}
              className="px-5 py-2 btn-ghost text-xs font-semibold rounded-xl cursor-pointer"
            >
              Close Comparison
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
