import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Sparkles,
  BarChart3,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const TIER_META = {
  Low: {
    level: "Level 1",
    label: "Survival",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    bar: "bg-rose-500",
  },
  Middle: {
    level: "Level 2",
    label: "Subsistence",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    bar: "bg-amber-500",
  },
  High: {
    level: "Level 3",
    label: "Self-Sufficient",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    bar: "bg-emerald-500",
  },
};

export default function ComparisonModal({ isOpen, onClose, itemA, itemB }) {
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === "Escape") onClose(); };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !itemA || !itemB) return null;

  const isTypeMismatch = itemA.type !== itemB.type;
  const tierA = TIER_META[itemA.predicted_class] || TIER_META.Middle;
  const tierB = TIER_META[itemB.predicted_class] || TIER_META.Middle;

  const parseNum = (val) => {
    if (typeof val === "number") return val;
    if (!val) return 0;
    return parseFloat(String(val).replace(/[^0-9.]/g, "")) || 0;
  };

  const inputsA = itemA.inputs || {};
  const inputsB = itemB.inputs || {};
  const allKeys = Array.from(new Set([...Object.keys(inputsA), ...Object.keys(inputsB)]));

  const indicators = allKeys.map((key) => {
    const rawA = parseNum(inputsA[key]);
    const rawB = parseNum(inputsB[key]);
    const diff = rawA - rawB;
    let higher = "equal";
    if (diff > 0.001) higher = "A";
    else if (diff < -0.001) higher = "B";
    return { key, valA: inputsA[key] ?? "—", valB: inputsB[key] ?? "—", rawA, rawB, diff, higher };
  });

  const KEY_INDICATORS = [
    "Avg Monthly Income", "Employed Heads", "Electricity Access",
    "Permanent Housing", "Informal Settlers",
  ];

  const keyRows = indicators.filter((d) =>
    KEY_INDICATORS.some((k) => d.key.toLowerCase().includes(k.toLowerCase()))
  );
  const displayedRows = showAll ? indicators : (keyRows.length >= 3 ? keyRows : indicators.slice(0, 5));

  const summarySentence =
    itemA.predicted_class === itemB.predicted_class
      ? `Both barangays fall under ${tierA.level} (${tierA.label}).`
      : `${itemA.target} is at ${tierA.level} while ${itemB.target} is at ${tierB.level}.`;

  const biggestDiff = [...indicators]
    .filter((i) => i.rawA > 0 || i.rawB > 0)
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))[0];

  // Distinguish the labels for legend — append "(A)" / "(B)" if same name
  const sameTarget = itemA.target === itemB.target;
  const labelA = sameTarget ? `${itemA.target} (A)` : itemA.target;
  const labelB = sameTarget ? `${itemB.target} (B)` : itemB.target;

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
          className="neu-surface rounded-3xl max-w-3xl w-full border border-white/90 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.25)] flex flex-col max-h-[92vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-[#EEF2F6]">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-sm font-bold tracking-tight text-slate-900">
                  Barangay Comparison
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                  Side-by-Side Analysis
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {labelA} vs {labelB}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl neu-btn text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-[#EEF2F6]">
            {isTypeMismatch ? (
              <div className="neu-surface rounded-2xl p-6 text-center space-y-3">
                <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">Type Mismatch</h3>
                <p className="text-xs text-slate-500">Select two barangay records to compare.</p>
                <button onClick={onClose} className="px-4 py-2 neu-btn rounded-xl text-xs font-semibold text-slate-700 cursor-pointer">
                  Return to Audit Trail
                </button>
              </div>
            ) : (
              <>
                {/* ── Two Profile Cards ── */}
                <div className="grid grid-cols-2 gap-3">
                  {[{ item: itemA, tier: tierA, label: labelA, color: "indigo", border: "border-t-indigo-600", conf: "text-indigo-700" },
                    { item: itemB, tier: tierB, label: labelB, color: "emerald", border: "border-t-emerald-500", conf: "text-emerald-700" }
                  ].map(({ item, tier, label, border, conf }) => (
                    <div key={label} className={`neu-surface rounded-2xl p-4 border-t-4 ${border}`}>
                      <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${conf} block mb-1`}>
                        {label}
                      </span>
                      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${tier.badge} mb-2`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${tier.bar}`} />
                        {tier.level} · {tier.label}
                      </div>
                      <div className="flex gap-3 pt-2 border-t border-slate-200/60">
                        <div className="neu-inset-sm p-2 rounded-xl flex-1 text-center">
                          <span className="text-[9px] font-mono uppercase text-slate-400 block">Confidence</span>
                          <span className={`text-sm font-bold font-mono ${conf}`}>{item.confidence ?? 0}%</span>
                        </div>
                        <div className="neu-inset-sm p-2 rounded-xl flex-1 text-center">
                          <span className="text-[9px] font-mono uppercase text-slate-400 block">Top Driver</span>
                          <span className="text-[10px] font-semibold text-slate-700 truncate block mt-0.5" title={item.top_feature}>
                            {item.top_feature?.split(" ")[0] || "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── Verdict ── */}
                <div className="neu-inset-sm rounded-2xl px-4 py-3 flex items-center gap-3">
                  <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                  <p className="text-xs font-medium text-slate-700">
                    <strong>Verdict: </strong>{summarySentence}
                    {biggestDiff && (
                      <> Widest gap: <strong>{biggestDiff.key}</strong> ({String(biggestDiff.valA)} vs {String(biggestDiff.valB)}).</>
                    )}
                  </p>
                </div>

                {/* ── Indicator Bars ── */}
                <div className="neu-surface rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Indicator Comparison</span>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] font-semibold">
                      <span className="flex items-center gap-1.5 text-indigo-700">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />{labelA}
                      </span>
                      <span className="flex items-center gap-1.5 text-emerald-700">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />{labelB}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {displayedRows.map((row) => {
                      const maxVal = Math.max(row.rawA, row.rawB, 1);
                      const pA = Math.round((row.rawA / maxVal) * 100);
                      const pB = Math.round((row.rawB / maxVal) * 100);
                      return (
                        <div key={row.key}>
                          {/* Label row */}
                          <div className="flex items-center justify-between text-[11px] mb-1.5">
                            <span className="font-mono font-bold text-indigo-700">{String(row.valA)}</span>
                            <span className="font-medium text-slate-600 text-[11px]">{row.key}</span>
                            <span className="font-mono font-bold text-emerald-700">{String(row.valB)}</span>
                          </div>
                          {/* Dual bar */}
                          <div className="flex gap-1 h-2.5 items-center">
                            {/* Bar A — grows from right */}
                            <div className="flex-1 flex justify-end">
                              <div
                                className="bg-indigo-500/80 h-full rounded-full transition-all duration-500"
                                style={{ width: `${pA}%` }}
                              />
                            </div>
                            {/* Center divider */}
                            <div className="w-px h-full bg-slate-300 flex-shrink-0" />
                            {/* Bar B — grows from left */}
                            <div className="flex-1 flex justify-start">
                              <div
                                className="bg-emerald-500/80 h-full rounded-full transition-all duration-500"
                                style={{ width: `${pB}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setShowAll(!showAll)}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer pt-1"
                  >
                    {showAll ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {showAll ? "Show Key Metrics Only" : `Show All ${indicators.length} Indicators`}
                  </button>
                </div>

                {/* ── AI Suggestions from either record (prefer A, fallback B) ── */}
                {(itemA.ai_interpretation || itemB.ai_interpretation) && (
                  <div className="neu-surface rounded-2xl p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">KalingaBot AI Insights</span>
                    </div>
                    {[
                      { label: labelA, text: itemA.ai_interpretation, recs: itemA.ai_recommendations || [] },
                      { label: labelB, text: itemB.ai_interpretation, recs: itemB.ai_recommendations || [] },
                    ].filter(({ text, recs }) => text || recs.length > 0).map(({ label, text, recs }) => (
                      <div key={label} className="neu-inset-sm rounded-xl p-3.5 space-y-2">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-600">{label}</span>
                        {text && <p className="text-[11px] text-slate-600 leading-relaxed">{text}</p>}
                        {recs.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {recs.map((rec, i) => (
                              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
                                {rec.name || rec}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 border-t border-slate-200/80 bg-[#EEF2F6] flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400">District V Income Classifier</span>
            <button
              onClick={onClose}
              className="px-5 py-2 neu-btn text-slate-800 text-xs font-semibold rounded-xl active:scale-95 cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
