import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  },
  {
    id: "individual",
    label: "Individual Family Classifier",
    short: "Individual Family",
    desc: "Classify a single household's income level based on family-level socio-economic data.",
    icon: Users,
  },
];

export default function ClassificationCenter() {
  const [activeMode, setActiveMode] = useState("barangay");
  const current = MODES.find((m) => m.id === activeMode);

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* ── Mode Switcher Header ── */}
      <div className="neu-surface rounded-2xl px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-base font-semibold text-slate-900 leading-tight tracking-[-0.01em]">
            {current.label}
          </h1>
          <p className="text-[11px] text-slate-500 font-medium">
            {current.desc}
          </p>
        </div>

        {/* Mode Toggle Switch with debossed well and raised sliding pill */}
        <div className="flex items-center neu-inset p-1.5 rounded-xl gap-1.5">
          {MODES.map((mode) => {
            const isActive = activeMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setActiveMode(mode.id)}
                className={`relative px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer z-10 transition-colors duration-150 ${
                  isActive
                    ? "text-slate-900 font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeModePill"
                    transition={{
                      type: "spring",
                      duration: 0.35,
                      bounce: 0.1,
                    }}
                    className="absolute inset-0 neu-surface-sm rounded-lg -z-10"
                  />
                )}
                <span className="relative z-10">{mode.short}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Active classifier with AnimatePresence ── */}
      <AnimatePresence mode="wait">
        {activeMode === "barangay" && (
          <motion.div
            key="barangay"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          >
            <BarangayClassifier />
          </motion.div>
        )}
        {activeMode === "individual" && (
          <motion.div
            key="individual"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          >
            <IndividualClassifier />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
