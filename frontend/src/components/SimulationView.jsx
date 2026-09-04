import React, { useState } from 'react';
import { Sparkles, Sliders, CheckCircle2, TrendingUp, RotateCcw } from 'lucide-react';
import { runSimulation } from '../services/api';

export default function SimulationView({ barangays, selectedBarangay, onSelectBarangay }) {
  const [financial, setFinancial] = useState(40);
  const [education, setEducation] = useState(30);
  const [livelihood, setLivelihood] = useState(50);
  const [years, setYears] = useState(5);
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const activeBrgy = selectedBarangay || barangays[0];

  const handleSimulate = async () => {
    if (!activeBrgy) return;
    setLoading(true);
    try {
      const res = await runSimulation({
        barangay: activeBrgy.name,
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
            <h2 className="text-lg font-bold text-slate-900">Intervention Scenario Planner</h2>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            Test policy intensities on {activeBrgy?.name || 'the selected barangay'} using the machine learning stacking ensemble.
          </p>
        </div>

        {/* Barangay selector */}
        <select
          value={activeBrgy?.name || ''}
          onChange={(e) => {
            const match = barangays.find(b => b.name === e.target.value);
            if (match) {
              onSelectBarangay(match);
              setResult(null);
            }
          }}
          className="py-2 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          {barangays.map(b => (
            <option key={b.name} value={b.name}>
              {b.name} (#{b.rank})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Sliders and Presets */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-5">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2.5">
              Select Preset Scenario
            </span>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                onClick={() => handlePreset(0, 0, 0)}
                className="py-2.5 px-3 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors text-slate-700 cursor-pointer"
              >
                No Action (0%)
              </button>
              <button
                onClick={() => handlePreset(40, 40, 40)}
                className="py-2.5 px-3 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors text-slate-700 cursor-pointer"
              >
                Moderate (40%)
              </button>
              <button
                onClick={() => handlePreset(80, 80, 80)}
                className="py-2.5 px-3 border border-indigo-200 bg-indigo-50/50 rounded-xl text-xs font-bold text-indigo-700 hover:bg-indigo-50 transition-colors cursor-pointer"
              >
                Aggressive (80%)
              </button>
            </div>
          </div>

          <div className="space-y-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
            {/* Financial Aid */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-slate-700">Financial Support & Cash Transfers (4Ps, AICS)</span>
                <span className="text-indigo-600 font-extrabold">{financial}%</span>
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
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-slate-700">Education Support (ALS, Scholarships)</span>
                <span className="text-indigo-600 font-extrabold">{education}%</span>
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
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-slate-700">Livelihood & Entrepreneurship (SLP, TUPAD, DTI)</span>
                <span className="text-indigo-600 font-extrabold">{livelihood}%</span>
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
              <span className="font-bold text-slate-700">Policy Time Horizon</span>
              <div className="flex gap-2">
                {[3, 4, 5].map((y) => (
                  <button
                    key={y}
                    onClick={() => setYears(y)}
                    className={`px-3.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      years === y
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {y} Years
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleSimulate}
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Simulate & Re-score Families in {activeBrgy?.name}</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Projected Impact */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Projected Policy Impact</h3>
              {result && (
                <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {result.movement.low_tier_reduction_pct}% Low-Income Reduction
                </span>
              )}
            </div>

            {!result ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Sliders className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-500">Configure parameters on the left and click Simulate.</p>
                <p className="text-[11px] text-slate-400 mt-1">The ensemble model will project changes in family indicators and re-score income tiers.</p>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="grid grid-cols-2 gap-3.5 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Current Dominant Tier
                    </span>
                    <span className="text-lg font-black text-slate-900">
                      {result.now.dominant} Income
                    </span>
                    <span className="text-xs text-slate-500 block mt-0.5">
                      {result.now.counts.Low} Survival families ({result.now.percentages.Low}%)
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">
                      Projected Tier ({years} Yrs)
                    </span>
                    <span className="text-lg font-black text-emerald-700">
                      {result.projected.dominant} Income
                    </span>
                    <span className="text-xs text-emerald-600 block mt-0.5">
                      {result.projected.counts.Low} Survival families ({result.projected.percentages.Low}%)
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                  <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block mb-2">
                    Family Upward Mobility Summary
                  </span>
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                    <span>Upward Transition: <strong className="text-emerald-600 font-bold">+{result.movement.moved_up} families</strong></span>
                    <span>Stable: <strong>{result.movement.stayed}</strong></span>
                    <span>Downward: <strong className="text-red-500">-{result.movement.moved_down}</strong></span>
                  </div>
                </div>

                {/* Indicator Deltas */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Indicator Changes
                  </span>
                  {result.indicator_changes?.map((ind, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
                      <span className="font-semibold text-slate-600">{ind.name}</span>
                      <div className="flex items-center gap-2 font-bold">
                        <span className="text-slate-400">{ind.before}</span>
                        <span className="text-slate-300">→</span>
                        <span className="text-slate-900">{ind.after}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
