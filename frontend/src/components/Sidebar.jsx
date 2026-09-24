import React, { useState } from "react";
import { ScanSearch, Info } from "lucide-react";
import NavInfoModal from "./NavInfoModal";
import logo from "../assets/logo.png";

export default function Sidebar({ activeTab, setActiveTab }) {
  const [infoOpen, setInfoOpen] = useState(null); // holds the pageId of the open info modal

  const navItems = [
    { id: "classifier", label: "Classify",  icon: ScanSearch },
  ];

  return (
    <>
      <aside className="w-20 bg-white border-r border-slate-100 flex flex-col items-center py-6 justify-between select-none shadow-[1px_0_10px_rgba(0,0,0,0.02)] z-30">
        <div className="flex flex-col items-center gap-8 w-full">
          {/* Logo emblem */}
          <div
            onClick={() => setActiveTab("classifier")}
            title="District V Income Intelligence"
            className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors"
          >
            <img
              src={logo}
              alt="District V Income Intelligence"
              className="w-10 h-10 object-contain"
            />
          </div>

          {/* Nav items */}
          <nav className="flex flex-col items-center gap-2 w-full px-2">
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
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 relative cursor-pointer ${
                      isActive
                        ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                        : "text-slate-400 hover:text-slate-700 hover:bg-slate-100/80"
                    }`}
                  >
                    <Icon className="w-5 h-5 transition-transform duration-200 group-hover:scale-105" />
                    {/* Active indicator */}
                    {isActive && (
                      <span className="absolute -left-2 w-1.5 h-6 bg-indigo-600 rounded-r-full" />
                    )}
                  </button>

                  {/* Info button — appears on hover of the nav item group */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setInfoOpen(item.id);
                    }}
                    title={`About ${item.label}`}
                    className="w-5 h-5 rounded-full bg-slate-100 hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 flex items-center justify-center transition-all cursor-pointer opacity-0 group-hover:opacity-100 mt-1"
                  >
                    <Info className="w-3 h-3" />
                  </button>

                  {/* Tooltip label */}
                  <span className="absolute left-16 bg-slate-900 text-white text-xs font-semibold px-2.5 py-1 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg z-50 top-1">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Bottom district badge */}
        <div className="flex flex-col items-center gap-4 w-full px-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-extrabold text-[11px] text-slate-700 select-none">
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
