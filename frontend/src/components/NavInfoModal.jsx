import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ScanSearch, History, CheckCircle2 } from "lucide-react";

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
};

export default function NavInfoModal({ pageId, onClose }) {
  const info = PAGE_INFO[pageId];
  if (!info) return null;
  const { Icon, title, tagline, bullets } = info;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ type: "spring", duration: 0.35, bounce: 0.1 }}
          className="glass-card rounded-2xl w-full max-w-md overflow-hidden border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 bg-[#0a1018]/90 border-b border-white/8 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#e6edf3] leading-tight">{title}</h2>
                <p className="text-[11px] font-mono text-[#8b949e] mt-0.5">{tagline}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl btn-ghost text-[#8b949e] hover:text-[#e6edf3] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Bullet sections */}
          <div className="p-6 space-y-3 bg-[#080d14]">
            {bullets.map((b, i) => (
              <div key={i} className="bg-[#0d1520] border border-white/6 p-3.5 rounded-xl space-y-1">
                <p className="text-xs font-bold text-[#e6edf3] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                  <span>{b.heading}</span>
                </p>
                <p className="text-[11px] text-[#8b949e] leading-relaxed pl-5 font-normal">
                  {b.body}
                </p>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 pt-2 bg-[#080d14]">
            <button
              onClick={onClose}
              className="w-full py-2.5 btn-primary font-semibold text-xs rounded-xl cursor-pointer"
            >
              Understand & Continue
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}