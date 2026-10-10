import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanSearch, History, Info } from "lucide-react";
import NavInfoModal from "./NavInfoModal";
import logo from "../assets/logo.png";

const navItems = [
  { id: "classifier", label: "Classify", icon: ScanSearch },
  { id: "history",    label: "History & Compare", icon: History },
];

const spring = { type: "spring", duration: 0.35, bounce: 0.12 };

export default function Sidebar({ activeTab, setActiveTab }) {
  const [infoOpen, setInfoOpen] = useState(null);

  return (
    <>
      <aside
        className="w-[68px] flex flex-col items-center py-5 justify-between select-none z-30 flex-shrink-0"
        style={{
          background: 'rgba(8,13,20,0.96)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '4px 0 24px rgba(0,0,0,0.4)',
        }}
      >
        <div className="flex flex-col items-center gap-7 w-full">
          {/* Logo */}
          <button
            onClick={() => setActiveTab("classifier")}
            title="District V Income Intelligence"
            className="w-10 h-10 rounded-xl flex items-center justify-center btn-press"
            style={{
              background: 'rgba(59,130,246,0.1)',
              border: '1px solid rgba(59,130,246,0.2)',
            }}
          >
            <img
              src={logo}
              alt="District V"
              className="w-7 h-7 object-contain"
            />
          </button>

          {/* Divider */}
          <div className="w-8 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

          {/* Nav */}
          <nav className="flex flex-col items-center gap-2 w-full px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <div key={item.id} className="relative w-full flex flex-col items-center group">
                  <button
                    onClick={() => setActiveTab(item.id)}
                    title={item.label}
                    className="relative w-11 h-11 rounded-xl flex items-center justify-center transition-colors duration-150 cursor-pointer"
                    style={{
                      background: isActive
                        ? 'rgba(59,130,246,0.15)'
                        : 'transparent',
                      border: isActive
                        ? '1px solid rgba(59,130,246,0.3)'
                        : '1px solid transparent',
                      color: isActive ? '#60a5fa' : '#484f58',
                    }}
                  >
                    <Icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2 : 1.75} />

                    {/* Active left indicator — layout morph */}
                    {isActive && (
                      <motion.span
                        layoutId="sidebar-active"
                        className="absolute -left-[9px] w-[3px] h-5 rounded-r-full"
                        style={{ background: '#3b82f6' }}
                        transition={spring}
                      />
                    )}
                  </button>

                  {/* Hover info button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setInfoOpen(item.id); }}
                    title={`About ${item.label}`}
                    className="w-4 h-4 rounded-full flex items-center justify-center transition-colors cursor-pointer opacity-0 group-hover:opacity-100 mt-0.5"
                    style={{ color: '#484f58' }}
                  >
                    <Info className="w-3 h-3" />
                  </button>

                  {/* Tooltip */}
                  <span
                    className="absolute left-14 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50"
                    style={{
                      background: '#111d2e',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#e6edf3',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                      top: '50%',
                      transform: 'translateY(-50%)',
                    }}
                  >
                    {item.label}
                  </span>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Bottom district badge */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-[10px]"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            color: '#484f58',
          }}
        >
          QC5
        </div>
      </aside>

      {infoOpen && (
        <NavInfoModal pageId={infoOpen} onClose={() => setInfoOpen(null)} />
      )}
    </>
  );
}
