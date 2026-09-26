import React, { useState, useEffect } from "react";
import {
  History, Trash2, Download, ArrowRight, ArrowUpDown,
  CheckCircle2, ChevronRight, X, Calendar, AlertCircle,
  TrendingUp, Award, Layers, Sparkles, Scale, BarChart2
} from "lucide-react";
import { getClassificationHistory, clearClassificationHistory } from "../utils/historyStore";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from "recharts";

const TIER_COLORS = {
  Low: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    dot: "bg-red-500",
    badge: "bg-red-100 text-red-800",
    label: "Survival (Level 1)",
  },
  Middle: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
    badge: "bg-amber-100 text-amber-800",
    label: "Subsistence (Level 2)",
  },
  High: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
    badge: "bg-emerald-100 text-emerald-800",
    label: "Self-Sufficient (Level 3)",
  },
};

export default function HistoryView({ onNavigateToClassifier }) {
  const [history, setHistory] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filterType, setFilterType] = useState("all");
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [activeChartTab, setActiveChartTab] = useState("bar"); // "bar" | "radar"

  const loadData = () => {
    setHistory(getClassificationHistory());
  };

  useEffect(() => {
    loadData();
    window.addEventListener("qc5_history_updated", loadData);
    return () => window.removeEventListener("qc5_history_updated", loadData);
  }, []);

  const handleClear = () => {
    if (window.confirm("Clear all recorded classification history?")) {
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
    const headers = ["Timestamp", "Type", "Target", "Predicted Tier", "Confidence (%)", "Top Metric"];
    const rows = history.map((item) => [
      `"${new Date(item.timestamp).toLocaleString()}"`,
      `"${item.type}"`,
      `"${item.target}"`,
      `"${item.predicted_class}"`,
      item.confidence || "N/A",
      `"${item.top_feature || "N/A"}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `district_v_classification_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredHistory = history.filter((item) => {
    if (filterType === "all") return true;
    return item.type === filterType;
  });

  const compareItems = history.filter((item) => selectedIds.includes(item.id));
  const itemA = compareItems[0];
  const itemB = compareItems[1];

  // Helper parsing numbers
  const parseNum = (val) => {
    if (typeof val === "number") return val;
    if (!val) return 0;
    const cleaned = String(val).replace(/[^0-9.]/g, "");
    return parseFloat(cleaned) || 0;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Banner Dashboard Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <History className="w-4 h-4" />
            </span>
            <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Classification Audit Trail
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            Compare model inference outputs, track socio-economic variables, and export analytical batches.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {history.length > 0 && (
            <>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/70 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" /> Export CSV
              </button>
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear All
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter Tabs & Comparison Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center bg-slate-100/80 p-1 rounded-2xl gap-1 border border-slate-200/50">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterType === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            All Logs ({history.length})
          </button>
          <button
            onClick={() => setFilterType("barangay")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterType === "barangay" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Barangay ({history.filter(h => h.type === "barangay").length})
          </button>
          <button
            onClick={() => setFilterType("individual")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterType === "individual" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Household ({history.filter(h => h.type === "individual").length})
          </button>
        </div>

        {/* Selected comparison action badge */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-slate-400">
            Selected for comparison: <strong className="text-indigo-600 font-bold">{selectedIds.length}/2</strong>
          </span>
          <button
            disabled={selectedIds.length !== 2}
            onClick={() => setShowCompareModal(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
              selectedIds.length === 2
                ? "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/10 scale-102"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" /> Launch Side-by-Side
          </button>
        </div>
      </div>

      {/* History List */}
      {filteredHistory.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <History className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No Classification Runs Yet</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Run an inference in the Barangay or Household classifier and records will automatically appear here.
          </p>
          <button
            onClick={onNavigateToClassifier}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Go to Classifier <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredHistory.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            const tierStyle = TIER_COLORS[item.predicted_class] || TIER_COLORS.Middle;

            return (
              <div
                key={item.id}
                onClick={() => toggleSelect(item.id)}
                className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isSelected
                    ? "border-indigo-600 ring-2 ring-indigo-50 shadow-md"
                    : "border-slate-100 hover:border-slate-200 hover:shadow-xs shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 pointer-events-none"
                  />

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-extrabold text-slate-900">{item.target}</h4>
                      <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase tracking-wider">
                        {item.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                      <span className="flex items-center gap-1 font-medium">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {new Date(item.timestamp).toLocaleDateString()} · {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {item.top_feature && (
                        <span>
                          Driver: <strong className="text-slate-600">{item.top_feature}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end md:self-center">
                  {item.confidence && (
                    <div className="text-right">
                      <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Confidence</p>
                      <p className="text-xs font-black text-slate-800">{item.confidence}%</p>
                    </div>
                  )}

                  <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${tierStyle.bg} ${tierStyle.border}`}>
                    <span className={`w-2 h-2 rounded-full ${tierStyle.dot}`} />
                    <span className={`text-xs font-bold ${tierStyle.text}`}>
                      {tierStyle.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODERN SIDE-BY-SIDE ANALYTICS MODAL (Executive Clean White/Emerald UI) ── */}
      {showCompareModal && compareItems.length === 2 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setShowCompareModal(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Header Bar */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                  <ArrowUpDown className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                    Socio-Economic Profile Comparison
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Dual model analysis across standardized indicators
                  </p>
                </div>
              </div>

              {/* View Tabs & Close */}
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl gap-0.5">
                  <button
                    onClick={() => setActiveChartTab("bar")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      activeChartTab === "bar"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Bar Matrix
                  </button>
                  <button
                    onClick={() => setActiveChartTab("radar")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      activeChartTab === "radar"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Radar Overlay
                  </button>
                </div>

                <button
                  onClick={() => setShowCompareModal(false)}
                  className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Analytical Content Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
              {/* Profile KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Profile A */}
                {(() => {
                  const metaA = TIER_COLORS[itemA?.predicted_class] || TIER_COLORS.Middle;
                  return (
                    <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-600" />
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                            Subject A · {itemA?.type}
                          </span>
                          <h4 className="text-base font-black text-slate-900 mt-1">{itemA?.target}</h4>
                        </div>
                        <div className={`px-2.5 py-1 rounded-xl border text-xs font-extrabold ${metaA.bg} ${metaA.border} ${metaA.text}`}>
                          {metaA.label}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100">
                        <div className="bg-slate-50 p-2 rounded-xl text-center">
                          <span className="text-[9.5px] uppercase font-bold text-slate-400 block">Confidence</span>
                          <span className="text-base font-black text-slate-800">{itemA?.confidence ?? 0}%</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-xl text-center">
                          <span className="text-[9.5px] uppercase font-bold text-slate-400 block">Top Factor</span>
                          <span className="text-xs font-bold text-slate-700 truncate block mt-0.5">{itemA?.top_feature ?? "N/A"}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Profile B */}
                {(() => {
                  const metaB = TIER_COLORS[itemB?.predicted_class] || TIER_COLORS.Middle;
                  return (
                    <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                            Subject B · {itemB?.type}
                          </span>
                          <h4 className="text-base font-black text-slate-900 mt-1">{itemB?.target}</h4>
                        </div>
                        <div className={`px-2.5 py-1 rounded-xl border text-xs font-extrabold ${metaB.bg} ${metaB.border} ${metaB.text}`}>
                          {metaB.label}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100">
                        <div className="bg-slate-50 p-2 rounded-xl text-center">
                          <span className="text-[9.5px] uppercase font-bold text-slate-400 block">Confidence</span>
                          <span className="text-base font-black text-slate-800">{itemB?.confidence ?? 0}%</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-xl text-center">
                          <span className="text-[9.5px] uppercase font-bold text-slate-400 block">Top Factor</span>
                          <span className="text-xs font-bold text-slate-700 truncate block mt-0.5">{itemB?.top_feature ?? "N/A"}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Data Visualizer Card (Clean White Container) */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                      Indicator Level Contrast
                    </h5>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Normalized benchmark comparison of numerical inputs
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold">
                    <span className="flex items-center gap-1.5 text-indigo-600">
                      <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600" /> {itemA?.target} (A)
                    </span>
                    <span className="flex items-center gap-1.5 text-emerald-600">
                      <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> {itemB?.target} (B)
                    </span>
                  </div>
                </div>

                {/* Common parsed dataset */}
                {(() => {
                  const inputsA = itemA?.inputs || {};
                  const inputsB = itemB?.inputs || {};
                  const allKeys = Array.from(new Set([...Object.keys(inputsA), ...Object.keys(inputsB)]));

                  const rawMetrics = allKeys.map((k) => ({
                    metric: k,
                    rawA: parseNum(inputsA[k]),
                    rawB: parseNum(inputsB[k]),
                  }));

                  // Normalize values to 0-100 scale for radar and balanced bar visualization
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

                  if (normalizedData.length === 0) {
                    return (
                      <p className="text-xs text-slate-400 py-6 text-center">No numerical indicators found for comparison.</p>
                    );
                  }

                  if (activeChartTab === "radar") {
                    return (
                      <div className="h-64 w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={normalizedData}>
                            <PolarGrid stroke="#E2E8F0" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: "#64748B", fontSize: 10 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                            <Radar name={itemA?.target} dataKey="A" stroke="#4F46E5" fill="#4F46E5" fillOpacity={0.25} />
                            <Radar name={itemB?.target} dataKey="B" stroke="#10B981" fill="#10B981" fillOpacity={0.25} />
                            <Tooltip
                              formatter={(value, name) => [`${value}% relative score`, name]}
                              contentStyle={{ backgroundColor: "#0F172A", border: "none", borderRadius: "8px", color: "#fff", fontSize: "11px" }}
                            />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  }

                  return (
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={normalizedData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                          <XAxis
                            dataKey="subject"
                            tick={{ fontSize: 10, fill: "#64748B" }}
                            angle={-15}
                            textAnchor="end"
                            interval={0}
                          />
                          <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} domain={[0, 100]} />
                          <Tooltip
                            formatter={(value, name) => [`${value}% (relative intensity)`, name]}
                            contentStyle={{ backgroundColor: "#0F172A", border: "none", borderRadius: "8px", color: "#fff", fontSize: "11px" }}
                          />
                          <Bar dataKey="A" name={itemA?.target} fill="#4F46E5" radius={[4, 4, 0, 0]} maxBarSize={30} />
                          <Bar dataKey="B" name={itemB?.target} fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })()}
              </div>

              {/* Minimalist Gauge Bars (Like Modern Reference Dashboard) */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
                <h5 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2">
                  Metric Differential Breakdown
                </h5>

                <div className="space-y-3">
                  {(() => {
                    const inputsA = itemA?.inputs || {};
                    const inputsB = itemB?.inputs || {};
                    const allKeys = Array.from(new Set([...Object.keys(inputsA), ...Object.keys(inputsB)]));

                    return allKeys.map((key) => {
                      const v1 = inputsA[key] ?? "—";
                      const v2 = inputsB[key] ?? "—";
                      const num1 = parseNum(v1);
                      const num2 = parseNum(v2);
                      const maxVal = Math.max(num1, num2, 1);
                      const p1 = Math.round((num1 / maxVal) * 100);
                      const p2 = Math.round((num2 / maxVal) * 100);

                      return (
                        <div key={key} className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 flex flex-col gap-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-extrabold text-indigo-700 min-w-[70px] text-left">
                              {String(v1)}
                            </span>
                            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                              {key}
                            </span>
                            <span className="font-extrabold text-emerald-700 min-w-[70px] text-right">
                              {String(v2)}
                            </span>
                          </div>

                          {/* Dual Sleek Gauge Bar */}
                          <div className="grid grid-cols-2 gap-2 h-2 bg-slate-200/60 rounded-full overflow-hidden">
                            <div className="flex justify-end">
                              <div
                                className="bg-indigo-600 h-full rounded-l-full transition-all duration-500"
                                style={{ width: `${p1}%` }}
                              />
                            </div>
                            <div className="flex justify-start">
                              <div
                                className="bg-emerald-500 h-full rounded-r-full transition-all duration-500"
                                style={{ width: `${p2}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>

            {/* Modal Bottom Footer */}
            <div className="px-6 py-3.5 border-t border-slate-100 bg-white flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">
                District V Decision Support Model Comparative Review
              </span>
              <button
                onClick={() => setShowCompareModal(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
