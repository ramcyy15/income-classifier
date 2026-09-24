import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import BotInfoModal from './BotInfoModal';
import kalingaLogo from '../assets/KalingaBot AI.png';

export default function Header() {
  const [botModalOpen, setBotModalOpen] = useState(false);

  return (
    <>
      <header className="h-20 bg-white/70 backdrop-blur-md border-b border-slate-100 px-8 flex items-center justify-between sticky top-0 z-20">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            District V Socio-Economic Income Classification
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Stacking Ensemble ML Model · Random Forest + Gradient Boosting → Logistic Regression
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* KalingaBot Badge Button */}
          <button
            onClick={() => setBotModalOpen(true)}
            className="flex items-center gap-2 py-1.5 px-3 bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100/80 hover:to-purple-100/80 border border-indigo-100/80 rounded-xl transition-all shadow-xs group cursor-pointer"
            title="Learn about KalingaBot AI"
          >
            <div className="w-6 h-6 rounded-lg bg-white p-0.5 border border-indigo-100 flex items-center justify-center flex-shrink-0">
              <img
                src={kalingaLogo}
                alt="KalingaBot AI"
                className="w-full h-full object-contain rounded"
              />
            </div>
            <div className="text-left leading-tight hidden sm:block">
              <p className="text-[11px] font-bold text-indigo-900 flex items-center gap-1">
                KalingaBot <Sparkles className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
              </p>
              <p className="text-[9px] text-indigo-500 font-medium">Who is he?</p>
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
