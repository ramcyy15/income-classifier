import React from 'react';
import { X, Sparkles, Database, Layers, BrainCircuit, HeartHandshake, CheckCircle2 } from 'lucide-react';
import kalingaLogo from '../assets/KalingaBot AI.png';

export default function BotInfoModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const flowSteps = [
    {
      badge: "R",
      badgeLabel: "Retrieve",
      title: "Pulls the real numbers first",
      desc: "When you enter a family's details, the bot doesn't make up numbers. He looks up our local database of 4,500+ District V families and runs the stacking model to get their real SWDI Level (Survival, Subsistence, or Self-Sufficient).",
      tag: "Real Local Data",
      color: "bg-blue-600",
      lightBg: "bg-blue-50/60 border-blue-100",
    },
    {
      badge: "A",
      badgeLabel: "Augment",
      title: "Adds official government rules",
      desc: "Next, he pairs the family's numbers with official guidelines from Philippine government programs — like DSWD 4Ps, DepEd school assistance, TESDA skills courses, and DOLE livelihood grants.",
      tag: "Official Aid Rules",
      color: "bg-indigo-600",
      lightBg: "bg-indigo-50/60 border-indigo-100",
    },
    {
      badge: "G",
      badgeLabel: "Generate",
      title: "Writes honest, caring advice",
      desc: "Finally, Gemini AI reads only those verified facts and writes plain-English advice and program recommendations tailored to that specific household — with zero guesswork.",
      tag: "Honest AI Advice",
      color: "bg-purple-600",
      lightBg: "bg-purple-50/60 border-purple-100",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 p-6 text-white overflow-hidden flex-shrink-0">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-indigo-400/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-8 -bottom-8 w-40 h-40 bg-purple-400/20 rounded-full blur-2xl pointer-events-none" />

          {/* Close button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="absolute top-4 right-4 z-30 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 pointer-events-none" />
          </button>

          {/* Bot Avatar & Intro */}
          <div className="relative flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md p-1 border border-white/20 shadow-lg flex-shrink-0 flex items-center justify-center">
              <img
                src={kalingaLogo}
                alt="KalingaBot AI"
                className="w-full h-full object-contain rounded-xl drop-shadow-md"
              />
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-indigo-900 rounded-full" />
            </div>

            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <h2 className="text-xl font-black tracking-tight text-white">Meet KalingaBot</h2>
                <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
              </div>
              <p className="text-xs font-medium text-indigo-200">
                Your District V AI Social Welfare Assistant
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/15 text-white border border-white/20">
                  RAG Powered
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                  Online
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Who is he */}
          <div>
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Who is he?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong className="text-slate-900 font-bold">KalingaBot</strong> gets his name from <em>"kalinga"</em> — the Filipino word for caring and looking out for one another. 
              He was built specifically for Quezon City District V to help barangay staff, social workers, and local leaders see which families need help without getting tangled in complicated spreadsheets.
            </p>
          </div>

          {/* How does he work? (RAG explained in simple words) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                How does he work? (R-A-G in Simple Words)
              </h3>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                No Guesswork
              </span>
            </div>

            <div className="space-y-3">
              {flowSteps.map((step) => (
                <div
                  key={step.badge}
                  className={`p-3.5 rounded-2xl border ${step.lightBg} space-y-1.5 transition-all`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-md ${step.color} text-white font-black text-[11px] flex items-center justify-center shadow-xs`}>
                        {step.badge}
                      </span>
                      <span className="text-[11px] font-bold text-slate-800">
                        {step.badgeLabel} &middot; {step.title}
                      </span>
                    </div>
                    <span className="text-[9px] font-semibold text-slate-400">
                      {step.tag}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed pl-7">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Plain english bottom note */}
          <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100/80 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-indigo-900 font-medium leading-relaxed">
              <strong>Why this matters:</strong> Regular chatbots can make up random numbers. Because KalingaBot uses <strong>RAG</strong>, every single tip he gives is anchored directly in verified Quezon City District V data and official government programs.
            </p>
          </div>

          {/* Footer */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>District V Thesis AI Project</span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Got it, thanks!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
