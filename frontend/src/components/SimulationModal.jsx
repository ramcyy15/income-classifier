import React, { useState } from 'react';
import { X, Sparkles, Sliders, ArrowRight, RotateCcw, CheckCircle2, TrendingUp } from 'lucide-react';
import { runSimulation, runGoalSeek } from '../services/api';

export default function SimulationModal({ barangay, onClose }) {
  if (!barangay) return null;

  const [financial, setFinancial] = useState(40);
  const [education, setEducation] = useState(30);
  const [livelihood, setLivelihood] = useState(50);
  const [years, setYears] = useState(5);
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSimulate = async () => {
    setLoading(true);
    try {
      const res = await runSimulation({
        barangay: barangay.name,
        financial,
        education,
        livelihood,
        years,
      });
      setResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePreset = (f, e, l) => {
    setFinancial(f);
    setEducation(e);
    setLivelihood(l);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Policy Intervention Simulation
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Testing program intensities for {barangay.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Quick Preset Buttons */}
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Preset Scenarios
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handlePreset(0, 0, 0)}
                className="py-2 px-3 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors text-slate-700"
              >
                No Intervention (0%)
              </button>
              <button
                onClick={() => handlePreset(40, 40, 40)}
                className="py-2 px-3 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors text-slate-700"
              >
                Moderate (40%)
              </button>
              <button
                onClick={() => handlePreset(80, 80, 80)}
                className="py-2 px-3 border border-indigo-200 bg-indigo-50/50 rounded-xl text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors"
              >
                Aggressive (80%)
              </button>
            </div>
          </div>

          {/* Sliders Grid */}
          <div className="space-y-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
            {/* Financial */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-slate-700">Financial Aid & Grants (4Ps, AICS)</span>
                <span className="text-indigo-600 font-bold">{financial}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={financial}
                onChange={(e) => setFinancial(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            {/* Education */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-slate-700">Education Support (ALS, Scholarships)</span>
                <span className="text-indigo-600 font-bold">{education}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={education}
                onChange={(e) => setEducation(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            {/* Livelihood */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-slate-700">Livelihood & Family Planning (SLP, DTI)</span>
                <span className="text-indigo-600 font-bold">{livelihood}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={livelihood}
                onChange={(e) => setLivelihood(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            {/* Horizon */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
              <span className="font-semibold text-slate-700">Simulation Horizon</span>
              <div className="flex gap-2">
                {[3, 4, 5].map((y) => (
                  <button
                    key={y}
                    onClick={() => setYears(y)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                      years === y
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    {y} Years
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action to Calculate */}
          <button
            onClick={handleSimulate}
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Re-score All Surveyed Families</span>
              </>
            )}
          </button>

          {/* Simulation Output Card */}
          {result && (
            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-900">
                    Projected Outcome in {years} Years
                  </span>
                </div>
                <span className="text-xs font-extrabold text-emerald-700 bg-white px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {result.movement.low_tier_reduction_pct}% Poverty Reduction
                </span>
              </div>

              {/* Before vs After Comparison */}
              <div className="grid grid-cols-2 gap-3 bg-white p-3.5 rounded-xl border border-emerald-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Current Dominant Tier
                  </span>
                  <span className="text-base font-black text-slate-800">
                    {result.now.dominant} Income
                  </span>
                  <span className="text-xs text-slate-500 block mt-0.5">
                    {result.now.counts.Low} Low ({result.now.percentages.Low}%)
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">
                    Projected Dominant Tier
                  </span>
                  <span className="text-base font-black text-emerald-700">
                    {result.projected.dominant} Income
                  </span>
                  <span className="text-xs text-emerald-600 block mt-0.5">
                    {result.projected.counts.Low} Low ({result.projected.percentages.Low}%)
                  </span>
                </div>
              </div>

              {/* Key Movements */}
              <div className="flex justify-between items-center text-xs font-semibold text-slate-600 px-1">
                <span>Families Transitioned Up: <strong className="text-emerald-600 font-bold">{result.movement.moved_up}</strong></span>
                <span>Unchanged: <strong className="text-slate-800 font-bold">{result.movement.stayed}</strong></span>
                <span>Moved Down: <strong className="text-red-500 font-bold">{result.movement.moved_down}</strong></span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
