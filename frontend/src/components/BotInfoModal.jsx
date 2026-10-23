import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Sparkles, Database, Layers, BrainCircuit, HeartHandshake,
  CheckCircle2, Cpu, ShieldCheck, ArrowRight, BookOpen
} from 'lucide-react';
import kalingaLogo from '../assets/KalingaBot AI.png';

export default function BotInfoModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState("rag"); // "rag" | "architecture"

  if (!isOpen) return null;

  const flowSteps = [
    {
      badge: "R",
      badgeLabel: "Retrieve",
      title: "Pulls the real numbers first",
      desc: "When you enter a community profile, KalingaBot never invents data. He queries the District V empirical dataset (4,500+ surveyed records across 14 barangays) and executes the Stacking Ensemble ML model to extract the verified SWDI/PSA tier.",
      tag: "Verified Local Grounding",
      color: "bg-blue-600",
    },
    {
      badge: "A",
      badgeLabel: "Augment",
      title: "Pairs with official government standards",
      desc: "Next, the raw predictions are contextualized with actual Philippine welfare guidelines — including DSWD Pantawid Pamilya (4Ps), DOLE Livelihood programs, DepEd Basic Education subsidies, and TESDA skills training criteria.",
      tag: "Official Aid Rules",
      color: "bg-indigo-600",
    },
    {
      badge: "G",
      badgeLabel: "Generate",
      title: "Synthesizes honest, grounded guidance",
      desc: "Finally, Gemini 1.5 Flash reads exclusively the verified factual baseline and crafts targeted intervention guidance with absolute zero hallucination risk.",
      tag: "Zero-Hallucination AI",
      color: "bg-purple-600",
    },
  ];

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/40 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ type: "spring", duration: 0.4, bounce: 0.1 }}
          className="neu-glass rounded-3xl max-w-xl w-full border border-white/90 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.3),-8px_-8px_20px_#FFFFFF] flex flex-col max-h-[92vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Banner */}
          <div className="relative p-6 bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white overflow-hidden flex-shrink-0 border-b border-indigo-700/50">
            <div className="absolute -right-8 -top-8 w-44 h-44 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -left-8 -bottom-8 w-44 h-44 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />

            {/* Tactile Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 z-30 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer btn-press border border-white/20"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Bot Avatar & Headline */}
            <div className="relative flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md p-1 border border-white/20 shadow-lg flex-shrink-0 flex items-center justify-center">
                <img
                  src={kalingaLogo}
                  alt="KalingaBot AI"
                  className="w-full h-full object-contain rounded-xl drop-shadow-md"
                />
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-indigo-950 rounded-full" />
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <h2 className="text-xl font-bold tracking-tight text-white">Meet KalingaBot</h2>
                  <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
                </div>
                <p className="text-xs font-mono text-indigo-200">
                  District V AI Social Welfare & Decision Support Assistant
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-white/15 text-white border border-white/20">
                    RAG Grounded
                  </span>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                    Stacking Ensemble
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Subheader Tab Switcher */}
          <div className="px-6 py-2.5 bg-[#EEF2F6] border-b border-white/80 flex items-center justify-between">
            <div className="flex items-center neu-inset p-1 rounded-xl gap-1">
              <button
                onClick={() => setActiveTab("rag")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  activeTab === "rag"
                    ? "neu-surface-sm text-slate-900 font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                R-A-G Pipeline
              </button>
              <button
                onClick={() => setActiveTab("architecture")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  activeTab === "architecture"
                    ? "neu-surface-sm text-slate-900 font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Model Architecture
              </button>
            </div>
            <span className="text-[10px] font-mono text-slate-400">QC District V Engine</span>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-4 overflow-y-auto flex-1 bg-[#EEF2F6]">
            {activeTab === "rag" && (
              <>
                {/* Who is he */}
                <div className="neu-surface rounded-2xl p-4 space-y-1.5">
                  <h3 className="text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">
                    Core Purpose
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    <strong className="text-slate-900 font-semibold">KalingaBot</strong> is derived from <em>"kalinga"</em> — the Filipino virtue of empathetic care and collective stewardship. He was engineered for Quezon City District V to enable barangay desk officers and social workers to instantly interpret complex multidimensional poverty indicators without statistical ambiguity.
                  </p>
                </div>

                {/* R-A-G Steps */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">
                      Retrieval-Augmented Generation (RAG) Architecture
                    </h3>
                    <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full neu-surface-sm text-indigo-700">
                      Zero Hallucination
                    </span>
                  </div>

                  {flowSteps.map((step) => (
                    <div
                      key={step.badge}
                      className="neu-surface-sm p-3.5 rounded-2xl space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-md ${step.color} text-white font-mono font-bold text-[11px] flex items-center justify-center shadow-xs`}>
                            {step.badge}
                          </span>
                          <span className="text-[11px] font-bold text-slate-800">
                            {step.badgeLabel} &middot; {step.title}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono text-slate-400">
                          {step.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed pl-7 font-normal">
                        {step.desc}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Grounding note */}
                <div className="p-3.5 rounded-2xl neu-inset-sm flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-700 leading-relaxed font-normal">
                    <strong className="text-slate-900 font-semibold">Academic Rigor:</strong> By separating empirical model inference from conversational generation, KalingaBot guarantees that all policy recommendations are strictly grounded in verified local indicators.
                  </p>
                </div>
              </>
            )}

            {activeTab === "architecture" && (
              <div className="space-y-4">
                <div className="neu-surface rounded-2xl p-4.5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs font-bold text-slate-900">Stacking Ensemble Pipeline</h4>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    The machine learning backbone combines multiple diverse model families into a two-tier ensemble for maximum generalizability across District V:
                  </p>

                  <div className="space-y-2 pt-1">
                    <div className="neu-surface-sm p-3 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-800">Base Learner 1: Random Forest</p>
                        <p className="text-[10px] text-slate-400">100 estimators · Gini impurity criterion</p>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        Non-linear Splits
                      </span>
                    </div>

                    <div className="neu-surface-sm p-3 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-800">Base Learner 2: Gradient Boosting</p>
                        <p className="text-[10px] text-slate-400">Learning rate: 0.1 · Sequential residual minimization</p>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                        Residual Gradient
                      </span>
                    </div>

                    <div className="neu-inset-sm p-3 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-900">Meta-Learner: Logistic Regression</p>
                        <p className="text-[10px] text-slate-500">L2 regularization · Softmax class probabilities</p>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-100">
                        Final Arbitrator
                      </span>
                    </div>
                  </div>
                </div>

                <div className="neu-surface-sm p-4 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-slate-600" />
                    <h5 className="text-xs font-bold text-slate-800">Grounding Benchmark Datasets</h5>
                  </div>
                  <ul className="text-[11px] text-slate-600 space-y-1.5 list-disc pl-5">
                    <li><strong>PSA FIES:</strong> Family Income and Expenditure Survey thresholds.</li>
                    <li><strong>PSA MPI:</strong> Multidimensional Poverty Index deprivation dimensions.</li>
                    <li><strong>DSWD SWDI:</strong> Social Welfare and Development Indicator validation tiers.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-3.5 border-t border-white/80 bg-[#EEF2F6]/60 backdrop-blur-md flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>District V Thesis AI Engine</span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 neu-btn text-slate-800 font-semibold text-xs rounded-xl cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
