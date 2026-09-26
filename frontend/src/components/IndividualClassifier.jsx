import React, { useState } from "react";
import {
  User, Sliders, Sparkles, RotateCcw,
  TrendingUp, AlertCircle, CheckCircle2, Info, MapPin,
  Wallet, Users, Scale, GraduationCap, BarChart3
} from "lucide-react";
import kalingaLogo from "../assets/KalingaBot AI.png";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, ResponsiveContainer,
} from "recharts";
import { saveClassificationRecord } from "../utils/historyStore";

const SWDI_META = {
  Low:    { level: "Level 1", label: "Survival",        color: "#EF4444", bg: "bg-red-50",     border: "border-red-200",     text: "text-red-700" },
  Middle: { level: "Level 2", label: "Subsistence",     color: "#F59E0B", bg: "bg-amber-50",   border: "border-amber-200",   text: "text-amber-700" },
  High:   { level: "Level 3", label: "Self-Sufficient", color: "#10B981", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
};

const DISTRICT_V_BARANGAYS = [
  "Bagbag", "Capri", "Fairview", "Greater Lagro", "Gulod", "Kaligayahan",
  "Nagkaisang Nayon", "North Fairview", "Novaliches Proper",
  "Pasong Putik Proper", "San Agustin", "San Bartolome",
  "Santa Lucia", "Santa Monica"
];

const FEATURE_ICONS = {
  "Per-Capita Income": Wallet,
  "Total Monthly Income": TrendingUp,
  "Income per Dependent": Scale,
  "Family Size": Users,
  "Minor Dependents": User,
  "Children in School": GraduationCap,
  "School Attendance Rate": GraduationCap,
  "Dependency Burden": AlertCircle,
  "Out-of-School Children": AlertCircle,
};

const FIELDS = [
  { id: "total_monthly_income", label: "Monthly Per-Capita Income (PHP)", type: "number", min: 0,  max: 500000, step: 500, placeholder: "e.g. 15,000", icon: "PhP", tip: "Total combined income of ALL earners in the household per month." },
  { id: "family_size",         label: "Family Size",                          type: "number", min: 1,  max: 20,     step: 1,   placeholder: "e.g. 5",      icon: "Fam", tip: "Total number of family members in the household." },
  { id: "dependents_0_18",     label: "Dependents below 18 yrs old",          type: "number", min: 0,  max: 20,     step: 1,   placeholder: "e.g. 3",      icon: "Dep", tip: "Number of children aged 0 to 18 living at home." },
  { id: "children_in_school",  label: "Children Attending School",             type: "number", min: 0,  max: 20,     step: 1,   placeholder: "e.g. 2",      icon: "Sch", tip: "Number of school-age children currently enrolled." },
];

const FOUR_PS_STATUS_OPTIONS = ["Active", "Graduated", "Conditionally Compliant", "None"];

const DEFAULT_FORM = {
  barangay: "Bagbag",
  total_monthly_income: "",
  family_size: "",
  dependents_0_18: "",
  children_in_school: "",
  household_status: "None",
};

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
      const familySize = Math.max(Number(form.family_size), 1);
      const res = await fetch("http://localhost:8000/api/classify-individual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barangay:             form.barangay,
          total_monthly_income: Number(form.total_monthly_income),
          family_size:          familySize,
          dependents_0_18:      Number(form.dependents_0_18),
          children_in_school:   Number(form.children_in_school),
          household_status:     form.household_status,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data);

      try {
        const topDriver = data.top_features && data.top_features.length > 0 ? data.top_features[0].feature : null;
        saveClassificationRecord({
          type: "individual",
          target: `${form.barangay} Household`,
          predicted_class: data.predicted_class,
          confidence: data.confidence ? Math.round(data.confidence * 100) : null,
          top_feature: topDriver,
          inputs: {
            "Barangay": form.barangay,
            "Monthly Income": `PHP ${Number(form.total_monthly_income).toLocaleString()}`,
            "Family Size": familySize,
            "Dependents (0-18)": form.dependents_0_18,
            "Children in School": form.children_in_school,
            "4Ps Status": form.household_status,
          },
        });
      } catch (err) {
        console.warn("Failed to record history:", err);
      }
    } catch (e) {
      setError(e.message || "Server error. Make sure the API is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => { setForm(DEFAULT_FORM); setResult(null); setError(null); };
  const meta = result ? (SWDI_META[result.predicted_class] ?? SWDI_META["Middle"]) : null;

  return (
    <div className="space-y-5">

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
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Barangay Location (District V)
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
                    <input
                      type={field.type} min={field.min} max={field.max} step={field.step}
                      value={form[field.id]} onChange={(e) => handleChange(field.id, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full px-3.5 py-2 text-sm font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all placeholder:text-slate-300"
                    />
                  </div>
                  {hovered === field.id && (
                    <div className="absolute right-0 top-0 z-20 bg-slate-900 text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-xl max-w-[200px] leading-snug pointer-events-none">
                      <Info className="w-3 h-3 inline mr-1 opacity-70" />{field.tip}
                    </div>
                  )}
                </div>
              ))}

              {/* 4Ps Household Status Pill Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                  4Ps Household Status
                </label>
                <div className="flex flex-wrap gap-2">
                  {FOUR_PS_STATUS_OPTIONS.map((status) => {
                    const isSelected = form.household_status === status;
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => handleChange("household_status", status)}
                        className={`text-[11px] font-semibold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {status}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button onClick={handleSubmit} disabled={!isFormValid || loading}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-[13px] flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer">
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
              <img src={kalingaLogo} alt="KalingaBot AI" className="w-16 h-16 object-contain mb-3" />
              <p className="text-sm font-bold text-slate-700">Ready to Classify</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-[240px] leading-relaxed">
                Provide the household indicators on the left and run classification to view the ML predictions, confidence levels, and KalingaBot recommendations.
              </p>
            </div>
          )}

          {result && meta && (
            <>
              {/* SWDI Result Card */}
              <div className={`rounded-2xl border ${meta.border} ${meta.bg} p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)]`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">ML CLASSIFICATION RESULT</p>
                    <h2 className={`text-2xl font-black ${meta.text}`}>SWDI {meta.level}</h2>
                    <p className={`text-sm font-bold opacity-80 ${meta.text}`}>{meta.label}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-3xl font-black ${meta.text}`}>{(result.confidence * 100).toFixed(1)}%</span>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Model Confidence</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {Object.entries(result.probabilities ?? {}).map(([cls, prob]) => {
                    const m = SWDI_META[cls];
                    const pct = (prob * 100).toFixed(1);
                    return (
                      <div key={cls} className="flex items-center gap-2 text-[10px]">
                        <span className="w-16 font-semibold text-slate-600 text-right flex-shrink-0">{m?.level}</span>
                        <div className="flex-1 bg-white/70 rounded-full h-2 overflow-hidden border border-white/90">
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
                <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] p-5 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                        <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Key Decision Drivers</p>
                        <p className="text-[10px] text-slate-400 font-medium">Tree importance blended with District V baseline deviations</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase tracking-wider">
                      Ensemble ML
                    </span>
                  </div>

                  <div className="space-y-2.5 pt-1">
                    {result.feature_impacts.map((d, i) => {
                      const IconComp = FEATURE_ICONS[d.feature] || BarChart3;
                      const isTop = i === 0;
                      return (
                        <div key={d.feature} className={`p-2.5 rounded-xl border transition-all ${
                          isTop
                            ? "bg-indigo-50/40 border-indigo-100 shadow-xs"
                            : "bg-slate-50/70 border-slate-100 hover:border-slate-200"
                        }`}>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                                isTop ? "bg-indigo-600 text-white shadow-xs" : "bg-white text-slate-500 border border-slate-200"
                              }`}>
                                #{i + 1}
                              </span>
                              <div className="flex items-center gap-1.5 min-w-0">
                                <IconComp className={`w-3.5 h-3.5 flex-shrink-0 ${isTop ? "text-indigo-600" : "text-slate-400"}`} />
                                <span className={`text-[11px] font-bold truncate ${isTop ? "text-indigo-950" : "text-slate-700"}`}>
                                  {d.feature}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {d.user_value && (
                                <span className="text-[10px] font-semibold text-slate-500 bg-white/90 border border-slate-200/80 px-2 py-0.5 rounded-md">
                                  {d.user_value}
                                </span>
                              )}
                              <span className={`text-xs font-black min-w-[42px] text-right ${
                                isTop ? "text-indigo-600" : "text-slate-700"
                              }`}>
                                {Number(d.impact).toFixed(1)}%
                              </span>
                            </div>
                          </div>

                          {/* Progress Track */}
                          <div className="w-full bg-slate-200/70 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${
                                isTop
                                  ? "bg-gradient-to-r from-indigo-600 to-indigo-400 shadow-xs"
                                  : "bg-gradient-to-r from-indigo-400 to-slate-400"
                              }`}
                              style={{ width: `${Math.max(Number(d.impact), 3.5)}%` }}
                            />
                          </div>

                          {d.desc && (
                            <p className="text-[9.5px] text-slate-400 mt-1 pl-7 leading-tight font-medium">
                              {d.desc}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Vulnerability Flags */}
              {result.vulnerability_flags?.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 space-y-2 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                  <p className="text-[11px] font-bold text-amber-800 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    Vulnerability Warnings
                  </p>
                  {result.vulnerability_flags.map((v, i) => (
                    <div key={i} className={`flex items-start gap-2 p-2.5 rounded-xl border text-[10px] ${
                      v.severity === "critical"
                        ? "bg-red-50 border-red-200 text-red-800"
                        : "bg-amber-50 border-amber-200 text-amber-800"
                    }`}>
                      <AlertCircle className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${v.severity === "critical" ? "text-red-500" : "text-amber-500"}`} />
                      <div>
                        <span className="font-bold">{v.flag}: </span>
                        <span className="font-medium opacity-90">{v.detail}</span>
                      </div>
                    </div>
                  ))}
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
