import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ScanSearch, History, CheckCircle2, Server } from "lucide-react";

const PAGE_INFO = {
  classifier: {
    Icon: ScanSearch,
    title: "Classification Center",
    tagline: "Stacking Ensemble Income Tier Inference",
    bullets: [
      {
        heading: "Barangay Classifier (Community Scale)",
        body: "Analyzes 10 key PSA indicators (economic, utilities, human capital) to assign a community to Level 1 (Low), Level 2 (Middle), or Level 3 (High).",
      },
      {
        heading: "Individual Family Classifier (Household Scale)",
        body: "Evaluates single-household indicators (per-capita income, dependents, education participation, 4Ps status) against DSWD SWDI thresholds.",
      },
      {
        heading: "Model Explainability & Decision Drivers",
        body: "Visualizes the model's softmax probability distribution alongside localized feature importances indicating the primary drivers of welfare classification.",
      },
    ],
  },
  history: {
    Icon: History,
    title: "Classification Audit Trail & Ledger",
    tagline: "Forensic Audit Log & Dual Comparative Analysis",
    bullets: [
      {
        heading: "Immutable Forensic Ledger",
        body: "Chronologically logs each inference with ordinal numbering, microsecond timestamps, predicted tiers, and dominant socio-economic drivers.",
      },
      {
        heading: "Side-by-Side Dual Analysis",
        body: "Select any two classification profiles to trigger the side-by-side modal with delta matrices, radar charts, and policy intervention mappings.",
      },
      {
        heading: "Analytical CSV Export",
        body: "Export all session records into a standard spreadsheet format for statistical verification and reporting.",
      },
    ],
  },
  system: {
    Icon: Server,
    title: "Cloud Infrastructure & Database Status",
    tagline: "Render Container Telemetry & Supabase Recovery",
    bullets: [
      {
        heading: "Render Cloud ML Cold-Start Telemetry",
        body: "Tracks the live allocation, Uvicorn service boot, and RAM loading of the Scikit-Learn stacking ensemble on Render's free tier.",
      },
      {
        heading: "Supabase Database Health & Unpause",
        body: "Monitors the state of the PostgreSQL database instance. If paused due to free-tier inactivity, provides direct 1-click links to resume.",
      },
      {
        heading: "Offline Model Independence",
        body: "Even if Supabase is hibernated, District V datasets and ML models run locally inside the application bundle with zero downtime.",
      },
    ],
  },
};

export default function NavInfoModal({ pageId, onClose }) {
  const info = PAGE_INFO[pageId];
  if (!info) return null;
  const { Icon, title, tagline, bullets } = info;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ type: "spring", duration: 0.35, bounce: 0.1 }}
          className="neu-glass rounded-3xl w-full max-w-md overflow-hidden border border-white/90 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.3),-8px_-8px_20px_#FFFFFF]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 bg-[#EEF2F6]/70 border-b border-white/80 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl neu-surface-sm flex items-center justify-center text-indigo-600">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 leading-tight">{title}</h2>
                <p className="text-[11px] font-mono text-slate-500 mt-0.5">{tagline}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl neu-btn text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Bullet sections */}
          <div className="p-6 space-y-3.5 bg-[#EEF2F6]">
            {bullets.map((b, i) => (
              <div key={i} className="neu-surface-sm p-3.5 rounded-2xl space-y-1">
                <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                  <span>{b.heading}</span>
                </p>
                <p className="text-[11px] text-slate-600 leading-relaxed pl-5 font-normal">
                  {b.body}
                </p>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 pt-2 bg-[#EEF2F6]">
            <button
              onClick={onClose}
              className="w-full py-2.5 neu-btn text-slate-900 font-semibold text-xs rounded-xl cursor-pointer"
            >
              Understand & Continue
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}