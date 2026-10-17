import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanSearch, History, Info } from "lucide-react";
import NavInfoModal from "./NavInfoModal";
import logo from "../assets/logo.png";

const navItems = [
  { id: "classifier", label: "Classify", icon: ScanSearch },
  { id: "history", label: "History & Compare", icon: History },
];

// Emil: spring config for layout morph
const indicatorSpring = { type: "spring", duration: 0.4, bounce: 0.15 };

export default function Sidebar({ activeTab, setActiveTab }) {
  const [infoOpen, setInfoOpen] = useState(null);

  return (
    <>
      <aside className="w-20 bg-[#EEF2F6] border-r border-white/80 flex flex-col items-center py-6 justify-between select-none shadow-[4px_0_18px_rgba(166,180,200,0.22)] z-30">
        <div className="flex flex-col items-center gap-8 w-full">
          {/* Logo emblem */}
          <button
            onClick={() => setActiveTab("classifier")}
            title="District V Income Intelligence"
            className="w-12 h-12 rounded-2xl neu-btn flex items-center justify-center cursor-pointer"
          >
            <img
              src={logo}
              alt="District V Income Intelligence"
              className="w-9 h-9 object-contain"
            />
          </button>

          {/* Nav items */}
          <nav className="flex flex-col items-center gap-3 w-full px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <div
                  key={item.id}
                  className="relative w-full flex flex-col items-center group"
                >
                  {/* Main nav button */}
                  <button
                    onClick={() => setActiveTab(item.id)}
                    title={item.label}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-150 relative ${
                      isActive
                        ? "bg-slate-900 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_6px_16px_rgba(15,23,42,0.35)]"
                        : "neu-btn text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Icon className="w-5 h-5" />

                    {/* Active indicator — layoutId morph */}
                    {isActive && (
                      <motion.span
                        layoutId="sidebar-active-indicator"
                        className="absolute -left-2 w-1.5 h-6 bg-indigo-600 rounded-r-full shadow-sm"
                        transition={indicatorSpring}
                      />
                    )}
                  </button>

                  {/* Info button — appears on hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setInfoOpen(item.id);
                    }}
                    title={`About ${item.label}`}
                    className="w-5 h-5 rounded-full neu-inset-sm text-slate-400 hover:text-indigo-600 flex items-center justify-center transition-colors cursor-pointer opacity-0 group-hover:opacity-100 mt-1"
                  >
                    <Info className="w-3 h-3" />
                  </button>

                  {/* Tooltip label */}
                  <span className="absolute left-16 bg-slate-900 text-white text-xs font-semibold px-2.5 py-1 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl z-50 top-1">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Bottom district badge */}
        <div className="flex flex-col items-center gap-4 w-full px-3">
          <div className="w-10 h-10 rounded-xl neu-inset-sm flex items-center justify-center font-mono font-bold text-[11px] text-slate-600 select-none">
            QC5
          </div>
        </div>
      </aside>

      {/* Info Modal */}
      {infoOpen && (
        <NavInfoModal pageId={infoOpen} onClose={() => setInfoOpen(null)} />
      )}
    </>
  );
}
