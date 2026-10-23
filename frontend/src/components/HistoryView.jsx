import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  History,
  Trash2,
  Download,
  ArrowRight,
  ArrowUpDown,
  Building2,
  Sparkles,
  X,
} from "lucide-react";
import {
  getClassificationHistory,
  clearClassificationHistory,
} from "../utils/historyStore";
import ComparisonModal from "./ComparisonModal";
import kalingaLogo from "../assets/KalingaBot AI.png";

const TIER_META = {
  Low: {
    level: "Level 1",
    label: "Survival",
    dot: "bg-red-500",
    text: "text-red-700",
    badge: "bg-red-50 border-red-200 text-red-700",
  },
  Middle: {
    level: "Level 2",
    label: "Subsistence",
    dot: "bg-amber-500",
    text: "text-amber-700",
    badge: "bg-amber-50 border-amber-200 text-amber-700",
  },
  High: {
    level: "Level 3",
    label: "Self-Sufficient",
    dot: "bg-emerald-500",
    text: "text-emerald-700",
    badge: "bg-emerald-50 border-emerald-200 text-emerald-700",
  },
};

const SECTOR_STYLES = {
  "Livelihood":        "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Education":         "bg-blue-50 text-blue-700 border-blue-200",
  "Housing":           "bg-amber-50 text-amber-700 border-amber-200",
  "Health":            "bg-rose-50 text-rose-700 border-rose-200",
  "Financial Support": "bg-indigo-50 text-indigo-700 border-indigo-200",
};

const formatTimestamp = (isoString) => {
  if (!isoString) return "—";
  const date = new Date(isoString);
  const day = date.getDate();
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const month = months[date.getMonth()];
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${day} ${month} ${hours}:${minutes}:${seconds}`;
};

export default function HistoryView({ onNavigateToClassifier }) {
  const [history, setHistory] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [activeAiModalItem, setActiveAiModalItem] = useState(null);

  const loadData = () => {
    const all = getClassificationHistory();
    const barangayOnly = all.filter((item) => !item.type || item.type === "barangay");
    setHistory(barangayOnly);
  };

  useEffect(() => {
    loadData();
    window.addEventListener("qc5_history_updated", loadData);
    return () => window.removeEventListener("qc5_history_updated", loadData);
  }, []);

  const handleClear = () => {
    if (window.confirm("Clear all recorded barangay classification history records?")) {
      clearClassificationHistory();
      setSelectedIds([]);
      setActiveAiModalItem(null);
    }
  };

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
      return;
    }
    if (selectedIds.length === 0) {
      setSelectedIds([id]);
      return;
    }
    if (selectedIds.length === 1) {
      setSelectedIds([...selectedIds, id]);
      return;
    }
    setSelectedIds([selectedIds[1], id]);
  };

  const handleExportCSV = () => {
    if (history.length === 0) return;
    const headers = [
      "Ordinal",
      "Timestamp",
      "Barangay Jurisdiction",
      "Predicted Tier",
      "Confidence (%)",
      "Dominant Driver",
    ];
    const rows = history.map((item, idx) => [
      `"#${history.length - idx}"`,
      `"${formatTimestamp(item.timestamp)}"`,
      `"${item.target}"`,
      `"${item.predicted_class}"`,
      item.confidence || "N/A",
      `"${item.top_feature || "N/A"}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `district_v_barangay_audit_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const canLaunchCompare = selectedIds.length === 2;
  const compareItems = history.filter((item) => selectedIds.includes(item.id));

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Banner Dashboard Card */}
      <div className="neu-surface rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-8 h-8 rounded-xl neu-inset-sm text-indigo-600 flex items-center justify-center">
              <History className="w-4 h-4" />
            </span>
            <h1 className="text-base font-bold tracking-[-0.01em] text-slate-900">
              Barangay Classification Audit Trail
            </h1>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Forensic audit ledger: track barangay model inferences, review KalingaBot suggestions, compare dual profiles, and export CSV archives.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {history.length > 0 && (
            <>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3.5 py-1.5 neu-btn text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" /> Export CSV
              </button>
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 px-3.5 py-1.5 neu-btn text-red-600 hover:text-red-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear All
              </button>
            </>
          )}
        </div>
      </div>

      {/* Comparison Action Bar & Counter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Building2 className="w-4 h-4 text-indigo-600" />
          <span>Recorded Barangay Inferences ({history.length})</span>
        </div>

        {/* Selected comparison action badge */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs font-medium text-slate-600 block">
              {selectedIds.length === 0 ? (
                <span>Compare: Select 2 barangays</span>
              ) : selectedIds.length === 1 ? (
                <span>
                  Select another <strong className="text-indigo-600">Barangay</strong>
                </span>
              ) : (
                <span>
                  Comparing 2 <strong className="text-emerald-700">Barangays</strong>
                </span>
              )}
            </span>
          </div>

          {selectedIds.length > 0 && (
            <button
              onClick={() => setSelectedIds([])}
              className="text-[11px] text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-200/50 cursor-pointer"
              title="Reset selection"
            >
              Reset
            </button>
          )}

          <button
            disabled={!canLaunchCompare}
            onClick={() => setShowCompareModal(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-transform active:scale-95 ${
              canLaunchCompare
                ? "neu-btn-primary text-white shadow-md cursor-pointer"
                : "neu-btn opacity-50 text-slate-400 cursor-not-allowed"
            }`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>
              {canLaunchCompare ? "Compare Barangays" : "Launch Comparison"}
            </span>
          </button>
        </div>
      </div>

      {/* Main Records Table or Empty State */}
      {history.length === 0 ? (
        <div className="neu-surface rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-4">
          <div className="w-14 h-14 rounded-2xl neu-inset flex items-center justify-center text-slate-400">
            <Building2 className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800">
              No Barangay Inferences Recorded
            </h3>
            <p className="text-xs text-slate-500 max-w-sm">
              Run an inference in the Barangay Classifier and records will automatically appear in this audit ledger.
            </p>
          </div>
          {onNavigateToClassifier && (
            <button
              onClick={onNavigateToClassifier}
              className="mt-2 flex items-center gap-2 px-4 py-2 neu-btn-primary text-white text-xs font-semibold rounded-xl cursor-pointer"
            >
              <span>Go to Barangay Classifier</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div className="neu-surface rounded-3xl overflow-hidden">
          {/* Table Column Headers */}
          <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-3 bg-slate-50/90 border-b border-slate-200/80 text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold items-center">
            <div className="col-span-1 flex items-center gap-2">
              <span>#</span>
            </div>
            <div className="col-span-3">TIMESTAMP</div>
            <div className="col-span-4">BARANGAY JURISDICTION</div>
            <div className="col-span-2">PREDICTED TIER</div>
            <div className="col-span-1 text-right">CONF</div>
            <div className="col-span-1 text-right">DRIVER</div>
          </div>

          {/* Table Rows with Staggered Motion */}
          <div className="divide-y divide-slate-100">
            {history.map((item, idx) => {
              const isSelected = selectedIds.includes(item.id);
              const ordinal = history.length - idx;
              const tierInfo = TIER_META[item.predicted_class] || TIER_META.Middle;
              const hasAi = Boolean(item.ai_interpretation || (item.ai_recommendations && item.ai_recommendations.length > 0));

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.25,
                    delay: idx * 0.03,
                    ease: [0.23, 1, 0.32, 1],
                  }}
                  onClick={() => toggleSelect(item.id)}
                  className={`px-5 py-3.5 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-indigo-50/40 border-l-4 border-l-indigo-600 pl-[17px]"
                      : "hover:bg-slate-50/80 border-l-4 border-l-transparent"
                  }`}
                >
                  {/* Desktop Grid Layout */}
                  <div className="hidden md:grid grid-cols-12 gap-3 items-center text-xs">
                    {/* Ordinal & Checkbox */}
                    <div className="col-span-1 flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 pointer-events-none"
                      />
                      <span className="font-mono text-slate-400 text-[11px] tabular-nums">
                        #{ordinal}
                      </span>
                    </div>

                    {/* Timestamp */}
                    <div className="col-span-3 font-mono text-[11px] text-slate-500 tabular-nums">
                      {formatTimestamp(item.timestamp)}
                    </div>

                    {/* Target Barangay + AI Button */}
                    <div className="col-span-4 font-semibold text-slate-900 truncate flex items-center gap-2">
                      <span className="truncate">{item.target}</span>
                      {hasAi && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveAiModalItem(item);
                          }}
                          className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200/80 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 transition-colors cursor-pointer"
                          title="Open KalingaBot AI Suggestions"
                        >
                          <Sparkles className="w-2.5 h-2.5 text-indigo-600" />
                          <span className="text-[10px] font-bold uppercase tracking-wide">KalingaBot AI</span>
                        </button>
                      )}
                    </div>

                    {/* Tier Indicator */}
                    <div className="col-span-2 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${tierInfo.dot}`} />
                      <span className={`font-semibold text-xs ${tierInfo.text}`}>
                        {tierInfo.level}
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({tierInfo.label})
                      </span>
                    </div>

                    {/* Confidence */}
                    <div className="col-span-1 text-right font-mono font-bold tabular-nums text-slate-800">
                      {item.confidence ? `${item.confidence}%` : "—"}
                    </div>

                    {/* Top Driver */}
                    <div className="col-span-1 text-right font-mono text-[11px] text-slate-500 truncate" title={item.top_feature}>
                      {item.top_feature ? item.top_feature.split(" ")[0] : "—"}
                    </div>
                  </div>

                  {/* Mobile Row Card */}
                  <div className="md:hidden flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-3.5 h-3.5 rounded text-indigo-600 pointer-events-none"
                      />
                      <div>
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <span>{item.target}</span>
                          {hasAi && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveAiModalItem(item);
                              }}
                              className="px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 text-[9px] font-bold uppercase"
                            >
                              AI
                            </button>
                          )}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400">
                          #{ordinal} · {formatTimestamp(item.timestamp)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className={`w-2 h-2 rounded-full ${tierInfo.dot}`} />
                        <span className={`font-semibold text-xs ${tierInfo.text}`}>
                          {tierInfo.level}
                        </span>
                      </div>
                      <div className="font-mono text-[10px] text-slate-500">
                        {item.confidence ? `${item.confidence}% conf` : ""}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── KalingaBot AI Modal (No Emojis, Clean Neumorphic) ── */}
      <AnimatePresence>
        {activeAiModalItem && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md"
            onClick={() => setActiveAiModalItem(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
              className="neu-glass rounded-3xl max-w-lg w-full border border-white/90 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.3)] flex flex-col max-h-[88vh] overflow-hidden bg-[#EEF2F6]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-[#EEF2F6]/80 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl neu-inset-sm p-1.5 flex items-center justify-center flex-shrink-0">
                    <img
                      src={kalingaLogo}
                      alt="KalingaBot AI"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold tracking-tight text-slate-900">
                        KalingaBot AI Suggestions
                      </h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-semibold">
                        Barangay {activeAiModalItem.target}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      Targeted recommendations based on community PSA indicators
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveAiModalItem(null)}
                  className="w-8 h-8 rounded-xl neu-btn text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-4 bg-[#EEF2F6]">
                {/* Meta Summary Badge */}
                <div className="flex items-center justify-between neu-surface-sm p-3 rounded-2xl text-xs">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-slate-400 block">
                      Inferred Tier
                    </span>
                    <span className="font-bold text-slate-800">
                      {TIER_META[activeAiModalItem.predicted_class]?.level || "Level"} · {TIER_META[activeAiModalItem.predicted_class]?.label || ""}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block">
                      Confidence
                    </span>
                    <span className="font-mono font-bold text-indigo-700">
                      {activeAiModalItem.confidence ?? 0}%
                    </span>
                  </div>
                </div>

                {/* AI Interpretation */}
                {activeAiModalItem.ai_interpretation && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                      Model Interpretation
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed neu-inset-sm rounded-2xl p-4">
                      {activeAiModalItem.ai_interpretation}
                    </p>
                  </div>
                )}

                {/* Targeted Program Recommendations */}
                {activeAiModalItem.ai_recommendations && activeAiModalItem.ai_recommendations.length > 0 && (
                  <div className="space-y-2.5">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                      Targeted Government Programs
                    </span>
                    <div className="space-y-2">
                      {activeAiModalItem.ai_recommendations.map((rec, i) => {
                        const style = SECTOR_STYStyles[rec.sector] || "bg-slate-50 text-slate-700 border-slate-200";
                        return (
                          <div
                            key={i}
                            className="neu-surface-sm p-3.5 rounded-2xl space-y-1.5 border border-white/80"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-xs font-bold text-slate-800 leading-tight">
                                {rec.name}
                              </h4>
                              {rec.sector && (
                                <span
                                  className={`text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider flex-shrink-0 ${style}`}
                                >
                                  {rec.sector}
                                </span>
                              )}
                            </div>
                            {rec.agency && (
                              <p className="text-[10.5px] font-mono font-semibold text-indigo-600">
                                {rec.agency}
                              </p>
                            )}
                            {rec.rationale && (
                              <p className="text-[11px] text-slate-600 leading-relaxed font-normal">
                                {rec.rationale}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3.5 border-t border-slate-200/80 bg-[#EEF2F6]/80 backdrop-blur-md flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400">
                  Logged: {formatTimestamp(activeAiModalItem.timestamp)}
                </span>
                <button
                  onClick={() => setActiveAiModalItem(null)}
                  className="px-5 py-2 neu-btn text-slate-800 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Comparison Modal */}
      {showCompareModal && compareItems.length === 2 && (
        <ComparisonModal
          isOpen={showCompareModal}
          onClose={() => setShowCompareModal(false)}
          itemA={compareItems[0]}
          itemB={compareItems[1]}
        />
      )}
    </div>
  );
}
