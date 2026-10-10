import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  History, Trash2, Download, ArrowRight, ArrowUpDown,
  CheckCircle2, Calendar, AlertCircle
} from "lucide-react";
import { getClassificationHistory, clearClassificationHistory } from "../utils/historyStore";
import ComparisonModal from "./ComparisonModal";

const TIER_META = {
  Low: {
    level: "Level 1",
    label: "Survival",
    dot: "bg-rose-500",
    text: "text-rose-400",
  },
  Middle: {
    level: "Level 2",
    label: "Subsistence",
    dot: "bg-amber-500",
    text: "text-amber-400",
  },
  High: {
    level: "Level 3",
    label: "Self-Sufficient",
    dot: "bg-emerald-500",
    text: "text-emerald-400",
  },
};

const formatTimestamp = (isoString) => {
  if (!isoString) return "—";
  const date = new Date(isoString);
  const day = date.getDate();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${day} ${month} ${hours}:${minutes}:${seconds}`;
};

export default function HistoryView({ onNavigateToClassifier }) {
  const [history, setHistory] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filterType, setFilterType] = useState("all");
  const [showCompareModal, setShowCompareModal] = useState(false);

  const loadData = () => {
    setHistory(getClassificationHistory());
  };

  useEffect(() => {
    loadData();
    window.addEventListener("qc5_history_updated", loadData);
    return () => window.removeEventListener("qc5_history_updated", loadData);
  }, []);

  const handleClear = () => {
    if (window.confirm("Clear all recorded classification history records?")) {
      clearClassificationHistory();
      setSelectedIds([]);
    }
  };

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      if (selectedIds.length >= 2) {
        setSelectedIds([selectedIds[1], id]);
      } else {
        setSelectedIds([...selectedIds, id]);
      }
    }
  };

  const handleExportCSV = () => {
    if (history.length === 0) return;
    const headers = ["Ordinal", "Timestamp", "Type", "Target", "Predicted Tier", "Confidence (%)", "Top Driver"];
    const rows = history.map((item, idx) => [
      `"#${history.length - idx}"`,
      `"${formatTimestamp(item.timestamp)}"`,
      `"${item.type}"`,
      `"${item.target}"`,
      `"${item.predicted_class}"`,
      item.confidence || "N/A",
      `"${item.top_feature || "N/A"}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `district_v_audit_ledger_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredHistory = history.filter((item) => {
    if (filterType === "all") return true;
    return item.type === filterType;
  });

  const compareItems = history.filter((item) => selectedIds.includes(item.id));

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Banner Dashboard Card */}
      <div className="surface-card rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <History className="w-4 h-4" />
            </span>
            <h1 className="text-base font-bold tracking-[-0.01em] text-[#e6edf3]">
              Classification Audit Trail
            </h1>
          </div>
          <p className="text-[11px] text-[#8b949e] font-medium">
            Forensic audit ledger: track model inference outputs, compare dual profiles, and export CSV archives.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {history.length > 0 && (
            <>
              <button
                onClick={handleExportCSV}
                className="btn-ghost flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#8b949e]" /> Export CSV
              </button>
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:text-rose-300 text-xs font-semibold rounded-xl cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear All
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter Tabs & Comparison Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center surface-inset p-1.5 rounded-xl border border-white/5 gap-1.5">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterType === "all" ? "bg-blue-600/20 border border-blue-500/30 text-blue-400 font-bold" : "text-[#8b949e] hover:text-[#e6edf3]"
            }`}
          >
            All Logs ({history.length})
          </button>
          <button
            onClick={() => setFilterType("barangay")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterType === "barangay" ? "bg-blue-600/20 border border-blue-500/30 text-blue-400 font-bold" : "text-[#8b949e] hover:text-[#e6edf3]"
            }`}
          >
            Barangay ({history.filter((h) => h.type === "barangay").length})
          </button>
          <button
            onClick={() => setFilterType("individual")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterType === "individual" ? "bg-blue-600/20 border border-blue-500/30 text-blue-400 font-bold" : "text-[#8b949e] hover:text-[#e6edf3]"
            }`}
          >
            Household ({history.filter((h) => h.type === "individual").length})
          </button>
        </div>

        {/* Selected comparison action badge */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-[#8b949e]">
            Selected for comparison: <strong className="text-blue-400 font-mono font-bold">{selectedIds.length}/2</strong>
          </span>
          <button
            disabled={selectedIds.length !== 2}
            onClick={() => setShowCompareModal(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              selectedIds.length === 2
                ? "btn-primary cursor-pointer"
                : "surface-inset opacity-40 text-[#484f58] border border-white/5 cursor-not-allowed"
            }`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" /> Launch Side-by-Side
          </button>
        </div>
      </div>

      {/* Audit Ledger Table Container */}
      {filteredHistory.length === 0 ? (
        <div className="surface-card rounded-2xl p-12 text-center border border-white/5">
          <div className="w-12 h-12 rounded-xl surface-inset border border-white/5 flex items-center justify-center mx-auto mb-3 text-[#8b949e]">
            <History className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-[#e6edf3]">No Classification Runs Yet</h3>
          <p className="text-xs text-[#8b949e] mt-1 max-w-sm mx-auto font-normal">
            Run an inference in the Barangay or Household classifier and records will automatically appear in this audit ledger.
          </p>
          <button
            onClick={onNavigateToClassifier}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 btn-primary text-xs font-semibold rounded-xl cursor-pointer"
          >
            Go to Classifier <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="surface-card rounded-2xl overflow-hidden border border-white/5">
          {/* Table Column Headers */}
          <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-3 bg-[#0a1018] border-b border-white/8 text-[10px] font-mono uppercase tracking-[0.12em] text-[#8b949e] font-semibold items-center">
            <div className="col-span-1 flex items-center gap-2">
              <span>#</span>
            </div>
            <div className="col-span-3">TIMESTAMP</div>
            <div className="col-span-3">TARGET JURISDICTION</div>
            <div className="col-span-1">TYPE</div>
            <div className="col-span-2">PREDICTED TIER</div>
            <div className="col-span-1 text-right">CONF</div>
            <div className="col-span-1 text-right">DRIVER</div>
          </div>

          {/* Table Rows with Staggered Motion */}
          <div className="divide-y divide-white/5">
            {filteredHistory.map((item, idx) => {
              const isSelected = selectedIds.includes(item.id);
              const ordinal = history.length - history.findIndex((h) => h.id === item.id);
              const tierInfo = TIER_META[item.predicted_class] || TIER_META.Middle;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: idx * 0.03, ease: [0.23, 1, 0.32, 1] }}
                  onClick={() => toggleSelect(item.id)}
                  className={`px-5 py-3.5 transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-blue-500/10 border-l-4 border-l-blue-500 pl-[17px]"
                      : "hover:bg-[#111d2e]/40 border-l-4 border-l-transparent"
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
                        className="w-3.5 h-3.5 rounded accent-blue-500 pointer-events-none"
                      />
                      <span className="font-mono text-[#8b949e] text-[11px] tabular-nums">
                        #{ordinal}
                      </span>
                    </div>

                    {/* Timestamp */}
                    <div className="col-span-3 font-mono text-[11px] text-[#8b949e] tabular-nums">
                      {formatTimestamp(item.timestamp)}
                    </div>

                    {/* Target */}
                    <div className="col-span-3 font-semibold text-[#e6edf3] truncate">
                      {item.target}
                    </div>

                    {/* Type Badge */}
                    <div className="col-span-1">
                      <span
                        className={`text-[9px] font-mono uppercase tracking-[0.1em] px-2 py-0.5 rounded-md font-semibold ${
                          item.type === "barangay"
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        }`}
                      >
                        {item.type === "barangay" ? "BRGY" : "INDV"}
                      </span>
                    </div>

                    {/* Tier Indicator */}
                    <div className="col-span-2 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${tierInfo.dot}`} />
                      <span className={`font-semibold text-xs ${tierInfo.text}`}>
                        {tierInfo.level}
                      </span>
                      <span className="text-[10px] text-[#8b949e] font-normal">
                        ({tierInfo.label})
                      </span>
                    </div>

                    {/* Confidence */}
                    <div className="col-span-1 text-right font-mono font-bold tabular-nums text-[#e6edf3]">
                      {item.confidence ? `${item.confidence}%` : "—"}
                    </div>

                    {/* Top Driver */}
                    <div className="col-span-1 text-right text-[11px] text-[#8b949e] truncate" title={item.top_feature}>
                      {item.top_feature ? item.top_feature.split(" ")[0] : "—"}
                    </div>
                  </div>

                  {/* Mobile Fallback Card Layout */}
                  <div className="md:hidden flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-3.5 h-3.5 rounded accent-blue-500 pointer-events-none"
                        />
                        <span className="font-mono text-[#8b949e] text-xs">#{ordinal}</span>
                        <h4 className="font-semibold text-[#e6edf3] text-sm">{item.target}</h4>
                      </div>
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded-md font-semibold ${
                        item.type === "barangay" ? "bg-blue-500/10 text-blue-400" : "bg-emerald-500/10 text-emerald-400"
                      }`}>
                        {item.type === "barangay" ? "BRGY" : "INDV"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-[#8b949e]">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${tierInfo.dot}`} />
                        <span className={`font-semibold ${tierInfo.text}`}>{tierInfo.level}</span>
                      </div>
                      <div className="font-mono font-bold text-[#e6edf3]">
                        {item.confidence ? `${item.confidence}%` : "—"}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[#8b949e] font-mono">
                      <span>{formatTimestamp(item.timestamp)}</span>
                      {item.top_feature && <span>Driver: {item.top_feature}</span>}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Side-by-Side Comparison Modal */}
      <ComparisonModal
        isOpen={showCompareModal && compareItems.length === 2}
        onClose={() => setShowCompareModal(false)}
        itemA={compareItems[0]}
        itemB={compareItems[1]}
      />
    </div>
  );
}
