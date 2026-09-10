import React, { useState } from "react";
import {
  User, Sliders, Sparkles, RotateCcw,
  TrendingUp, AlertCircle, CheckCircle2, Info, MapPin
} from "lucide-react";
import kalingaLogo from "../assets/KalingaBot AI.png";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, ResponsiveContainer,
} from "recharts";

const SWDI_META = {
  Low:    { level: "SWDI Level 1", label: "Survival",        color: "#EF4444", bg: "bg-red-50",     border: "border-red-200",     text: "text-red-700" },
  Middle: { level: "SWDI Level 2", label: "Subsistence",     color: "#F59E0B", bg: "bg-amber-50",   border: "border-amber-200",   text: "text-amber-700" },
  High:   { level: "SWDI Level 3", label: "Self-Sufficient", color: "#10B981", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
};

const DISTRICT_V_BARANGAYS = [
  "Bagbag", "Capri", "Fairview", "Greater Lagro", "Gulod", "Kaligayahan",
  "Nagkaisang Nayon", "North Fairview", "Novaliches Proper",
  "Pasong Putik Proper", "San Agustin", "San Bartolome",
  "Santa Lucia", "Santa Monica"
];

const HOUSEHOLD_OPTIONS = ["Active", "Graduated", "Conditionally Compliant", "None"];

const FIELDS = [
  { id: "monthly_per_capita_income", label: "Monthly Per-Capita Income (PHP)", type: "number", min: 0,  max: 50000, step: 100, placeholder: "e.g. 3500", icon: "PhP", tip: "Total household monthly income divided by family size (from SWDI)." },
  { id: "family_size",               label: "Family Size",                     type: "number", min: 1,  max: 20,    step: 1,   placeholder: "e.g. 5",    icon: "Fam", tip: "Total number of family members in the household." },
  { id: "dependents_0_18",           label: "Dependents below 18 yrs old",     type: "number", min: 0,  max: 15,    step: 1,   placeholder: "e.g. 3",    icon: "Dep", tip: "Number of children aged 0 to 18 living at home." },
  { id: "children_in_school",        label: "Children Attending School",        type: "number", min: 0,  max: 15,    step: 1,   placeholder: "e.g. 2",    icon: "Sch", tip: "Number of school-age children currently enrolled." },
];

const DEFAULT_FORM = {
  barangay: "Bagbag",
  monthly_per_capita_income: "",
  family_size: "",
  dependents_0_18: "",
  children_in_school: "",
  household_status: "None"
};

function ChartTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 shadow-lg rounded-xl px-3 py-2 text-[11px]">
      <p className="font-bold text-slate-800">{payload[0]?.payload?.feature}</p>
      <p className="text-slate-500">Impact: <span className="font-bold text-indigo-600">{Number(payload[0]?.value).toFixed(1)}%</span></p>
    </div>
  );
}

export default function IndividualClassifier() {
  const [form, setForm]       = useState(DEFAULT_FORM);
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [hovered, setHovered] = useState(null);

  const handleChange = (id, val) => setForm((f) => ({ ...f, [id]: val }));
  const isFormValid  = FIELDS.every((f) => form[f.id] !== "" && !isNaN(Number(form[f.id])));

  const handleSubmit = async () => {
    if (!isFormValid) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("http://localhost:8000/api/classify-individual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barangay:                  form.barangay,
          monthly_per_capita_income: Number(form.monthly_per_capita_income),
          family_size:               Number(form.family_size),
          dependents_0_18:           Number(form.dependents_0_18),
          children_in_school:        Number(form.children_in_school),
          household_status:          form.household_status,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setResult(await res.json());
    } catch (e) {
      setError(e.message || "Server error. Make sure the API is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => { setForm(DEFAULT_FORM); setResult(null); setError(null); };
  const meta = result ? (SWDI_META[result.predicted_class] ?? SWDI_META["Middle"]) : null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* Page Header */}
      <div className="bg-white rounded-2xl px-6 py-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-600/25">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">Individual Family Classifier</h1>
            <p className="text-[11px] text-slate-400 font-medium">
              Enter family socio-economic data to classify the SWDI income tier using the Stacking Ensemble ML model.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">

        {/* LEFT: Input Form */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-500" /> Family Profile Inputs
              </p>
              <button onClick={handleReset}
                className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-red-500 transition-colors cursor-pointer">
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>

            <div className="space-y-3">
              {/* Barangay Location Dropdown */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-indigo-500" /> Barangay Location (District V)
                </label>
                <div className="relative">
                  <select
                    value={form.barangay}
                    onChange={(e) => handleChange("barangay", e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all cursor-pointer"
                  >
                    {DISTRICT_V_BARANGAYS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              {FIELDS.map((field) => (
                <div key={field.id} className="relative"
                  onMouseEnter={() => setHovered(field.id)}
                  onMouseLeave={() => setHovered(null)}>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">{field.label}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 select-none pointer-events-none">{field.icon}</span>
                    <input
                      type={field.type} min={field.min} max={field.max} step={field.step}
                      value={form[field.id]} onChange={(e) => handleChange(field.id, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full pl-9 pr-3 py-2 text-sm font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all placeholder:text-slate-300"
                    />
                  </div>
                  {hovered === field.id && (
                    <div className="absolute right-0 top-0 z-20 bg-slate-900 text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-xl max-w-[200px] leading-snug pointer-events-none">
                      <Info className="w-3 h-3 inline mr-1 opacity-70" />{field.tip}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-3.5">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">4Ps Household Status</label>
              <div className="flex gap-2 flex-wrap">
                {HOUSEHOLD_OPTIONS.map((opt) => (
                  <button key={opt} onClick={() => handleChange("household_status", opt)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                      form.household_status === opt
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                        : "bg-slate-50 text-slate-500 border-slate-200 hover:border-indigo-300"
                    }`}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button onClick={handleSubmit} disabled={!isFormValid || loading}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-[12px] flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer">
              {loading
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Classifying...</>
                : <><Sparkles className="w-4 h-4" /> Classify Family</>
              }
            </button>

            {!isFormValid && !loading && (
              <p className="text-center text-[10px] text-slate-400 flex items-center justify-center gap-1 mt-2">
                <AlertCircle className="w-3 h-3" /> Fill in all fields to enable classification.
              </p>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-[11px] text-red-700 font-medium mt-2">{error}</div>
            )}
          </div>
        </div>

        {/* RIGHT: Results - matched height and scrollable */}
        <div className="h-[520px] overflow-y-auto pr-1 space-y-4 rounded-2xl scrollbar-thin scrollbar-thumb-slate-200">
          {!result && !loading && (
            <div className="h-full bg-white rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center p-10">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-center mb-3 p-1">
                <img src={kalingaLogo} alt="KalingaBot AI" className="w-12 h-12 object-contain" />
              </div>
              <p className="text-sm font-bold text-slate-700">Ready to Classify</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-[240px] leading-relaxed">
                Provide the household indicators on the left and run classification to view the ML predictions, confidence levels, and KalingaBot recommendations.
              </p>
            </div>
          )}

          {result && meta && (
            <>
              {/* SWDI Result Card */}
              <div className={`rounded-2xl border ${meta.border} ${meta.bg} p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">ML Classification Result</p>
                    <h2 className={`text-2xl font-black ${meta.text}`}>{meta.level}</h2>
                    <p className={`text-sm font-bold opacity-80 ${meta.text}`}>{meta.label}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-3xl font-black ${meta.text}`}>{(result.confidence * 100).toFixed(1)}%</span>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Model Confidence</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {Object.entries(result.probabilities ?? {}).map(([cls, prob]) => {
                    const m = SWDI_META[cls];
                    const pct = (prob * 100).toFixed(1);
                    return (
                      <div key={cls} className="flex items-center gap-2 text-[10px]">
                        <span className="w-16 font-semibold text-slate-600 text-right flex-shrink-0">{m?.level?.replace("SWDI ", "")}</span>
                        <div className="flex-1 bg-white/60 rounded-full h-2 overflow-hidden border border-white/80">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: m?.color }} />
                        </div>
                        <span className="w-10 font-bold text-right" style={{ color: m?.color }}>{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Feature Drivers */}
              {result.feature_impacts?.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] p-5">
                  <p className="text-xs font-bold text-slate-800 mb-3">Key Decision Drivers</p>
                  <ResponsiveContainer width="100%" height={170}>
                    <BarChart data={result.feature_impacts} layout="vertical"
                      margin={{ top: 0, right: 28, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                        tickFormatter={(v) => `${v.toFixed(0)}%`} />
                      <YAxis type="category" dataKey="feature" tick={{ fontSize: 10, fill: "#475569", fontWeight: 600 }}
                        axisLine={false} tickLine={false} width={145} />
                      <Tooltip content={<ChartTip />} />
                      <Bar dataKey="impact" radius={[0, 6, 6, 0]}>
                        {result.feature_impacts.map((d, i) => (
                          <Cell key={i} fill={d.impact >= 0 ? "#6366f1" : "#EF4444"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-[9px] text-slate-400 text-center mt-1">Relative feature sensitivity from stacking ensemble model.</p>
                </div>
              )}

              {/* KalingaBot AI Interpretation */}
              {result.interpretation && (
                <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4.5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                  <div className="flex items-center gap-2.5 mb-2">
                    <img
                      src={kalingaLogo}
                      alt="KalingaBot AI"
                      className="w-7 h-7 rounded-lg object-contain bg-white border border-indigo-100 p-0.5 shadow-xs flex-shrink-0"
                    />
                    <div>
                      <p className="text-[11px] font-bold text-indigo-900 leading-none">KalingaBot AI Interpretation</p>
                      <p className="text-[9px] text-indigo-500 font-medium mt-0.5">Policy & Socio-Economic Analysis</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-indigo-900/90 leading-relaxed pl-9">{result.interpretation}</p>
                </div>
              )}

              {/* Recommended Programs */}
              {result.recommendations?.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] p-5 space-y-3">
                  <p className="text-xs font-bold text-slate-800">Recommended Intervention Programs</p>
                  {result.recommendations.map((r, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[11px] font-bold text-slate-800">{r.name}</p>
                          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100">{r.sector}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">{r.agency}</p>
                        <p className="text-[10px] text-slate-600 mt-1 leading-relaxed">{r.rationale}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
