import React from "react";
import { X, ScanSearch } from "lucide-react";

const PAGE_INFO = {
  classifier: {
    Icon: ScanSearch,
    color: "bg-indigo-600",
    title: "Classification Center",
    tagline: "ML-powered income level classification.",
    bullets: [
      {
        heading: "Barangay Classifier (Primary)",
        body: "Enter a barangay's population, 4Ps density, school attendance, and family metrics to classify its overall income level into Level 1 (Survival), Level 2 (Subsistence), or Level 3 (Self-Sufficient). Use the quick-fill presets for any of the 14 District V barangays.",
      },
      {
        heading: "Individual Family Classifier (Sub-toggle)",
        body: "Switch to the Individual Family mode to classify a single household using its total monthly income, family size, number of dependents, and children attending school.",
      },
      {
        heading: "What the results show",
        body: "Each classification result shows the predicted SWDI income level, the model's confidence percentage, and the top socio-economic factors that most influenced the prediction — ranked by decision impact.",
      },
    ],
  },
};

export default function NavInfoModal({ pageId, onClose }) {
  const info = PAGE_INFO[pageId];
  if (!info) return null;
  const { Icon, color, title, tagline, bullets } = info;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Colored header */}
        <div className={`${color} px-6 py-5`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-white leading-tight">{title}</h2>
                <p className="text-white/70 text-xs font-medium mt-0.5">{tagline}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bullet sections */}
        <div className="px-6 py-5 space-y-4">
          {bullets.map((b, i) => (
            <div key={i}>
              <p className="text-xs font-bold text-slate-900 mb-1">{b.heading}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{b.body}</p>
              {i < bullets.length - 1 && (
                <div className="border-b border-slate-100 mt-4" />
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5">
          <button
            onClick={onClose}
            className={`w-full py-2.5 ${color} hover:opacity-90 text-white font-semibold text-sm rounded-xl transition-all cursor-pointer`}
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}