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
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  HelpCircle,
  FileSpreadsheet,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import {
  getClassificationHistory,
  clearClassificationHistory,
  deleteClassificationRecord,
} from "../utils/historyStore";
import ComparisonModal from "./ComparisonModal";
import ConfirmModal from "./ConfirmModal";

const TIER_META = {
  Low: {
    level: "Level 1",
    label: "Survival",
    definition: "Critical basic needs deficits; urgent social safety net required",
    dot: "bg-red-500",
    text: "text-red-700",
    badge: "bg-red-50 text-red-700 border-red-200",
  },
  Middle: {
    level: "Level 2",
    label: "Subsistence",
    definition: "Meets basic nutrition; vulnerable to external economic shocks",
    dot: "bg-amber-500",
    text: "text-amber-700",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
  },
  High: {
    level: "Level 3",
    label: "Self-Sufficient",
    definition: "Economically resilient; focus on enterprise capital & growth",
    dot: "bg-emerald-500",
    text: "text-emerald-700",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
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

const escapeCSV = (val) => {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
};

export default function HistoryView({ onNavigateToClassifier }) {
  const [history, setHistory] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [expandedAiId, setExpandedAiId] = useState(null);
  const [showTierGuide, setShowTierGuide] = useState(false);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState(null);

  // Deletion confirmation modal state
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    type: "single", // "single" | "all"
    record: null,
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const loadData = () => {
    // Filter specifically for barangay records
    const all = getClassificationHistory();
    const barangayOnly = all.filter((item) => !item.type || item.type === "barangay");
    setHistory(barangayOnly);
  };

  useEffect(() => {
    loadData();
    window.addEventListener("qc5_history_updated", loadData);
    return () => window.removeEventListener("qc5_history_updated", loadData);
  }, []);

  const handleOpenDeleteSingle = (e, item) => {
    e.stopPropagation();
    setDeleteModal({
      isOpen: true,
      type: "single",
      record: item,
    });
  };

  const handleOpenClearAll = () => {
    setDeleteModal({
      isOpen: true,
      type: "all",
      record: null,
    });
  };

  const handleConfirmDelete = () => {
    if (deleteModal.type === "single" && deleteModal.record) {
      deleteClassificationRecord(deleteModal.record.id);
      setSelectedIds((prev) => prev.filter((id) => id !== deleteModal.record.id));
      showToast(`Audit record for Barangay ${deleteModal.record.target || "Community"} deleted.`);
    } else if (deleteModal.type === "all") {
      clearClassificationHistory();
      setSelectedIds([]);
      showToast("All recorded classification audit logs cleared.");
    }
    setDeleteModal({ isOpen: false, type: "single", record: null });
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

    // Shift selection when 2 are already selected
    setSelectedIds([selectedIds[1], id]);
  };

  // Full-Profile Archive CSV Export (Fixes missing data issue)
  const handleExportCSV = () => {
    if (history.length === 0) return;

    const headers = [
      "Record Ordinal",
      "Timestamp (Formatted)",
      "Timestamp (ISO)",
      "Barangay Jurisdiction",
      "Predicted Tier",
      "Tier Plain Definition",
      "Model Confidence (%)",
      "Probability Low (%)",
      "Probability Middle (%)",
      "Probability High (%)",
      "Average Monthly Income (PHP)",
      "Employed Household Heads (%)",
      "Informal Settlers (%)",
      "Access to Electricity (%)",
      "Safe Drinking Water Access (%)",
      "Sanitary Toilet Facility (%)",
      "Permanent Housing Materials (%)",
      "Youth Net School Enrollment (%)",
      "Secondary Education Completion (%)",
      "Average Family Size",
      "Dominant Decision Driver",
      "Policy Executive Summary",
      "Recommended Programs",
      "Recommendation Engine Source",
    ];

    const rows = history.map((item, idx) => {
      const inputs = item.inputs || {};
      const raw = item.raw_inputs || {};
      const probs = item.probabilities || {};

      // Parse indicators gracefully from inputs or raw_inputs
      const inc = raw.avg_monthly_income_php || inputs["Avg Monthly Income"] || "N/A";
      const emp = raw.pct_employed_head || inputs["Employed Heads"] || "N/A";
      const informal = raw.pct_informal_settlers || inputs["Informal Settlers"] || "N/A";
      const elec = raw.pct_with_access_to_electricity || inputs["Electricity Access"] || "N/A";
      const water = raw.pct_with_safe_water_access || inputs["Safe Water Access"] || "N/A";
      const toilet = raw.pct_with_sanitary_toilet || inputs["Sanitary Toilet"] || "N/A";
      const perm = raw.pct_permanent_house_material || inputs["Permanent Housing"] || "N/A";
      const enroll = raw.net_enrollment_rate || inputs["School Enrollment"] || "N/A";
      const secEd = raw.pct_completed_secondary_education || inputs["Secondary Educated"] || "N/A";
      const fam = raw.avg_family_size || inputs["Avg Family Size"] || "N/A";

      const lowProb = probs.Low !== undefined ? (probs.Low * 100).toFixed(1) : "N/A";
      const midProb = probs.Middle !== undefined ? (probs.Middle * 100).toFixed(1) : "N/A";
      const highProb = probs.High !== undefined ? (probs.High * 100).toFixed(1) : "N/A";

      const programsList = Array.isArray(item.ai_recommendations)
        ? item.ai_recommendations.map((r) => `${r.name || r} (${r.agency || "Lead Agency"})`).join(" | ")
        : "N/A";

      const tierDef = TIER_META[item.predicted_class]?.definition || "—";
      const engine = item.is_fallback ? "Standard Policy Benchmarks (Offline Fallback)" : (item.ai_provider === "gemini" ? "KalingaBot Gemini AI" : "Verified ML Pipeline");

      return [
        escapeCSV(`#${history.length - idx}`),
        escapeCSV(formatTimestamp(item.timestamp)),
        escapeCSV(item.timestamp || ""),
        escapeCSV(item.target || item.barangay || "District V"),
        escapeCSV(item.predicted_class || "N/A"),
        escapeCSV(tierDef),
        escapeCSV(item.confidence ? `${item.confidence}%` : "N/A"),
        escapeCSV(lowProb),
        escapeCSV(midProb),
        escapeCSV(highProb),
        escapeCSV(inc),
        escapeCSV(emp),
        escapeCSV(informal),
        escapeCSV(elec),
        escapeCSV(water),
        escapeCSV(toilet),
        escapeCSV(perm),
        escapeCSV(enroll),
        escapeCSV(secEd),
        escapeCSV(fam),
        escapeCSV(item.top_feature || "N/A"),
        escapeCSV(item.ai_interpretation || "N/A"),
        escapeCSV(programsList),
        escapeCSV(engine),
      ];
    });

    // Prepend UTF-8 BOM so Microsoft Excel renders currency and symbols correctly
    const csvContent = "\uFEFF" + [headers.map(escapeCSV).join(","), ...rows.map((e) => e.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `district_v_barangay_full_audit_archive_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Full-profile archive downloaded (${history.length} records, 24 indicators).`);
  };

  const canLaunchCompare = selectedIds.length === 2;
  const compareItems = history.filter((item) => selectedIds.includes(item.id));

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-8 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-slate-900 text-white text-xs font-semibold shadow-xl border border-slate-700/60"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Banner Dashboard Card */}
      <div className="neu-surface rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-7 h-7 rounded-xl neu-inset-sm text-indigo-600 flex items-center justify-center flex-shrink-0">
              <History className="w-3.5 h-3.5" />
            </span>
            <h1 className="text-sm font-bold tracking-[-0.01em] text-slate-900 truncate">
              Barangay Classification Audit Trail
            </h1>
          </div>
          <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
            Track barangay inferences, compare profiles, and export full-profile CSV archives.
          </p>
        </div>

        {/* Action buttons — always in a single row, no wrapping */}
        <div className="flex items-center gap-2 flex-shrink-0 flex-nowrap">
          <button
            onClick={() => setShowTierGuide(!showTierGuide)}
            className="flex items-center gap-1 px-2.5 py-1.5 neu-btn text-indigo-600 text-xs font-semibold rounded-xl cursor-pointer whitespace-nowrap"
            title="View plain-language definitions for SWDI income tiers"
          >
            <HelpCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="hidden sm:inline">Tier Definitions</span>
            <span className="sm:hidden">Tiers</span>
          </button>

          {history.length > 0 && (
            <>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1 px-2.5 py-1.5 neu-btn text-slate-700 text-xs font-semibold rounded-xl cursor-pointer whitespace-nowrap"
                title="Export complete 24-column dataset to CSV"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                <span>Export CSV ({history.length})</span>
              </button>
              <button
                onClick={handleOpenClearAll}
                className="flex items-center gap-1 px-2.5 py-1.5 neu-btn text-rose-600 hover:text-rose-700 text-xs font-semibold rounded-xl cursor-pointer whitespace-nowrap"
                title="Clear all recorded history"
              >
                <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="hidden sm:inline">Clear All</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Plain-Language Tier Definitions Accordion */}
      <AnimatePresence>
        {showTierGuide && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <div className="neu-surface rounded-3xl p-5 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl neu-inset-sm text-indigo-600 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800 leading-none">SWDI Income Classification Tiers</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Plain-language definitions for each income bracket</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTierGuide(false)}
                  className="flex items-center gap-1 px-2.5 py-1 neu-btn text-slate-500 text-[10px] font-semibold rounded-lg cursor-pointer"
                >
                  Close
                </button>
              </div>

              {/* Three Tier Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                {/* Level 1 — Survival */}
                <div className="neu-inset rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    </span>
                    <div>
                      <p className="text-[10px] font-mono font-semibold text-rose-600 uppercase tracking-widest leading-none">Level 1</p>
                      <p className="text-xs font-bold text-slate-800 leading-tight">Survival</p>
                    </div>
                    <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-semibold border border-rose-200/60 whitespace-nowrap">
                      Low-Income
                    </span>
                  </div>
                  <div className="w-full h-px bg-slate-200/70" />
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Household income falls below subsistence food threshold. Critical multi-dimensional deprivation requiring immediate conditional cash transfers (4Ps) and emergency assistance.
                  </p>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    <span className="text-[10px] text-slate-500 font-medium">Priority: DSWD 4Ps, Emergency Aid</span>
                  </div>
                </div>

                {/* Level 2 — Subsistence */}
                <div className="neu-inset rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    </span>
                    <div>
                      <p className="text-[10px] font-mono font-semibold text-amber-600 uppercase tracking-widest leading-none">Level 2</p>
                      <p className="text-xs font-bold text-slate-800 leading-tight">Subsistence</p>
                    </div>
                    <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold border border-amber-200/60 whitespace-nowrap">
                      Middle-Income
                    </span>
                  </div>
                  <div className="w-full h-px bg-slate-200/70" />
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Meets primary nutritional requirements but remains vulnerable to price inflation, medical emergencies, and informal work. Primary intervention: sustainable livelihood and vocational training.
                  </p>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span className="text-[10px] text-slate-500 font-medium">Priority: DOLE TUPAD, TESDA SLP</span>
                  </div>
                </div>

                {/* Level 3 — Self-Sufficient */}
                <div className="neu-inset rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    </span>
                    <div>
                      <p className="text-[10px] font-mono font-semibold text-emerald-600 uppercase tracking-widest leading-none">Level 3</p>
                      <p className="text-xs font-bold text-slate-800 leading-tight">Self-Sufficient</p>
                    </div>
                    <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold border border-emerald-200/60 whitespace-nowrap">
                      High-Income
                    </span>
                  </div>
                  <div className="w-full h-px bg-slate-200/70" />
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Financially independent and resilient with permanent housing tenure and strong school completion. Focused on MSME capital development and higher educational scholarships.
                  </p>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[10px] text-slate-500 font-medium">Priority: DTI MSME, CHED Scholarships</span>
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                <span>Compare: Select 2 barangays to inspect dual metrics</span>
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
              Run a single community classification or upload a multi-barangay spreadsheet to automatically populate this forensic audit ledger.
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
        <div className="neu-surface rounded-3xl overflow-hidden shadow-sm">
          {/* Table Column Headers */}
          <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-3 bg-slate-50/90 border-b border-slate-200/80 text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold items-center">
            <div className="col-span-1 flex items-center gap-2">
              <span>#</span>
            </div>
            <div className="col-span-2">TIMESTAMP</div>
            <div className="col-span-4">BARANGAY JURISDICTION</div>
            <div className="col-span-2">PREDICTED TIER</div>
            <div className="col-span-1 text-right">CONF</div>
            <div className="col-span-1 text-right">DRIVER</div>
            <div className="col-span-1 text-right">ACTIONS</div>
          </div>

          {/* Table Rows with Staggered Motion */}
          <div className="divide-y divide-slate-100">
            {history.map((item, idx) => {
              const isSelected = selectedIds.includes(item.id);
              const ordinal = history.length - idx;
              const tierInfo = TIER_META[item.predicted_class] || TIER_META.Middle;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.25,
                    delay: idx * 0.02,
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
                    <div className="col-span-2 font-mono text-[11px] text-slate-500 tabular-nums">
                      {formatTimestamp(item.timestamp)}
                    </div>

                    {/* Target Barangay */}
                    <div className="col-span-4 font-semibold text-slate-900 truncate flex items-center gap-2">
                      <span className="truncate">{item.target || item.barangay}</span>
                      {item.ai_interpretation && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedAiId(expandedAiId === item.id ? null : item.id);
                          }}
                          className="flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 hover:bg-indigo-100 transition-colors cursor-pointer"
                          title="View KalingaBot policy summary"
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          <span className="text-[9px] font-bold uppercase tracking-wide">AI</span>
                          {expandedAiId === item.id ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
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
                    <div className="col-span-1 text-right font-mono text-[11px] text-slate-500 truncate" title={item.top_feature || ""}>
                      {item.top_feature ? item.top_feature.split(" ")[0] : "—"}
                    </div>

                    {/* Row Delete Action */}
                    <div className="col-span-1 flex items-center justify-end">
                      <button
                        onClick={(e) => handleOpenDeleteSingle(e, item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete this record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* AI Expand Panel */}
                  <AnimatePresence>
                    {expandedAiId === item.id && item.ai_interpretation && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                        className="overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="mt-3 mx-1 p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2">
                          <div className="flex items-center justify-between text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                            <span className="flex items-center gap-1.5">
                              <Sparkles className="w-3 h-3 text-indigo-600" />
                              KalingaBot Executive Policy Summary
                            </span>
                            {item.is_fallback && (
                              <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-mono">
                                Standard Fallback
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed font-normal">
                            {item.ai_interpretation}
                          </p>
                          {item.ai_recommendations?.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              <span className="text-[10px] font-mono font-semibold text-slate-500 block uppercase">
                                Recommended Agency Interventions:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {item.ai_recommendations.map((rec, ri) => (
                                  <span
                                    key={ri}
                                    className="text-[10px] px-2.5 py-1 rounded-xl bg-white border border-indigo-200 text-indigo-800 font-medium shadow-xs"
                                  >
                                    <strong>{rec.name || rec}</strong> {rec.agency ? `(${rec.agency})` : ""}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

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
                        <div className="font-semibold text-slate-900">
                          {item.target || item.barangay}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400">
                          #{ordinal} · {formatTimestamp(item.timestamp)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
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

                      <button
                        onClick={(e) => handleOpenDeleteSingle(e, item)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modern Confirmation Modal for Delete Operations */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, type: "single", record: null })}
        onConfirm={handleConfirmDelete}
        title={
          deleteModal.type === "all"
            ? "Clear All Audit Records?"
            : `Delete Record: ${deleteModal.record?.target || "Barangay"}`
        }
        message={
          deleteModal.type === "all"
            ? `Are you sure you want to permanently delete all ${history.length} classification audit logs? This action will purge all historical inferences and comparisons.`
            : `Are you sure you want to remove the inference record for Barangay ${deleteModal.record?.target || ""} recorded on ${formatTimestamp(deleteModal.record?.timestamp)}?`
        }
        confirmText={deleteModal.type === "all" ? "Clear All Logs" : "Delete Record"}
        confirmVariant="danger"
        itemDetails={
          deleteModal.type === "single" && deleteModal.record
            ? {
                title: `Barangay ${deleteModal.record.target || deleteModal.record.barangay}`,
                subtitle: `Timestamp: ${formatTimestamp(deleteModal.record.timestamp)}`,
                badge: `Predicted: ${deleteModal.record.predicted_class} Tier (${deleteModal.record.confidence || "—"}% confidence)`,
              }
            : null
        }
      />

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
