import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Building2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Save,
  FileText,
  Filter,
} from "lucide-react";
import { uploadBarangayBatchFile, getBatchTemplateDownloadUrl } from "../services/api";
import { saveBatchClassificationRecords } from "../utils/historyStore";
import { LEVELS } from "../constants/levels";

const TIER_META = Object.fromEntries(
  Object.entries(LEVELS).map(([cls, l]) => [cls, { level: `${l.short} · ${l.name}`, badge: l.badge }])
);

const escapeCSV = (val) => {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
};

export default function BatchClassifier() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [batchData, setBatchData] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const fileInputRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      const ext = selected.name.split(".").pop().toLowerCase();
      if (ext !== "csv" && ext !== "xlsx" && ext !== "xls") {
        setError("Please select a valid .csv or .xlsx Excel file.");
        return;
      }
      setFile(selected);
      setError(null);
      setBatchData(null);
      setIsSaved(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      const ext = dropped.name.split(".").pop().toLowerCase();
      if (ext !== "csv" && ext !== "xlsx" && ext !== "xls") {
        setError("Please drop a valid .csv or .xlsx Excel file.");
        return;
      }
      setFile(dropped);
      setError(null);
      setBatchData(null);
      setIsSaved(false);
    }
  };

  const handleUploadAndClassify = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setIsSaved(false);

    try {
      const resp = await uploadBarangayBatchFile(file);
      setBatchData(resp);
      showToast(`${resp.successful} barangays checked.`);
    } catch (err) {
      setError(err.message || "Failed to process batch classification.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAllToAudit = () => {
    if (!batchData || !batchData.results || batchData.results.length === 0) return;

    const recordsToSave = batchData.results.map((res) => {
      const drivers = res.feature_impacts || [];
      const topDriver = drivers.length > 0 ? drivers[0].feature : null;
      return {
        type: "barangay",
        target: res.barangay,
        barangay: res.barangay,
        predicted_class: res.predicted_class,
        tier_label: res.tier_label,
        tier_meaning: res.tier_meaning,
        confidence: res.confidence ? Math.round(res.confidence * 100) : null,
        probabilities: res.probabilities,
        top_feature: topDriver,
        feature_impacts: drivers,
        shap: res.shap || null,
        ai_interpretation: res.interpretation || null,
        ai_recommendations: res.recommendations || [],
        ai_provider: res.ai_provider,
        is_fallback: res.is_fallback,
        ai_note: res.ai_note,
        inputs: res.inputs || {},
        raw_inputs: res.raw_inputs || {},
      };
    });

    saveBatchClassificationRecords(recordsToSave);
    setIsSaved(true);
    showToast(`Saved ${recordsToSave.length} results.`);
  };

  const handleExportBatchCSV = () => {
    if (!batchData || !batchData.results || batchData.results.length === 0) return;

    const headers = [
      "Barangay",
      "Level",
      "Sure (%)",
      "Chance of Level 1 (%)",
      "Chance of Level 2 (%)",
      "Chance of Level 3 (%)",
      "Average Monthly Income",
      "Employed Heads (%)",
      "Informal Settlers (%)",
      "Electricity Access (%)",
      "Safe Water Access (%)",
      "Sanitary Toilet (%)",
      "Permanent Housing (%)",
      "School Enrollment (%)",
      "Secondary Educated (%)",
      "Average Family Size",
      "Main reason",
      "Summary",
      "Suggested programs",
      "Advice source",
    ];

    const rows = batchData.results.map((item) => {
      const inputs = item.inputs || {};
      const probs = item.probabilities || {};
      const drivers = item.feature_impacts || [];
      const top = drivers.length > 0 ? drivers[0].feature : "N/A";
      const recs = (item.recommendations || []).map((r) => `${r.name} (${r.agency})`).join(" | ");

      return [
        escapeCSV(item.barangay),
        escapeCSV(TIER_META[item.predicted_class]?.level || item.predicted_class),
        escapeCSV(item.confidence ? `${Math.round(item.confidence * 100)}%` : "N/A"),
        escapeCSV(probs.Low !== undefined ? (probs.Low * 100).toFixed(1) : "N/A"),
        escapeCSV(probs.Middle !== undefined ? (probs.Middle * 100).toFixed(1) : "N/A"),
        escapeCSV(probs.High !== undefined ? (probs.High * 100).toFixed(1) : "N/A"),
        escapeCSV(inputs["Avg Monthly Income"] || "N/A"),
        escapeCSV(inputs["Employed Heads"] || "N/A"),
        escapeCSV(inputs["Informal Settlers"] || "N/A"),
        escapeCSV(inputs["Electricity Access"] || "N/A"),
        escapeCSV(inputs["Safe Water Access"] || "N/A"),
        escapeCSV(inputs["Sanitary Toilet"] || "N/A"),
        escapeCSV(inputs["Permanent Housing"] || "N/A"),
        escapeCSV(inputs["School Enrollment"] || "N/A"),
        escapeCSV(inputs["Secondary Educated"] || "N/A"),
        escapeCSV(inputs["Avg Family Size"] || "N/A"),
        escapeCSV(top),
        escapeCSV(item.interpretation || "N/A"),
        escapeCSV(recs || "N/A"),
        escapeCSV(item.is_fallback ? "Standard Policy Fallback" : (item.ai_provider === "gemini" ? "Gemini AI" : "Verified ML")),
      ];
    });

    const csvContent = "\uFEFF" + [headers.map(escapeCSV).join(","), ...rows.map((e) => e.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `district_v_batch_classified_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast("Downloaded.");
  };

  const handleDownloadSample = () => {
    // Generate pre-populated CSV template client-side with UTF-8 BOM
    const headers = [
      "Barangay Jurisdiction",
      "Average Monthly Income",
      "Employed Heads (%)",
      "Informal Settlers (%)",
      "Electricity Access (%)",
      "Safe Water Access (%)",
      "Sanitary Toilet (%)",
      "Permanent Housing (%)",
      "School Enrollment (%)",
      "Secondary Educated (%)",
      "Average Family Size",
    ];

    const sampleRows = [
      ["Bagbag", 24500, 56.4, 34.2, 74.0, 68.0, 66.5, 52.0, 79.5, 53.0, 5.2],
      ["Capri", 17200, 48.0, 48.5, 66.0, 55.0, 52.0, 39.0, 72.0, 38.0, 5.6],
      ["Fairview", 38000, 76.5, 12.0, 92.0, 88.0, 86.0, 78.0, 91.0, 75.0, 4.4],
      ["Greater Lagro", 34500, 72.0, 16.5, 88.0, 82.0, 81.0, 72.0, 88.0, 70.0, 4.6],
      ["Gulod", 22800, 54.0, 38.0, 72.0, 64.0, 62.0, 48.0, 78.0, 50.0, 5.3],
      ["Kaligayahan", 28500, 62.0, 26.0, 80.0, 74.0, 72.0, 60.0, 84.0, 60.0, 4.9],
      ["Nagkaisang Nayon", 23500, 55.0, 35.0, 73.0, 66.0, 64.0, 50.0, 78.5, 52.0, 5.1],
      ["North Fairview", 36000, 74.0, 14.0, 90.0, 85.0, 84.0, 75.0, 89.0, 72.0, 4.5],
      ["Novaliches Proper", 26000, 60.0, 29.0, 78.0, 70.0, 69.0, 56.0, 82.0, 57.0, 5.0],
      ["Pasong Putik Proper", 31000, 68.0, 20.0, 84.0, 78.0, 77.0, 66.0, 86.0, 65.0, 4.7],
      ["San Agustin", 27000, 61.0, 27.5, 79.0, 72.0, 70.5, 58.0, 83.0, 58.0, 4.9],
      ["San Bartolome", 29000, 64.0, 24.0, 82.0, 76.0, 74.0, 62.0, 85.0, 62.0, 4.8],
      ["Santa Lucia", 25000, 58.0, 32.0, 75.0, 68.5, 67.0, 54.0, 80.0, 55.0, 5.1],
      ["Santa Monica", 30000, 66.0, 22.0, 83.0, 77.0, 75.5, 64.0, 85.5, 63.5, 4.8],
    ];

    const csvContent = "\uFEFF" + [headers.map(escapeCSV).join(","), ...sampleRows.map((r) => r.map(escapeCSV).join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "qc_district_v_batch_upload_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast("Template downloaded.");
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-8 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#104281] text-white text-xs font-semibold shadow-[0_10px_30px_-12px_rgba(13,54,107,0.6)] border border-[#2a78d6]/40"
          >
            <CheckCircle2 className="w-4 h-4 text-[#6da7ec] flex-shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Upload Card */}
      <div className="neu-surface rounded-3xl p-6 sm:p-7 space-y-5 shadow-sm border border-white/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-8 h-8 rounded-xl neu-inset-sm text-indigo-600 flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Upload a file
              </h2>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Check many barangays at once using an Excel or CSV file.
            </p>
          </div>

          <button
            onClick={handleDownloadSample}
            className="flex items-center gap-1.5 px-3.5 py-2 neu-btn text-indigo-700 text-xs font-semibold rounded-xl cursor-pointer"
            title="Download a ready-to-fill file"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <span>Get template</span>
          </button>
        </div>

        {/* Dropzone */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 ${
            file
              ? "border-indigo-400 bg-indigo-50/20"
              : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50/50"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            className="hidden"
          />

          <div className="w-14 h-14 rounded-2xl neu-inset flex items-center justify-center text-indigo-600">
            {file ? <FileText className="w-7 h-7" /> : <Upload className="w-7 h-7" />}
          </div>

          {file ? (
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-900">{file.name}</p>
              <p className="text-[10px] text-slate-500 font-mono">
                {(file.size / 1024).toFixed(1)} KB · Ready
              </p>
              <span className="text-[10px] text-indigo-600 font-semibold underline block pt-1">
                Choose another file
              </span>
            </div>
          ) : (
            <div className="space-y-1 max-w-sm">
              <p className="text-xs font-semibold text-slate-700">
                Drop your file here or click to choose
              </p>
              <p className="text-[11px] text-slate-400 font-normal">
                Excel (.xlsx) or CSV
              </p>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <div className="text-[11px] text-slate-500 font-medium">
            {file ? (
              <span className="flex items-center gap-1.5 text-[#104281] font-semibold">
                <CheckCircle2 className="w-4 h-4 text-[#2a78d6]" />
                File ready
              </span>
            ) : (
              <span>Use the template so the columns match.</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {file && (
              <button
                onClick={() => {
                  setFile(null);
                  setBatchData(null);
                  setError(null);
                }}
                className="px-3.5 py-2 neu-btn text-xs text-slate-500 font-semibold rounded-xl cursor-pointer"
              >
                Clear
              </button>
            )}

            <button
              onClick={handleUploadAndClassify}
              disabled={!file || loading}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all ${
                loading
                  ? "bg-[#104281] text-white cursor-wait shadow-md"
                  : !file
                  ? "neu-btn text-slate-500 cursor-not-allowed"
                  : "neu-btn-primary text-white shadow-md cursor-pointer active:scale-95"
              }`}
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Checking…</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Check all barangays</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold">Something went wrong</span>
              <p className="leading-relaxed">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Results View */}
      {batchData && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="neu-surface rounded-3xl p-6 sm:p-7 space-y-5 shadow-sm border border-white/80"
        >
          {/* Results Summary Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Results</span>
                <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                  {batchData.successful} of {batchData.total_rows} checked
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                From {batchData.filename}
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={handleExportBatchCSV}
                className="flex items-center gap-1.5 px-3.5 py-2 neu-btn text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600" />
                <span>Download</span>
              </button>

              <button
                onClick={handleSaveAllToAudit}
                disabled={isSaved}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isSaved
                    ? "bg-[#104281] text-white shadow-sm"
                    : "neu-btn-primary text-white shadow-md active:scale-95"
                }`}
              >
                {isSaved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                <span>{isSaved ? "Saved" : "Save results"}</span>
              </button>
            </div>
          </div>

          {/* Validation Warnings if any rows failed */}
          {batchData.errors && batchData.errors.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>{batchData.errors.length} row(s) skipped:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-700">
                {batchData.errors.map((err, i) => (
                  <li key={i}>
                    <strong>Row {err.row} ({err.barangay}):</strong> {err.errors.join("; ")}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Results Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-[10.5px] font-semibold text-slate-500 border-b border-slate-200">
                  <th className="py-3 px-4 font-semibold">Barangay</th>
                  <th className="py-3 px-4 font-semibold">Level</th>
                  <th className="py-3 px-4 font-semibold">Sure</th>
                  <th className="py-3 px-4 font-semibold">Main reason</th>
                  <th className="py-3 px-4 font-semibold">Monthly Income</th>
                  <th className="py-3 px-4 font-semibold text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batchData.results.map((item, idx) => {
                  const isExpanded = expandedRow === idx;
                  const tierInfo = TIER_META[item.predicted_class] || TIER_META.Middle;
                  const topDriver = item.feature_impacts?.[0]?.feature || "Average Monthly Income";

                  return (
                    <React.Fragment key={idx}>
                      <tr
                        onClick={() => setExpandedRow(isExpanded ? null : idx)}
                        className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                          isExpanded ? "bg-indigo-50/30" : ""
                        }`}
                      >
                        <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                          <span>{item.barangay}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${tierInfo.badge}`}
                          >
                            {tierInfo.level}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {item.confidence ? `${Math.round(item.confidence * 100)}%` : "—"}
                        </td>
                        <td className="py-3 px-4 text-slate-600 truncate max-w-[180px]">
                          {topDriver}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700">
                          {item.inputs?.["Avg Monthly Income"] || "—"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button className="text-slate-400 hover:text-indigo-600">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Details Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/60 border-b border-slate-200/80">
                          <td colSpan={6} className="p-4 sm:p-5">
                            <div className="space-y-4">
                              {/* Executive Synthesis */}
                              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 space-y-1">
                                <div className="flex items-center justify-between text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                                  <span className="flex items-center gap-1.5">
                                    <Sparkles className="w-3 h-3 text-indigo-600" />
                                    Summary
                                  </span>
                                  {item.is_fallback && (
                                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-mono">
                                      Standard advice
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-700 leading-relaxed font-normal">
                                  {item.interpretation}
                                </p>
                              </div>

                              {/* Indicators Grid */}
                              {item.inputs && (
                                <div>
                                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold block mb-2">
                                    Details entered
                                  </span>
                                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
                                    {Object.entries(item.inputs).map(([k, v]) => (
                                      <div key={k} className="p-2.5 rounded-xl bg-white border border-slate-200/60">
                                        <span className="text-[9.5px] text-slate-400 block truncate">{k}</span>
                                        <span className="font-semibold text-slate-800 font-mono">{v}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Recommendations */}
                              {item.recommendations?.length > 0 && (
                                <div>
                                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold block mb-2">
                                    Recommended Agency Programs ({item.recommendations.length})
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                    {item.recommendations.map((rec, ri) => (
                                      <div key={ri} className="p-3 rounded-2xl bg-white border border-slate-200/80 space-y-1">
                                        <div className="text-[11px] font-bold text-slate-900 leading-tight">
                                          {rec.name}
                                        </div>
                                        <div className="text-[10px] font-mono text-indigo-600 font-semibold">
                                          {rec.agency}
                                        </div>
                                        <p className="text-[10px] text-slate-500 leading-relaxed font-normal">
                                          {rec.rationale}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}

