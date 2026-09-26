import React, { useState } from "react";
import {
  Building2, Sliders, Sparkles, RotateCcw, BarChart3,
  Users, Baby, GraduationCap, TrendingUp, AlertCircle,
  Home, DollarSign, CheckCircle2, Eye, EyeOff, Info
} from "lucide-react";
import kalingaLogo from "../assets/KalingaBot AI.png";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell
} from "recharts";
import GeoMap from "./GeoMap";
import { saveClassificationRecord } from "../utils/historyStore";

// Official PSA & PIDS Income Classification Tiers
const PSA_TIER_META = {
  Low: {
    level: "Level 1",
    label: "Low-Income Tier",
    color: "#EF4444",
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
  },
  Middle: {
    level: "Level 2",
    label: "Middle-Income Tier",
    color: "#F59E0B",
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
  },
  High: {
    level: "Level 3",
    label: "High-Income Tier",
    color: "#10B981",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
  },
};

const DISTRICT_V_BARANGAYS = [
  "Bagbag", "Capri", "Fairview", "Greater Lagro", "Gulod", "Kaligayahan",
  "Nagkaisang Nayon", "North Fairview", "Novaliches Proper",
  "Pasong Putik Proper", "San Agustin", "San Bartolome",
  "Santa Lucia", "Santa Monica", "Other / Custom Community"
];

// Presets for testing (cleanly toggleable ON / OFF)
const SAMPLE_PRESETS = [
  {
    name: "Sample Profile A (High Deprivation / Level 1 Range)",
    data: {
      pctEmployedHead: "44.0",
      avgMonthlyIncomePhp: "15500",
      pctWithAccessToElectricity: "64.0",
      pctWithSafeWaterAccess: "52.0",
      pctWithSanitaryToilet: "50.0",
      netEnrollmentRate: "70.0",
      pctPermanentHouseMaterial: "36.0",
      pctInformalSettlers: "46.0",
      avgFamilySize: "5.8",
      pctCompletedSecondaryEducation: "35.0",
    }
  },
  {
    name: "Sample Profile B (Transitional / Level 2 Range)",
    data: {
      pctEmployedHead: "58.0",
      avgMonthlyIncomePhp: "25000",
      pctWithAccessToElectricity: "76.0",
      pctWithSafeWaterAccess: "68.0",
      pctWithSanitaryToilet: "67.0",
      netEnrollmentRate: "80.0",
      pctPermanentHouseMaterial: "54.0",
      pctInformalSettlers: "31.0",
      avgFamilySize: "5.2",
      pctCompletedSecondaryEducation: "55.0",
    }
  },
  {
    name: "Sample Profile C (Self-Sufficient / Level 3 Range)",
    data: {
      pctEmployedHead: "74.0",
      avgMonthlyIncomePhp: "36500",
      pctWithAccessToElectricity: "88.0",
      pctWithSafeWaterAccess: "84.0",
      pctWithSanitaryToilet: "83.0",
      netEnrollmentRate: "89.0",
      pctPermanentHouseMaterial: "74.0",
      pctInformalSettlers: "15.0",
      avgFamilySize: "4.5",
      pctCompletedSecondaryEducation: "73.0",
    }
  }
];

const DEFAULT_FORM = {
  barangay: "Bagbag",
  pctEmployedHead: "",
  avgMonthlyIncomePhp: "",
  pctWithAccessToElectricity: "",
  pctWithSafeWaterAccess: "",
  pctWithSanitaryToilet: "",
  netEnrollmentRate: "",
  pctPermanentHouseMaterial: "",
  pctInformalSettlers: "",
  avgFamilySize: "",
  pctCompletedSecondaryEducation: "",
};

// 100% PSA MPI, FIES, and CPH Indicators
const FIELDS = [
  {
    id: "avgMonthlyIncomePhp",
    label: "Avg. Monthly Income (PHP)",
    icon: DollarSign,
    min: 2000,
    max: 100000,
    step: 500,
    placeholder: "e.g. 25,000",
    tip: "Average monthly household income benchmarked against PSA FIES."
  },
  {
    id: "pctInformalSettlers",
    label: "Informal Settlers Rate (%)",
    icon: Home,
    min: 0,
    max: 100,
    step: 0.1,
    placeholder: "e.g. 28.5",
    tip: "Households residing in informal or insecure housing tenure (PSA CPH Housing dimension)."
  },
  {
    id: "pctPermanentHouseMaterial",
    label: "Permanent Housing (%)",
    icon: Home,
    min: 0,
    max: 100,
    step: 0.1,
    placeholder: "e.g. 55.0",
    tip: "Proportion of homes built with concrete/permanent walls & sturdy roofs (PSA MPI Housing)."
  },
  {
    id: "pctWithAccessToElectricity",
    label: "Electricity Access (%)",
    icon: Sparkles,
    min: 0,
    max: 100,
    step: 0.1,
    placeholder: "e.g. 78.0",
    tip: "Share of households connected to electrical power grid (PSA Basic Utilities)."
  },
  {
    id: "pctWithSafeWaterAccess",
    label: "Safe Water Access (%)",
    icon: TrendingUp,
    min: 0,
    max: 100,
    step: 0.1,
    placeholder: "e.g. 70.0",
    tip: "Households with reliable access to safe drinking water (PSA Water dimension)."
  },
  {
    id: "pctWithSanitaryToilet",
    label: "Sanitary Toilet Access (%)",
    icon: CheckCircle2,
    min: 0,
    max: 100,
    step: 0.1,
    placeholder: "e.g. 68.0",
    tip: "Households with water-sealed sanitary toilet facilities (PSA Sanitation dimension)."
  },
  {
    id: "netEnrollmentRate",
    label: "School Enrollment Rate (%)",
    icon: GraduationCap,
    min: 0,
    max: 100,
    step: 0.1,
    placeholder: "e.g. 81.0",
    tip: "Net attendance rate among youth aged 6 to 17 (PSA MPI Education dimension)."
  },
  {
    id: "pctCompletedSecondaryEducation",
    label: "Completed High School (%)",
    icon: GraduationCap,
    min: 0,
    max: 100,
    step: 0.1,
    placeholder: "e.g. 54.0",
    tip: "Share of household heads who completed secondary education (PSA Human Capital)."
  },
  {
    id: "pctEmployedHead",
    label: "Employed Household Heads (%)",
    icon: Users,
    min: 0,
    max: 100,
    step: 0.1,
    placeholder: "e.g. 60.0",
    tip: "Percentage of household heads gainfully employed (PSA Labor Force Survey / MPI)."
  },
  {
    id: "avgFamilySize",
    label: "Avg. Family Size (members)",
    icon: Baby,
    min: 1,
    max: 12,
    step: 0.1,
    placeholder: "e.g. 5.1",
    tip: "Average household size dividing income and subsistence resources (PSA CPH / FIES)."
  },
];

const FEATURE_ICON_MAP = {
  "Average Monthly Income": DollarSign,
  "Informal Settlement Rate": Home,
  "Permanent Housing Materials": Home,
  "Electricity Access": Sparkles,
  "Safe Drinking Water Access": TrendingUp,
  "Sanitary Toilet Facility": CheckCircle2,
  "Net School Enrollment": GraduationCap,
  "Secondary Education Completion": GraduationCap,
  "Employed Household Heads": Users,
  "Average Family Size": Baby,
};

export default function BarangayClassifier() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [selectedPreset, setPreset] = useState("");
  const [showPresets, setShowPresets] = useState(false); // Quick samples toggle ON/OFF

  const handleChange = (id, val) => {
    setForm((f) => ({ ...f, [id]: val }));
    setPreset("");
  };

  const handlePresetSelect = (presetIndex) => {
    if (presetIndex === "") {
      setPreset("");
      return;
    }
    const idx = Number(presetIndex);
    const chosen = SAMPLE_PRESETS[idx];
    if (chosen) {
      setPreset(idx);
      setForm((prev) => ({
        ...prev,
        ...chosen.data,
      }));
      setResult(null);
      setError(null);
    }
  };

  const isFormValid = FIELDS.every((f) => form[f.id] !== "" && !isNaN(Number(form[f.id])));

  const handleSubmit = async () => {
    if (!isFormValid) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("http://localhost:8000/api/classify-barangay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barangay: form.barangay,
          pct_employed_head: Number(form.pctEmployedHead),
          avg_monthly_income_php: Number(form.avgMonthlyIncomePhp),
          pct_with_access_to_electricity: Number(form.pctWithAccessToElectricity),
          pct_with_safe_water_access: Number(form.pctWithSafeWaterAccess),
          pct_with_sanitary_toilet: Number(form.pctWithSanitaryToilet),
          net_enrollment_rate: Number(form.netEnrollmentRate),
          pct_permanent_house_material: Number(form.pctPermanentHouseMaterial),
          pct_informal_settlers: Number(form.pctInformalSettlers),
          avg_family_size: Number(form.avgFamilySize),
          pct_completed_secondary_education: Number(form.pctCompletedSecondaryEducation),
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data);

      // Save to session classification history
      try {
        const topDriver = data.top_features && data.top_features.length > 0 ? data.top_features[0].feature : null;
        saveClassificationRecord({
          type: "barangay",
          target: form.barangay,
          predicted_class: data.predicted_class,
          confidence: data.confidence ? Math.round(data.confidence * 100) : null,
          top_feature: topDriver,
          inputs: {
            "Avg Monthly Income": `PHP ${Number(form.avgMonthlyIncomePhp).toLocaleString()}`,
            "Informal Settlers": `${form.pctInformalSettlers}%`,
            "Permanent Housing": `${form.pctPermanentHouseMaterial}%`,
            "Employed Heads": `${form.pctEmployedHead}%`,
            "Avg Family Size": form.avgFamilySize,
          },
        });
      } catch (err) {
        console.warn("Failed to record history:", err);
      }
    } catch (e) {
      setError(e.message || "Failed to connect to classification server.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm(DEFAULT_FORM);
    setResult(null);
    setError(null);
    setPreset("");
  };

  const meta = result ? (PSA_TIER_META[result.predicted_class] ?? PSA_TIER_META["Middle"]) : null;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">

        {/* LEFT: Input Form */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-500" /> Community Socio-Economic Profile
              </p>
              <div className="flex items-center gap-3">
                {/* Quick Samples On/Off Toggle Button */}
                <button
                  type="button"
                  onClick={() => setShowPresets(!showPresets)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer ${showPresets
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                    : "bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700"
                    }`}
                  title="Toggle Quick Test Samples on or off"
                >
                  {showPresets ? <EyeOff className="w-3.5 h-3.5 text-indigo-600" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
                  <span>Testing Samples: {showPresets ? "ON" : "OFF"}</span>
                </button>

                <button
                  onClick={handleReset}
                  className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              </div>
            </div>

            {/* Quick Fill Dropdown (Only visible when Testing Mode is ON) */}
            {showPresets && (
              <div className="mb-3.5 p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 animate-in fade-in duration-200">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                    Testing Mode: Select Sample Community Profile
                  </label>
                  <span className="text-[9px] text-indigo-500 font-medium">Auto-fills input fields for evaluation</span>
                </div>
                <select
                  value={selectedPreset}
                  onChange={(e) => handlePresetSelect(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
                >
                  <option value="">Choose a test profile to load...</option>
                  {SAMPLE_PRESETS.map((p, idx) => (
                    <option key={idx} value={idx}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-3">
              {/* Barangay Location Dropdown (Descriptive Target Label) */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center justify-between">
                  <span>Target Barangay (Reference Community)</span>
                  <span className="text-[9.5px] text-slate-400 font-normal">Identifies which community is being profiled</span>
                </label>
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

              {/* 10 Socio-Economic Indicator Inputs */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                {FIELDS.map((field) => {
                  const IconComp = field.icon;
                  return (
                    <div
                      key={field.id}
                      className="relative"
                      onMouseEnter={() => setHovered(field.id)}
                      onMouseLeave={() => setHovered(null)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-semibold text-slate-600 truncate">
                          {field.label}
                        </label>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          min={field.min}
                          max={field.max}
                          step={field.step}
                          placeholder={field.placeholder}
                          value={form[field.id]}
                          onChange={(e) => handleChange(field.id, e.target.value)}
                          className="w-full px-3.5 py-2 text-sm font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all placeholder:text-slate-300"
                        />
                      </div>
                      {hovered === field.id && (
                        <div className="absolute right-0 top-0 z-20 bg-slate-900 text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-xl max-w-[220px] leading-snug pointer-events-none">
                          {field.tip}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-3">
            <button
              onClick={handleSubmit}
              disabled={!isFormValid || loading}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-[12px] flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              {loading
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Running Stacking Model…</>
                : <> Classify Barangay Income Tier</>
              }
            </button>
            {!isFormValid && !loading && (
              <p className="text-center text-[10px] text-slate-400 flex items-center justify-center gap-1 mt-2">
                <AlertCircle className="w-3 h-3" /> Complete all 10 indicators to run the machine learning classification.
              </p>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-[11px] text-red-700 font-medium mt-2">{error}</div>
            )}
          </div>
        </div>

        {/* RIGHT: Classification Results */}
        <div className="h-[560px] overflow-y-auto pr-1 space-y-4 rounded-2xl scrollbar-thin scrollbar-thumb-slate-200">
          {!result && !loading && (
            <div className="h-full bg-white rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center p-10">
              <img src={kalingaLogo} alt="KalingaBot AI" className="w-16 h-16 object-contain mb-3" />
              <p className="text-sm font-bold text-slate-700">Ready to Classify</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-[250px] leading-relaxed">
                Provide the community indicators on the left and run classification to view the ML predictions, confidence levels, and decision drivers.
              </p>
            </div>
          )}

          {result && meta && (
            <>
              {/* Prediction Card - Aligned with clean theme (White card, subtle border & shadow) */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        OFFICIAL INCOME TIER
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        result.predicted_class === "Low"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : result.predicted_class === "Middle"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}>
                        {meta.label}
                      </span>
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                      {meta.level}
                    </h2>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">
                      {form.barangay ? `Barangay ${form.barangay}` : "Classified Community"}
                    </p>
                  </div>

                  <div className="text-right bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-xl">
                    <span className="text-2xl font-black text-indigo-600 leading-none">
                      {(result.confidence * 100).toFixed(1)}%
                    </span>
                    <p className="text-[10px] font-semibold text-slate-400 mt-1">Model Confidence</p>
                  </div>
                </div>

                {/* Probability Distribution Chart (UX-improved Bar Chart) */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-bold text-slate-700">Tier Probability Distribution</p>
                    <span className="text-[10px] text-slate-400 font-medium">Stacking Ensemble Softmax</span>
                  </div>

                  <div className="h-36 w-full pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={Object.entries(result.probabilities ?? {}).map(([cls, prob]) => ({
                          name: PSA_TIER_META[cls]?.level || cls,
                          label: PSA_TIER_META[cls]?.label || cls,
                          percentage: Number((prob * 100).toFixed(1)),
                          isWinner: cls === result.predicted_class,
                        }))}
                        margin={{ top: 12, right: 10, left: -20, bottom: 0 }}
                      >
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11, fontWeight: 600, fill: "#64748b" }}
                          axisLine={{ stroke: "#e2e8f0" }}
                          tickLine={false}
                        />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fontSize: 10, fill: "#94a3b8" }}
                          axisLine={false}
                          tickLine={false}
                          unit="%"
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(241, 245, 249, 0.6)" }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div className="bg-slate-900 text-white text-[11px] px-3 py-2 rounded-xl shadow-xl space-y-0.5">
                                  <p className="font-bold text-slate-200">{d.name} · {d.label}</p>
                                  <p className="text-indigo-300 font-black text-xs">{d.percentage}% probability</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar
                          dataKey="percentage"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={48}
                          animationDuration={800}
                        >
                          {Object.keys(result.probabilities ?? {}).map((cls) => {
                            const isWinner = cls === result.predicted_class;
                            return (
                              <Cell
                                key={cls}
                                fill={isWinner ? "#4f46e5" : "#cbd5e1"}
                              />
                            );
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium px-1 pt-2">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600 inline-block" />
                      Classified Tier (Highest Probability)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-slate-300 inline-block" />
                      Alternative Classes
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Geo-Map ── */}
              <GeoMap
                barangay={form.barangay}
                tier={result.predicted_class}
              />

              {/* ── Key Decision Drivers ── */}
              {result.feature_impacts?.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] p-5 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Key Decision Drivers</p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Model feature importances contextualized by baseline deviations
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-1">
                    {result.feature_impacts.map((d, i) => {
                      const IconComp = FEATURE_ICON_MAP[d.feature] || BarChart3;
                      const isTop = i === 0;
                      return (
                        <div
                          key={d.feature}
                          className={`p-2.5 rounded-xl border transition-all ${isTop
                            ? "bg-indigo-50/40 border-indigo-100 shadow-xs"
                            : "bg-slate-50/70 border-slate-100 hover:border-slate-200"
                            }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${isTop ? "bg-indigo-600 text-white" : "bg-white text-slate-500 border border-slate-200"
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
                              <span className={`text-xs font-black min-w-[42px] text-right ${isTop ? "text-indigo-600" : "text-slate-700"}`}>
                                {Number(d.impact).toFixed(1)}%
                              </span>
                            </div>
                          </div>

                          <div className="w-full bg-slate-200/70 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${isTop
                                ? "bg-gradient-to-r from-indigo-600 to-indigo-400"
                                : "bg-gradient-to-r from-indigo-400 to-slate-400"
                                }`}
                              style={{ width: `${Math.max(Number(d.impact), 3.5)}%` }}
                            />
                          </div>
                          {d.desc && (
                            <p className="text-[9.5px] text-slate-400 mt-1 pl-7 leading-tight font-medium">{d.desc}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── KalingaBot AI Suggestions ── */}
              {(result.interpretation || result.recommendations?.length > 0) && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] p-5 space-y-3.5">
                  {/* Header */}
                  <div className="flex items-center gap-3">
                    <img
                      src={kalingaLogo}
                      alt="KalingaBot"
                      className="w-7 h-7 object-contain flex-shrink-0"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-800">KalingaBot AI Suggestions</p>
                      <p className="text-[10px] text-slate-400 font-medium">Gemini-powered recommendations based on this barangay's PSA indicators</p>
                    </div>
                  </div>

                  {/* AI interpretation */}
                  {result.interpretation && (
                    <p className="text-[11px] text-slate-600 leading-relaxed bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                      {result.interpretation}
                    </p>
                  )}

                  {/* Program cards */}
                  {result.recommendations?.length > 0 && (
                    <div className="space-y-2.5 pt-0.5">
                      {result.recommendations.map((rec, i) => {
                        const SECTOR_COLORS = {
                          "Livelihood":        { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
                          "Education":         { bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200"    },
                          "Housing":           { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200"   },
                          "Health":            { bg: "bg-rose-50",    text: "text-rose-700",    border: "border-rose-200"    },
                          "Financial Support": { bg: "bg-indigo-50",  text: "text-indigo-700",  border: "border-indigo-200"  },
                        };
                        const colors = SECTOR_COLORS[rec.sector] || { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" };
                        return (
                          <div
                            key={i}
                            className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all"
                          >
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="text-[11px] font-bold text-slate-800 leading-tight">{rec.name}</p>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${colors.bg} ${colors.text} border ${colors.border}`}>
                                {rec.sector}
                              </span>
                            </div>
                            <p className="text-[10px] font-semibold text-indigo-600 mb-1">{rec.agency}</p>
                            <p className="text-[10px] text-slate-500 leading-relaxed">{rec.rationale}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
