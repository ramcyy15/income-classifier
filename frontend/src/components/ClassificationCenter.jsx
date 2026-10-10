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
    desc: "Classify a barangay's income level using community-level socio-economic indicators.",
    icon: Building2,
  },
  {
    id: "individual",
    label: "Individual Family Classifier",
    short: "Individual",
    desc: "Classify a single household's income level using family-level socio-economic data.",
    icon: Users,
  },
];

const pillSpring = { type: "spring", duration: 0.32, bounce: 0.1 };

export default function ClassificationCenter() {
  const [activeMode, setActiveMode] = useState("barangay");
  const current = MODES.find((m) => m.id === activeMode);

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* ── Mode Switcher Header ── */}
      <div
        className="rounded-xl px-5 py-3.5 flex items-center justify-between gap-4 flex-wrap"
        style={{
          background: 'rgba(13,21,32,0.9)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        }}
      >
        <div className="flex items-center gap-3">
          <current.icon
            className="w-4 h-4 flex-shrink-0"
            style={{ color: '#3b82f6' }}
            strokeWidth={1.75}
          />
          <div>
            <h2 className="text-[13px] font-semibold text-[#e6edf3] leading-tight tracking-[-0.01em]">
              {current.label}
            </h2>
            <p className="text-[11px] text-[#8b949e] mt-0.5">{current.desc}</p>
          </div>
        </div>

        {/* Mode toggle */}
        <div
          className="flex items-center p-1 rounded-lg gap-0.5"
          style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {MODES.map((mode) => {
            const isActive = activeMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setActiveMode(mode.id)}
                className="relative px-3.5 py-1.5 rounded-md text-[11px] font-semibold cursor-pointer z-10 transition-colors duration-120"
                style={{ color: isActive ? '#e6edf3' : '#484f58' }}
              >
                {isActive && (
                  <motion.div
                    layoutId="mode-pill"
                    transition={pillSpring}
                    className="absolute inset-0 rounded-md -z-10"
                    style={{
                      background: 'rgba(59,130,246,0.15)',
                      border: '1px solid rgba(59,130,246,0.3)',
                    }}
                  />
                )}
                {mode.short}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Active classifier ── */}
      <AnimatePresence mode="wait">
        {activeMode === "barangay" && (
          <motion.div
            key="barangay"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
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
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          >
            <IndividualClassifier />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
