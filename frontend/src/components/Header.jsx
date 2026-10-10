import React, { useState } from 'react';
import { Sparkles, Activity } from 'lucide-react';
import BotInfoModal from './BotInfoModal';
import kalingaLogo from '../assets/KalingaBot AI.png';

export default function Header() {
  const [botModalOpen, setBotModalOpen] = useState(false);

  return (
    <>
      <header
        className="h-[60px] px-6 flex items-center justify-between flex-shrink-0"
        style={{
          background: 'rgba(8,13,20,0.92)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {/* Left: title block */}
        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full bg-emerald-400 live-dot"
              aria-label="System live"
            />
          </div>

          <div>
            <h1 className="text-[13px] font-semibold tracking-[-0.02em] text-[#e6edf3] leading-tight">
              District V Socio-Economic Income Classification
            </h1>
            <p className="text-[10px] font-mono text-[#484f58] tracking-[0.03em] mt-0.5">
              Stacking Ensemble · RF + XGBoost → Logistic Regression · Quezon City District V
            </p>
          </div>
        </div>

        {/* Right: KalingaBot button */}
        <button
          onClick={() => setBotModalOpen(true)}
          className="flex items-center gap-2 py-1.5 px-3 rounded-xl cursor-pointer transition-all duration-150"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(59,130,246,0.08)';
            e.currentTarget.style.borderColor = 'rgba(59,130,246,0.2)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
          }}
          title="Learn about KalingaBot AI"
        >
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}
          >
            <img
              src={kalingaLogo}
              alt="KalingaBot AI"
              className="w-full h-full object-contain rounded"
            />
          </div>
          <div className="text-left leading-tight hidden sm:block">
            <p className="text-[11px] font-semibold text-[#e6edf3] flex items-center gap-1">
              KalingaBot
              <Sparkles className="w-2.5 h-2.5 text-amber-400" fill="currentColor" />
            </p>
            <p className="text-[9px] text-[#484f58] font-mono">AI Policy Assistant</p>
          </div>
        </button>
      </header>

      <BotInfoModal isOpen={botModalOpen} onClose={() => setBotModalOpen(false)} />
    </>
  );
}
