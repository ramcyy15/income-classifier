import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  TrendingUp,
  Scale,
  Sparkles,
  BarChart3,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

const TIER_META = {
  Low: {
    level: "Level 1",
    label: "Survival",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
  },
  Middle: {
    level: "Level 2",
    label: "Subsistence",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  High: {
    level: "Level 3",
    label: "Self-Sufficient",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
};

export default function ComparisonModal({ isOpen, onClose, itemA, itemB }) {
  const [showAllMetrics, setShowAllMetrics] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !itemA || !itemB) return null;

  // Safety check: ensure both items are the same type
  const isTypeMismatch = itemA.type !== itemB.type;
  const isBarangay = itemA.type === "barangay";

  const tierA = TIER_META[itemA.predicted_class] || TIER_META.Middle;
  const tierB = TIER_META[itemB.predicted_class] || TIER_META.Middle;

  const parseNum = (val) => {
    if (typeof val === "number") return val;
    if (!val) return 0;
    const cleaned = String(val).replace(/[^0-9.]/g, "");
    return parseFloat(cleaned) || 0;
  };

  const inputsA = itemA.inputs || {};
  const inputsB = itemB.inputs || {};
  const allKeys = Array.from(new Set([...Object.keys(inputsA), ...Object.keys(inputsB)]));

  // Process indicators
  const indicators = allKeys.map((key) => {
    const rawA = parseNum(inputsA[key]);
    const rawB = parseNum(inputsB[key]);
    const diff = rawA - rawB;
    const isCurrency = String(inputsA[key] || inputsB[key]).includes("PHP");
    const isPercent = String(inputsA[key] || inputsB[key]).includes("%");

    let higher = "equal";
    if (diff > 0.001) higher = "A";
    else if (diff < -0.001) higher = "B";

    const percentDiff = rawB > 0 ? Math.abs(((diff / rawB) * 100)).toFixed(0) : null;

    return {
      key,
      valA: inputsA[key] ?? "—",
      valB: inputsB[key] ?? "—",
      rawA,
      rawB,
      diff,
      higher,
      isCurrency,
      isPercent,
      percentDiff,
    };
  });

  // Filter top 5 key indicators for clean, uncluttered graph
  const keyIndicatorNames = [
    "Avg Monthly Income",
    "Employed Heads",
    "Electricity Access",
    "Permanent Housing",
    "Informal Settlers",
  ];

  const displayedIndicators = showAllMetrics
    ? indicators
    : indicators.filter((d) =>
        keyIndicatorNames.some((k) => d.key.toLowerCase().includes(k.toLowerCase()))
      ).length >= 3
    ? indicators.filter((d) =>
        keyIndicatorNames.some((k) => d.key.toLowerCase().includes(k.toLowerCase()))
      )
    : indicators.slice(0, 5);

  // Normalized data for side-by-side grouped bar chart (scaled 0-100 so PHP and % can sit comfortably on one clean chart)
  const chartData = displayedIndicators.map((ind) => {
    const maxVal = Math.max(ind.rawA, ind.rawB, 1);
    return {
      name: ind.key.replace("Avg ", "").replace("Monthly ", "Mo. "),
      subjectA: Math.round((ind.rawA / maxVal) * 100),
      subjectB: Math.round((ind.rawB / maxVal) * 100),
      valA: ind.valA,
      valB: ind.valB,
    };
  });

  // Generate simple 1-sentence comparison takeaway
  let summarySentence = "";
  if (itemA.predicted_class === itemB.predicted_class) {
    summarySentence = `Both ${itemA.target} and ${itemB.target} fall under ${tierA.level} (${tierA.label}).`;
  } else {
    summarySentence = `${itemA.target} is classified at ${tierA.level} (${tierA.label}), while ${itemB.target} is classified at ${tierB.level} (${tierB.label}).`;
  }

  // Find the single metric with the biggest numerical percentage difference
  const biggestDiffMetric = [...indicators]
    .filter((i) => i.rawA > 0 || i.rawB > 0)
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))[0];

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/40 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          className="neu-glass rounded-3xl max-w-4xl w-full border border-white/90 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.3),-8px_-8px_20px_#FFFFFF] flex flex-col max-h-[92vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Top Header ── */}
          <div className="px-6 py-4 border-b border-white/80 flex items-center justify-between bg-[#EEF2F6]/75 backdrop-blur-md">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold tracking-[-0.015em] text-slate-900">
                  Side-by-Side Comparison
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                  Barangay Comparison
                </span>
              </div>
              <p className="text-[11.5px] text-slate-500 font-medium mt-0.5">
                Direct indicator breakdown & model inference contrast
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl neu-btn text-slate-500 hover:text-slate-800 flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
              title="Close modal (Esc)"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── Scrollable Body ── */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-[#EEF2F6]">
            {/* If Type Mismatch (Safety Alert) */}
            {isTypeMismatch ? (
              <div className="neu-surface rounded-2xl p-6 text-center space-y-3">
                <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">Cannot Compare Different Types</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Comparisons are only permitted between <strong>Barangay ↔ Barangay</strong> or <strong>Household ↔ Household</strong>. Please select two matching records from the history list.
                </p>
                <button
                  onClick={onClose}
                  className="px-4 py-2 neu-btn rounded-xl text-xs font-semibold text-slate-700"
                >
                  Return to Audit Trail
                </button>
              </div>
            ) : (
              <>
                {/* ── Subject Cards: Profile A vs Profile B ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                  {/* Card A (Indigo) */}
                  <div className="neu-surface rounded-2xl p-4.5 border-t-4 border-t-indigo-600 flex flex-col justify-between relative">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono font-semibold text-indigo-700 uppercase tracking-wider">
                          Subject A
                        </span>
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${tierA.badge}`}>
                          {tierA.level} · {tierA.label}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 truncate">
                        {itemA.target}
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-200/60 text-center">
                      <div className="neu-inset-sm p-2 rounded-xl">
                        <span className="text-[9.5px] font-mono uppercase text-slate-400 block">
                          Confidence
                        </span>
                        <span className="text-sm font-bold font-mono tabular-nums text-indigo-700">
                          {itemA.confidence ?? 0}%
                        </span>
                      </div>
                      <div className="neu-inset-sm p-2 rounded-xl">
                        <span className="text-[9.5px] font-mono uppercase text-slate-400 block truncate">
                          Primary Driver
                        </span>
                        <span className="text-xs font-semibold text-slate-700 truncate block mt-0.5" title={itemA.top_feature}>
                          {itemA.top_feature || "Baseline Income"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card B (Emerald) */}
                  <div className="neu-surface rounded-2xl p-4.5 border-t-4 border-t-emerald-500 flex flex-col justify-between relative">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono font-semibold text-emerald-700 uppercase tracking-wider">
                          Subject B
                        </span>
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${tierB.badge}`}>
                          {tierB.level} · {tierB.label}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 truncate">
                        {itemB.target}
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-200/60 text-center">
                      <div className="neu-inset-sm p-2 rounded-xl">
                        <span className="text-[9.5px] font-mono uppercase text-slate-400 block">
                          Confidence
                        </span>
                        <span className="text-sm font-bold font-mono tabular-nums text-emerald-700">
                          {itemB.confidence ?? 0}%
                        </span>
                      </div>
                      <div className="neu-inset-sm p-2 rounded-xl">
                        <span className="text-[9.5px] font-mono uppercase text-slate-400 block truncate">
                          Primary Driver
                        </span>
                        <span className="text-xs font-semibold text-slate-700 truncate block mt-0.5" title={itemB.top_feature}>
                          {itemB.top_feature || "Baseline Income"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Quick 1-Sentence Takeaway ── */}
                <div className="neu-surface-sm rounded-2xl px-4 py-3 border border-indigo-100 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-xl neu-inset-sm flex items-center justify-center text-indigo-600 flex-shrink-0">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-xs font-medium text-slate-700 leading-snug">
                    <strong>Verdict: </strong> {summarySentence}
                  </p>
                </div>

                {/* ── THE Graph: Clean, Single Grouped Bar Chart ── */}
                <div className="neu-surface rounded-3xl p-5 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                        Key Metrics Comparison
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Side-by-side relative intensity (hover bars to view exact values)
                      </p>
                    </div>

                    {/* Toggle: Key vs All */}
                    <div className="flex items-center neu-inset p-1 rounded-xl text-[11px] font-semibold">
                      <button
                        onClick={() => setShowAllMetrics(false)}
                        className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                          !showAllMetrics
                            ? "neu-surface-sm text-slate-900 font-bold"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Key Metrics
                      </button>
                      <button
                        onClick={() => setShowAllMetrics(true)}
                        className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                          showAllMetrics
                            ? "neu-surface-sm text-slate-900 font-bold"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        All Indicators
                      </button>
                    </div>
                  </div>

                  {/* Chart Canvas */}
                  <div className="h-60 w-full pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{ top: 12, right: 10, left: -22, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10.5, fill: "#475569", fontWeight: 500 }}
                          interval={0}
                        />
                        <YAxis
                          tick={{ fontSize: 9.5, fill: "#94A3B8" }}
                          domain={[0, 100]}
                          unit="%"
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload || !payload.length) return null;
                            const d = payload[0].payload;
                            return (
                              <div className="neu-surface p-3 rounded-xl shadow-xl border border-white/90 text-xs space-y-1.5 min-w-[170px]">
                                <p className="font-bold text-slate-800 border-b border-slate-200/60 pb-1">
                                  {d.name}
                                </p>
                                <div className="flex items-center justify-between text-indigo-700">
                                  <span className="font-medium">{itemA.target}:</span>
                                  <span className="font-mono font-bold">{d.valA}</span>
                                </div>
                                <div className="flex items-center justify-between text-emerald-700">
                                  <span className="font-medium">{itemB.target}:</span>
                                  <span className="font-mono font-bold">{d.valB}</span>
                                </div>
                              </div>
                            );
                          }}
                        />
                        <Bar
                          dataKey="subjectA"
                          name={itemA.target}
                          fill="#4F46E5"
                          radius={[5, 5, 0, 0]}
                          maxBarSize={32}
                        />
                        <Bar
                          dataKey="subjectB"
                          name={itemB.target}
                          fill="#10B981"
                          radius={[5, 5, 0, 0]}
                          maxBarSize={32}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: 11, paddingTop: 6 }}
                          iconType="circle"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* ── Indicator-by-Indicator Breakdown Table ── */}
                <div className="neu-surface rounded-3xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Detailed Indicator Breakdown
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Exact values and divergence leader
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-semibold">
                      <span className="flex items-center gap-1.5 text-indigo-700">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                        {itemA.target}
                      </span>
                      <span className="flex items-center gap-1.5 text-emerald-700">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        {itemB.target}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {displayedIndicators.map((row) => {
                      const maxVal = Math.max(row.rawA, row.rawB, 1);
                      const pA = Math.round((row.rawA / maxVal) * 100);
                      const pB = Math.round((row.rawB / maxVal) * 100);

                      return (
                        <div
                          key={row.key}
                          className="neu-surface-sm p-3 rounded-2xl flex flex-col gap-2 hover:border-slate-300 transition-colors"
                        >
                          <div className="flex items-center justify-between text-xs">
                            {/* Value A */}
                            <span className="font-bold font-mono tabular-nums text-indigo-700 min-w-[70px] text-left">
                              {String(row.valA)}
                            </span>

                            {/* Indicator Title & Leader Chip */}
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-semibold text-slate-800">
                                {row.key}
                              </span>

                              {row.higher !== "equal" && (
                                <span
                                  className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
                                    row.higher === "A"
                                      ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                                      : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  }`}
                                >
                                  {row.higher === "A"
                                    ? `▲ ${itemA.target} higher`
                                    : `▲ ${itemB.target} higher`}
                                </span>
                              )}
                            </div>

                            {/* Value B */}
                            <span className="font-bold font-mono tabular-nums text-emerald-700 min-w-[70px] text-right">
                              {String(row.valB)}
                            </span>
                          </div>

                          {/* Visual Proportional Comparison Bar */}
                          <div className="grid grid-cols-2 gap-2 h-2 neu-inset rounded-full overflow-hidden p-0.5">
                            <div className="flex justify-end">
                              <div
                                className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                                style={{ width: `${pA}%` }}
                              />
                            </div>
                            <div className="flex justify-start">
                              <div
                                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                                style={{ width: `${pB}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── Key Highlights (3 Clean Bullets - Simple & Crisp) ── */}
                <div className="neu-surface-sm rounded-2xl p-4 space-y-2 border border-slate-200/80">
                  <h4 className="text-[11px] font-mono uppercase tracking-wider font-bold text-slate-500">
                    Key Comparison Highlights
                  </h4>
                  <ul className="text-xs text-slate-700 space-y-1.5 font-normal">
                    {biggestDiffMetric && (
                      <li className="flex items-start gap-2">
                        <span className="text-indigo-600 font-bold">•</span>
                        <span>
                          <strong>Widest Divergence:</strong>{" "}
                          <span className="font-medium">{biggestDiffMetric.key}</span> differs the most between the two profiles ({String(biggestDiffMetric.valA)} vs {String(biggestDiffMetric.valB)}).
                        </span>
                      </li>
                    )}
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>
                        <strong>Target Priority:</strong>{" "}
                        {itemA.predicted_class === "Low" || itemB.predicted_class === "Low"
                          ? "The profile in Level 1 requires urgent social protection (emergency cash/livelihood relief)."
                          : "Both profiles have moved past Level 1, focusing primarily on employment stability."}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-600 font-bold">•</span>
                      <span>
                        <strong>Ensemble Confidence:</strong> The stacking model confidence difference is{" "}
                        <strong>{Math.abs((itemA.confidence || 0) - (itemB.confidence || 0))}%</strong>.
                      </span>
                    </li>
                  </ul>
                </div>
              </>
            )}
          </div>

          {/* ── Bottom Modal Footer ── */}
          <div className="px-6 py-3.5 border-t border-white/80 bg-[#EEF2F6]/75 backdrop-blur-md flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400">
              District V ML Income Classifier
            </span>
            <button
              onClick={onClose}
              className="px-5 py-2 neu-btn text-slate-800 text-xs font-semibold rounded-xl transition-transform active:scale-95 cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
