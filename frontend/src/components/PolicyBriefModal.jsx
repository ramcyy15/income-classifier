import React, { useState } from 'react';
import { X, FileText, CheckCircle, Building2, Tag, RefreshCw, Cpu } from 'lucide-react';
import { generateLivePolicyBrief } from '../services/api';
import kalingaLogo from '../assets/KalingaBot AI.png';

export default function PolicyBriefModal({ barangay, onClose }) {
  if (!barangay) return null;

  const [loadingAi, setLoadingAi] = useState(false);
  const [liveBrief, setLiveBrief] = useState(null);
  const [aiError, setAiError] = useState(null);

  const brief = liveBrief || barangay.policy_brief || {};
  const programs = brief.programs || [];
  const suggestions = brief.slider_suggestion || {};

  const handleGenerateLive = async () => {
    if (!barangay.name || loadingAi) return;
    setLoadingAi(true);
    setAiError(null);
    try {
      const res = await generateLivePolicyBrief(barangay.name);
      if (res.policy_brief) {
        setLiveBrief(res.policy_brief);
      }
    } catch (err) {
      console.error(err);
      setAiError(err.message || 'Failed to generate recommendations with AI');
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={kalingaLogo}
              alt="KalingaBot Logo"
              className="w-10 h-10 rounded-xl object-contain bg-slate-50 border border-slate-100 p-0.5 shadow-sm flex-shrink-0"
            />
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Government Policy Brief
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Tailored recommendations for {barangay.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateLive}
              disabled={loadingAi}
              className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              {loadingAi ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <Cpu className="w-3 h-3" />
              )}
              <span>{loadingAi ? 'Synthesizing...' : 'Generate New Brief'}</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Executive Summary */}
          {brief.summary && (
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Executive Synthesis
              </span>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {brief.summary}
              </p>
            </div>
          )}

          {/* Recommended Programs */}
          <div>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-3">
              Targeted Interventions ({programs.length})
            </span>
            <div className="space-y-3">
              {programs.map((p, idx) => {
                const isHigh = p.priority === 'High';
                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border transition-all ${
                      isHigh ? 'border-indigo-100 bg-indigo-50/20' : 'border-slate-100 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h4 className="text-xs font-bold text-slate-900 leading-snug">
                        {p.name}
                      </h4>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                        isHigh ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                      }`}>
                        {p.priority} Priority
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400 uppercase mb-2">
                      <div className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        <span>{p.agency}</span>
                      </div>
                      {p.sector && (
                        <>
                          <span>&middot;</span>
                          <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md font-bold text-[10px]">
                            {p.sector}
                          </span>
                        </>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 leading-normal">
                      {p.rationale}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Suggested Mix */}
          {suggestions.financial !== undefined && (
            <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
              <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block mb-1.5">
                Suggested Resource Allocation
              </span>
              <div className="flex items-center gap-4 text-xs font-bold text-slate-800 mb-2">
                <span>Financial: <strong className="text-indigo-600">{suggestions.financial}%</strong></span>
                <span>Education: <strong className="text-indigo-600">{suggestions.education}%</strong></span>
                <span>Livelihood: <strong className="text-indigo-600">{suggestions.livelihood}%</strong></span>
              </div>
              <p className="text-xs text-slate-600 italic">
                "{suggestions.reasoning}"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
