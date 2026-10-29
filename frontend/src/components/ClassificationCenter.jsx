import React, { useState } from "react";
import { Sliders, FileSpreadsheet, Building2, UploadCloud } from "lucide-react";
import BarangayClassifier from "./BarangayClassifier";
import BatchClassifier from "./BatchClassifier";

/**
 * ClassificationCenter
 * Hub for District V Barangay Socio-Economic Income Classification.
 * Supports Single Community Assessment and Multi-Barangay Batch Upload.
 */
export default function ClassificationCenter() {
  const [activeMode, setActiveMode] = useState("single"); // "single" | "batch"

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Mode Switcher Banner */}
      <div className="flex items-center justify-between p-2 rounded-2xl neu-surface bg-white/60 shadow-xs border border-white/80">
        <div className="flex items-center gap-1.5 p-1 rounded-xl neu-inset-sm bg-slate-100/80">
          <button
            onClick={() => setActiveMode("single")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeMode === "single"
                ? "bg-white text-indigo-700 shadow-sm font-bold"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Single Community Evaluation</span>
          </button>

          <button
            onClick={() => setActiveMode("batch")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeMode === "batch"
                ? "bg-white text-indigo-700 shadow-sm font-bold"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Batch Multi-Barangay Upload</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 uppercase tracking-wide">
              CSV / Excel
            </span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 text-[11px] text-slate-400 font-medium">
          <Building2 className="w-3.5 h-3.5 text-indigo-500" />
          <span>District V, Quezon City · 14 Barangays</span>
        </div>
      </div>

      {/* Dynamic Content */}
      {activeMode === "single" ? (
        <BarangayClassifier />
      ) : (
        <BatchClassifier />
      )}
    </div>
  );
}
