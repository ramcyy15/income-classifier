import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import BotInfoModal from './BotInfoModal';
import kalingaLogo from '../assets/KalingaBot AI.png';

export default function Header() {
  const [botModalOpen, setBotModalOpen] = useState(false);

  return (
    <>
      <header className="h-20 bg-[#EEF2F6]/85 backdrop-blur-xl border-b border-white/80 shadow-[0_4px_16px_rgba(166,180,200,0.2)] px-8 flex items-center justify-between sticky top-0 z-20">
        <div>
          <h1 className="text-lg font-semibold tracking-[-0.025em] text-slate-900">
            District V Socio-Economic Income Classification
          </h1>
          <p className="text-[11px] font-mono text-slate-500 tracking-[0.02em]">
            Stacking Ensemble ML Model · Random Forest + Gradient Boosting → Logistic Regression
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* KalingaBot Badge Button - Neumorphic soft button */}
          <button
            onClick={() => setBotModalOpen(true)}
            className="flex items-center gap-2.5 py-1.5 px-3.5 neu-btn rounded-xl group cursor-pointer"
            title="Learn about KalingaBot AI"
          >
            <div className="w-6 h-6 rounded-lg neu-inset-sm p-0.5 flex items-center justify-center flex-shrink-0">
              <img
                src={kalingaLogo}
                alt="KalingaBot AI"
                className="w-full h-full object-contain rounded"
              />
            </div>
            <div className="text-left leading-tight hidden sm:block">
              <p className="text-[11px] font-bold text-indigo-950 flex items-center gap-1">
                KalingaBot <Sparkles className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
              </p>
              <p className="text-[9px] text-indigo-600 font-medium font-mono">Who is he?</p>
            </div>
          </button>
        </div>
      </header>

      {/* Pop-up Bot Information Modal */}
      <BotInfoModal
        isOpen={botModalOpen}
        onClose={() => setBotModalOpen(false)}
      />
    </>
  );
}
