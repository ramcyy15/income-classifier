import React from 'react';
import { 
  LayoutDashboard, 
  Sliders, 
  FileText, 
  BarChart3,
  HelpCircle
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'simulation', label: 'Intervention', icon: Sliders },
    { id: 'briefs', label: 'Policy Briefs', icon: FileText },
  ];

  return (
    <aside className="w-20 bg-white border-r border-slate-100 flex flex-col items-center py-6 justify-between select-none shadow-[1px_0_10px_rgba(0,0,0,0.02)] z-30">
      <div className="flex flex-col items-center gap-8 w-full">
        {/* System Emblem Logo: Clean Academic/Gov Style */}
        <div 
          onClick={() => setActiveTab('dashboard')}
          title="District V Income Intelligence"
          className="w-11 h-11 rounded-2xl bg-indigo-600 flex flex-col items-center justify-center shadow-lg shadow-indigo-600/20 text-white cursor-pointer hover:bg-indigo-700 transition-colors"
        >
          <span className="font-extrabold text-[12px] tracking-tighter leading-none">QC</span>
          <span className="font-bold text-[9px] opacity-80 leading-none mt-0.5">D-V</span>
        </div>

        {/* Primary Navigation Icons */}
        <nav className="flex flex-col items-center gap-3 w-full px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={item.label}
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 relative group cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10'
                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100/80'
                }`}
              >
                <Icon className="w-5 h-5 transition-transform duration-200 group-hover:scale-105" />
                {isActive && (
                  <span className="absolute -left-3 w-1.5 h-6 bg-indigo-600 rounded-r-full" />
                )}
                {/* Tooltip */}
                <span className="absolute left-16 bg-slate-900 text-white text-xs font-semibold px-2.5 py-1 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg z-50">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom User / District Tag */}
      <div className="flex flex-col items-center gap-4 w-full px-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center font-extrabold text-[11px] text-slate-700 select-none">
          <span>QC5</span>
        </div>
      </div>
    </aside>
  );
}
