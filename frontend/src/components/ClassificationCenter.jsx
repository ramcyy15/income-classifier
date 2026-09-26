import React, { useState } from "react";
import { Building2, Users } from "lucide-react";
import BarangayClassifier from "./BarangayClassifier";
import IndividualClassifier from "./IndividualClassifier";

const MODES = [
  {
    id: "barangay",
    label: "Barangay Income Classifier",
    short: "Barangay",
    desc: "Classify a barangay's overall income level using community-level socio-economic indicators.",
    icon: Building2,
    iconBg: "bg-indigo-600",
    badgeBg: "bg-indigo-50",
    badgeText: "text-indigo-700",
    badgeBorder: "border-indigo-200",
  },
  {
    id: "individual",
    label: "Individual Family Classifier",
    short: "Individual Family",
    desc: "Classify a single household's income level based on family-level socio-economic data.",
    icon: Users,
    iconBg: "bg-emerald-600",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-700",
    badgeBorder: "border-emerald-200",
  },
];

export default function ClassificationCenter() {
  const [activeMode, setActiveMode] = useState("barangay");
  const current = MODES.find((m) => m.id === activeMode);

  return (
    <div className="space-y-5 max-w-5xl mx-auto">

      {/* ── Mode Switcher Header (matches reference card design) ── */}
      <div className="bg-white rounded-2xl px-6 py-4 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-base font-extrabold text-slate-900 leading-tight">
            {current.label}
          </h1>
          <p className="text-[11px] text-slate-400 font-medium">
            {current.desc}
          </p>
        </div>

        {/* Mode Toggle Switch */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
          {MODES.map((mode) => {
            const isActive = activeMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setActiveMode(mode.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {mode.short}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Active classifier ── */}
      {activeMode === "barangay" && <BarangayClassifier />}
      {activeMode === "individual" && <IndividualClassifier />}
    </div>
  );
}
