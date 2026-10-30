import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ScanSearch, History, CheckCircle2, Map as MapIcon } from "lucide-react";

const PAGE_INFO = {
  classifier: {
    Icon: ScanSearch,
    title: "Check",
    tagline: "Find a barangay's income level",
    bullets: [
      { heading: "Enter the details", body: "Fill in 10 facts about the barangay, or upload a file for many barangays." },
      { heading: "See the level", body: "Level 1 needs the most help. Level 3 is doing well." },
      { heading: "See why", body: "Bars show which facts raised or lowered the result." },
    ],
  },
  district: {
    Icon: MapIcon,
    title: "District Map",
    tagline: "All 14 barangays at a glance",
    bullets: [
      { heading: "Map", body: "Darker blue means more need. The number inside is the level." },
      { heading: "Who needs help first", body: "Barangays are listed from most to least in need." },
      { heading: "Details", body: "Tap a barangay to see what affected its result." },
    ],
  },
  history: {
    Icon: History,
    title: "Saved Results",
    tagline: "Every barangay you checked",
    bullets: [
      { heading: "Review", body: "See past results and suggested programs." },
      { heading: "Compare", body: "Pick two barangays to see them side by side." },
      { heading: "Download", body: "Save all results as a spreadsheet." },
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
              Got it
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}