import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sliders, RotateCcw, AlertCircle, Eye, EyeOff, Info,
  DollarSign, Users, Home, Sparkles, TrendingUp, CheckCircle2, GraduationCap, Baby, HelpCircle, ChevronDown
} from "lucide-react";
import kalingaLogo from "../assets/KalingaBot AI.png";
import GeoMap from "./GeoMap";
import PredictionCard from "./PredictionCard";
import FeatureDrivers from "./FeatureDrivers";
import AISuggestions from "./AISuggestions";
import { saveClassificationRecord } from "../utils/historyStore";
import { classifyBarangay } from "../services/api";
import { useServerHealth } from "../context/ServerHealthContext";

const DISTRICT_V_BARANGAYS = [
  "Bagbag", "Capri", "Fairview", "Greater Lagro", "Gulod", "Kaligayahan",
  "Nagkaisang Nayon", "North Fairview", "Novaliches Proper",
  "Pasong Putik Proper", "San Agustin", "San Bartolome",
  "Santa Lucia", "Santa Monica", "Other / Custom Community"
];

// Presets for testing
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

const REQUIRED_KEYS = [
  "pctEmployedHead",
  "avgMonthlyIncomePhp",
  "pctWithAccessToElectricity",
  "pctWithSafeWaterAccess",
  "pctWithSanitaryToilet",
  "netEnrollmentRate",
  "pctPermanentHouseMaterial",
  "pctInformalSettlers",
  "avgFamilySize",
  "pctCompletedSecondaryEducation",
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  },
};

const SESSION_FORM_KEY = "qc5_barangay_form_draft";
const SESSION_RESULT_KEY = "qc5_barangay_prediction_result";

// Field Validator
export const validateField = (id, val) => {
  if (val === "" || val === null || val === undefined) return null;
  const num = Number(val);
  if (isNaN(num)) return "Must be a valid number";

  if (id === "avgMonthlyIncomePhp") {
    if (num <= 0) return "Income must be positive (> ₱0)";
    if (num < 500) return "Minimum operational income is ₱500";
    if (num > 1000000) return "Value exceeds realistic limit (₱1,000,000)";
    return null;
  }

  if (id === "avgFamilySize") {
    if (num <= 0) return "Family size must be positive (> 0)";
    if (num < 1) return "Must be at least 1 member";
    if (num > 25) return "Realistic limit is 25 members";
    return null;
  }

  // Percentage fields (0 to 100)
  if (num < 0) return "Percentage cannot be negative (min 0%)";
  if (num > 100) return "Percentage cannot exceed 100% (max 100%)";

  return null;
};

export default function BarangayClassifier() {
  const [form, setForm] = useState(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_FORM_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_FORM;
    } catch {
      return DEFAULT_FORM;
    }
  });

  const [result, setResult] = useState(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_RESULT_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hoveredField, setHoveredField] = useState(null);
  const [selectedPreset, setPreset] = useState("");
  const [showPresets, setShowPresets] = useState(false);
  const [requestSeconds, setRequestSeconds] = useState(0);
  const resultsRef = useRef(null);
  const [showScrollHint, setShowScrollHint] = useState(false);

  const { status: serverStatus, secondsElapsed: serverSeconds } = useServerHealth();

  // Keep form synced to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_FORM_KEY, JSON.stringify(form));
    } catch (e) {
      console.warn("Failed to persist form draft", e);
    }
  }, [form]);

  // Keep result synced to sessionStorage
  useEffect(() => {
    try {
      if (result) {
        sessionStorage.setItem(SESSION_RESULT_KEY, JSON.stringify(result));
      } else {
        sessionStorage.removeItem(SESSION_RESULT_KEY);
      }
    } catch (e) {
      console.warn("Failed to persist prediction result", e);
    }
  }, [result]);

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

  // Real-time Field Errors calculation
  const fieldErrors = useMemo(() => {
    const errs = {};
    for (const key of REQUIRED_KEYS) {
      const msg = validateField(key, form[key]);
      if (msg) errs[key] = msg;
    }
    return errs;
  }, [form]);

  const hasValidationErrors = Object.keys(fieldErrors).length > 0;
  const isFormFilled = REQUIRED_KEYS.every(
    (k) => form[k] !== "" && !isNaN(Number(form[k]))
  );
  const isFormValid = isFormFilled && !hasValidationErrors;

  const handleSubmit = async () => {
    if (!isFormValid) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setRequestSeconds(0);

    const startReqTime = Date.now();
    const reqTimer = setInterval(() => {
      setRequestSeconds(Math.floor((Date.now() - startReqTime) / 1000));
    }, 500);

    try {
      const data = await classifyBarangay({
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
      });
      setResult(data);

      try {
        const drivers = data.feature_impacts || [];
        const topDriver = drivers.length > 0 ? drivers[0].feature : null;
        saveClassificationRecord({
          type: "barangay",
          target: form.barangay,
          barangay: form.barangay,
          predicted_class: data.predicted_class,
          tier_label: data.tier_label,
          tier_meaning: data.tier_meaning,
          confidence: data.confidence ? Math.round(data.confidence * 100) : null,
          probabilities: data.probabilities,
          top_feature: topDriver,
          feature_impacts: drivers,
          ai_interpretation: data.interpretation || null,
          ai_recommendations: data.recommendations || [],
          ai_provider: data.ai_provider,
          is_fallback: data.is_fallback,
          ai_note: data.ai_note,
          inputs: data.inputs || {
            "Avg Monthly Income": `PHP ${Number(form.avgMonthlyIncomePhp).toLocaleString()}`,
            "Employed Heads": `${form.pctEmployedHead}%`,
            "Informal Settlers": `${form.pctInformalSettlers}%`,
            "Electricity Access": `${form.pctWithAccessToElectricity}%`,
            "Safe Water Access": `${form.pctWithSafeWaterAccess}%`,
            "Sanitary Toilet": `${form.pctWithSanitaryToilet}%`,
            "Permanent Housing": `${form.pctPermanentHouseMaterial}%`,
            "School Enrollment": `${form.netEnrollmentRate}%`,
            "Secondary Educated": `${form.pctCompletedSecondaryEducation}%`,
            "Avg Family Size": form.avgFamilySize,
          },
          raw_inputs: data.raw_inputs || {
            barangay: form.barangay,
            avg_monthly_income_php: Number(form.avgMonthlyIncomePhp),
            pct_employed_head: Number(form.pctEmployedHead),
            pct_informal_settlers: Number(form.pctInformalSettlers),
            pct_with_access_to_electricity: Number(form.pctWithAccessToElectricity),
            pct_with_safe_water_access: Number(form.pctWithSafeWaterAccess),
            pct_with_sanitary_toilet: Number(form.pctWithSanitaryToilet),
            pct_permanent_house_material: Number(form.pctPermanentHouseMaterial),
            net_enrollment_rate: Number(form.netEnrollmentRate),
            pct_completed_secondary_education: Number(form.pctCompletedSecondaryEducation),
            avg_family_size: Number(form.avgFamilySize),
          }
        });
      } catch (err) {
        console.warn("Failed to record history:", err);
      }
    } catch (e) {
      setError(e.message || "Failed to connect to classification server.");
    } finally {
      clearInterval(reqTimer);
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm(DEFAULT_FORM);
    setResult(null);
    setError(null);
    setPreset("");
    try {
      sessionStorage.removeItem(SESSION_FORM_KEY);
      sessionStorage.removeItem(SESSION_RESULT_KEY);
    } catch (e) {
      console.warn("Failed to clear sessionStorage drafts", e);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        {/* LEFT PANEL: Multi-Density Form */}
        <div className="neu-surface rounded-3xl p-6 space-y-4 flex flex-col justify-between shadow-sm">
          <div>
            {/* Header / Subtitle & Test Controls */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-600" />
                <span className="text-[13px] font-semibold tracking-[-0.01em] text-slate-800">
                  Community Profile
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowPresets(!showPresets)}
                  className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium rounded-xl transition-all cursor-pointer ${
                    showPresets
                      ? "neu-inset text-indigo-700 font-bold"
                      : "neu-btn text-slate-600 hover:text-slate-900"
                  }`}
                  title="Toggle Quick Test Samples on or off"
                >
                  {showPresets ? (
                    <EyeOff className="w-3.5 h-3.5 text-indigo-600" />
                  ) : (
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span>Samples: {showPresets ? "ON" : "OFF"}</span>
                </button>

                <button
                  onClick={handleReset}
                  className="flex items-center gap-1 text-[10px] font-medium text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              </div>
            </div>

            {/* Quick Fill Dropdown */}
            {showPresets && (
              <div className="mb-4 p-3.5 rounded-2xl neu-inset-sm">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-[0.12em] text-indigo-700 font-semibold">
                    Load a Sample Community Profile
                  </label>
                  <span className="text-[9px] text-indigo-600 font-medium font-mono">Fills all 10 fields</span>
                </div>
                <select
                  value={selectedPreset}
                  onChange={(e) => handlePresetSelect(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-medium text-slate-700 neu-input rounded-xl focus:outline-none cursor-pointer"
                >
                  <option value="">Choose a sample profile to load...</option>
                  {SAMPLE_PRESETS.map((p, idx) => (
                    <option key={idx} value={idx}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Target Community Selector */}
            <div className="mb-4">
              <label className="block text-[11px] font-medium text-slate-500 mb-1 flex items-center justify-between">
                <span>SELECT BARANGAY</span>
                <span className="text-[9.5px] text-slate-400 font-normal">District V, Quezon City</span>
              </label>
              <select
                value={form.barangay}
                onChange={(e) => handleChange("barangay", e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-semibold text-slate-800 neu-input rounded-xl cursor-pointer"
              >
                {DISTRICT_V_BARANGAYS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* ── STEP 1: INCOME & EMPLOYMENT ── */}
            <div className="p-4 rounded-2xl neu-inset-sm space-y-3 mb-4 bg-white/40 border border-white/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                    1
                  </span>
                  <span className="text-xs font-bold text-slate-800 tracking-tight">
                    Income & Work
                  </span>
                </div>
                <span className="text-[10px] font-medium text-slate-400">Main factors</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                {/* Hero Field: Avg Monthly Income */}
                <div
                  className="relative sm:col-span-2"
                  onMouseEnter={() => setHoveredField("avgMonthlyIncomePhp")}
                  onMouseLeave={() => setHoveredField(null)}
                >
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Average Monthly Household Income (₱)</span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold">
                      Most Important
                    </span>
                  </label>
                  <div
                    className={`relative flex items-center rounded-xl neu-inset border-l-4 ${
                      fieldErrors.avgMonthlyIncomePhp
                        ? "border-l-rose-500 border-rose-300 bg-rose-50/20"
                        : "border-l-indigo-600 bg-white"
                    }`}
                  >
                    <span className="pl-3.5 text-indigo-600 font-bold text-sm select-none">₱</span>
                    <input
                      type="number"
                      min={1000}
                      step={500}
                      placeholder="e.g. 25,000"
                      value={form.avgMonthlyIncomePhp}
                      onChange={(e) => handleChange("avgMonthlyIncomePhp", e.target.value)}
                      className="w-full px-2.5 py-2.5 text-sm font-semibold font-mono tabular-nums text-slate-900 bg-transparent focus:outline-none placeholder:text-slate-400"
                    />
                  </div>
                  {fieldErrors.avgMonthlyIncomePhp ? (
                    <span className="text-[10px] text-rose-600 font-medium flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      {fieldErrors.avgMonthlyIncomePhp}
                    </span>
                  ) : (
                    <span className="text-[9.5px] text-slate-400 mt-1 block">
                      District V typical average: around ₱25,500/month
                    </span>
                  )}
                </div>

                {/* Employed Household Heads */}
                <div
                  className="relative"
                  onMouseEnter={() => setHoveredField("pctEmployedHead")}
                  onMouseLeave={() => setHoveredField(null)}
                >
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Heads of Family with Jobs (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    placeholder="e.g. 60.0"
                    value={form.pctEmployedHead}
                    onChange={(e) => handleChange("pctEmployedHead", e.target.value)}
                    className={`w-full px-3 py-2 text-xs font-mono tabular-nums font-semibold text-slate-800 neu-input rounded-xl placeholder:text-slate-400 bg-white ${
                      fieldErrors.pctEmployedHead ? "border-rose-400 bg-rose-50/30 text-rose-900" : ""
                    }`}
                  />
                  {fieldErrors.pctEmployedHead ? (
                    <span className="text-[10px] text-rose-600 font-medium flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      {fieldErrors.pctEmployedHead}
                    </span>
                  ) : (
                    <span className="text-[9.5px] text-slate-400 mt-1 block">Enter 0 to 100</span>
                  )}
                </div>

                {/* Informal Settlers */}
                <div
                  className="relative"
                  onMouseEnter={() => setHoveredField("pctInformalSettlers")}
                  onMouseLeave={() => setHoveredField(null)}
                >
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Families Without Land Title (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    placeholder="e.g. 28.5"
                    value={form.pctInformalSettlers}
                    onChange={(e) => handleChange("pctInformalSettlers", e.target.value)}
                    className={`w-full px-3 py-2 text-xs font-mono tabular-nums font-semibold text-slate-800 neu-input rounded-xl placeholder:text-slate-400 bg-white ${
                      fieldErrors.pctInformalSettlers ? "border-rose-400 bg-rose-50/30 text-rose-900" : ""
                    }`}
                  />
                  {fieldErrors.pctInformalSettlers ? (
                    <span className="text-[10px] text-rose-600 font-medium flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      {fieldErrors.pctInformalSettlers}
                    </span>
                  ) : (
                    <span className="text-[9.5px] text-slate-400 mt-1 block">Renters / no formal ownership (0–100%)</span>
                  )}
                </div>
              </div>
            </div>

            {/* ── STEP 2: HOUSING & UTILITIES ── */}
            <div className="p-4 rounded-2xl neu-inset-sm space-y-3 mb-4 bg-white/40 border border-white/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-700 text-white text-[10px] font-bold flex items-center justify-center">
                    2
                  </span>
                  <span className="text-xs font-bold text-slate-800 tracking-tight">
                    Home & Basic Services
                  </span>
                </div>
                <span className="text-[10px] font-medium text-slate-400">Enter 0–100%</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 items-start">
                {/* Electricity */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-semibold text-slate-600 truncate">
                    Has Electricity (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    placeholder="78.0"
                    value={form.pctWithAccessToElectricity}
                    onChange={(e) => handleChange("pctWithAccessToElectricity", e.target.value)}
                    className={`w-full px-2.5 py-1.5 text-xs font-mono tabular-nums font-semibold text-slate-800 neu-input rounded-xl bg-white ${
                      fieldErrors.pctWithAccessToElectricity ? "border-rose-400 bg-rose-50/30 text-rose-900" : ""
                    }`}
                  />
                  {fieldErrors.pctWithAccessToElectricity ? (
                    <span className="text-[9px] text-rose-600 font-medium block leading-tight">
                      {fieldErrors.pctWithAccessToElectricity}
                    </span>
                  ) : (
                    <span className="text-[9px] text-slate-400 block truncate">With power connection</span>
                  )}
                </div>

                {/* Safe Water */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-semibold text-slate-600 truncate">
                    Safe Drinking Water (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    placeholder="70.0"
                    value={form.pctWithSafeWaterAccess}
                    onChange={(e) => handleChange("pctWithSafeWaterAccess", e.target.value)}
                    className={`w-full px-2.5 py-1.5 text-xs font-mono tabular-nums font-semibold text-slate-800 neu-input rounded-xl bg-white ${
                      fieldErrors.pctWithSafeWaterAccess ? "border-rose-400 bg-rose-50/30 text-rose-900" : ""
                    }`}
                  />
                  {fieldErrors.pctWithSafeWaterAccess ? (
                    <span className="text-[9px] text-rose-600 font-medium block leading-tight">
                      {fieldErrors.pctWithSafeWaterAccess}
                    </span>
                  ) : (
                    <span className="text-[9px] text-slate-400 block truncate">Clean water access</span>
                  )}
                </div>

                {/* Sanitary Toilet */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-semibold text-slate-600 truncate">
                    Has Proper Toilet (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    placeholder="68.0"
                    value={form.pctWithSanitaryToilet}
                    onChange={(e) => handleChange("pctWithSanitaryToilet", e.target.value)}
                    className={`w-full px-2.5 py-1.5 text-xs font-mono tabular-nums font-semibold text-slate-800 neu-input rounded-xl bg-white ${
                      fieldErrors.pctWithSanitaryToilet ? "border-rose-400 bg-rose-50/30 text-rose-900" : ""
                    }`}
                  />
                  {fieldErrors.pctWithSanitaryToilet ? (
                    <span className="text-[9px] text-rose-600 font-medium block leading-tight">
                      {fieldErrors.pctWithSanitaryToilet}
                    </span>
                  ) : (
                    <span className="text-[9px] text-slate-400 block truncate">Sanitary toilet facility</span>
                  )}
                </div>

                {/* Permanent Housing */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-semibold text-slate-600 truncate">
                    Concrete/Solid House (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    placeholder="55.0"
                    value={form.pctPermanentHouseMaterial}
                    onChange={(e) => handleChange("pctPermanentHouseMaterial", e.target.value)}
                    className={`w-full px-2.5 py-1.5 text-xs font-mono tabular-nums font-semibold text-slate-800 neu-input rounded-xl bg-white ${
                      fieldErrors.pctPermanentHouseMaterial ? "border-rose-400 bg-rose-50/30 text-rose-900" : ""
                    }`}
                  />
                  {fieldErrors.pctPermanentHouseMaterial ? (
                    <span className="text-[9px] text-rose-600 font-medium block leading-tight">
                      {fieldErrors.pctPermanentHouseMaterial}
                    </span>
                  ) : (
                    <span className="text-[9px] text-slate-400 block truncate">Permanent materials</span>
                  )}
                </div>
              </div>
            </div>

            {/* ── STEP 3: EDUCATION & FAMILY ── */}
            <div className="p-4 rounded-2xl neu-inset-sm space-y-3 bg-white/40 border border-white/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-700 text-white text-[10px] font-bold flex items-center justify-center">
                    3
                  </span>
                  <span className="text-xs font-bold text-slate-800 tracking-tight">
                    Education & Family
                  </span>
                </div>
                <span className="text-[10px] font-medium text-slate-400">Community profile</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-start">
                {/* School Enrollment */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700 truncate">
                    Children in School (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    placeholder="81.0"
                    value={form.netEnrollmentRate}
                    onChange={(e) => handleChange("netEnrollmentRate", e.target.value)}
                    className={`w-full px-3 py-2 text-xs font-mono tabular-nums font-semibold text-slate-800 neu-input rounded-xl bg-white ${
                      fieldErrors.netEnrollmentRate ? "border-rose-400 bg-rose-50/30 text-rose-900" : ""
                    }`}
                  />
                  {fieldErrors.netEnrollmentRate ? (
                    <span className="text-[10px] text-rose-600 font-medium flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      {fieldErrors.netEnrollmentRate}
                    </span>
                  ) : (
                    <span className="text-[9.5px] text-slate-400 block truncate">Ages 6–17 currently enrolled (0–100%)</span>
                  )}
                </div>

                {/* Completed High School */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700 truncate">
                    Finished High School (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    placeholder="54.0"
                    value={form.pctCompletedSecondaryEducation}
                    onChange={(e) => handleChange("pctCompletedSecondaryEducation", e.target.value)}
                    className={`w-full px-3 py-2 text-xs font-mono tabular-nums font-semibold text-slate-800 neu-input rounded-xl bg-white ${
                      fieldErrors.pctCompletedSecondaryEducation ? "border-rose-400 bg-rose-50/30 text-rose-900" : ""
                    }`}
                  />
                  {fieldErrors.pctCompletedSecondaryEducation ? (
                    <span className="text-[10px] text-rose-600 font-medium flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      {fieldErrors.pctCompletedSecondaryEducation}
                    </span>
                  ) : (
                    <span className="text-[9.5px] text-slate-400 block truncate">Adults who completed Grade 12 (0–100%)</span>
                  )}
                </div>

                {/* Family Size */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700 truncate">
                    Avg. Family Size
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    step={0.1}
                    placeholder="5.1"
                    value={form.avgFamilySize}
                    onChange={(e) => handleChange("avgFamilySize", e.target.value)}
                    className={`w-full px-3 py-2 text-xs font-mono tabular-nums font-semibold text-slate-800 neu-input rounded-xl bg-white ${
                      fieldErrors.avgFamilySize ? "border-rose-400 bg-rose-50/30 text-rose-900" : ""
                    }`}
                  />
                  {fieldErrors.avgFamilySize ? (
                    <span className="text-[10px] text-rose-600 font-medium flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      {fieldErrors.avgFamilySize}
                    </span>
                  ) : (
                    <span className="text-[9.5px] text-slate-400 block truncate">Average persons per household</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Button & Status */}
          <div className="pt-3">
            <button
              onClick={handleSubmit}
              disabled={!isFormValid || loading}
              className={`w-full py-3.5 rounded-2xl text-white font-semibold text-[13px] flex items-center justify-center gap-2 transition-all ${
                !isFormValid || loading
                  ? "opacity-60 neu-btn text-slate-400 cursor-not-allowed"
                  : "neu-btn-primary cursor-pointer active:scale-98 shadow-md"
              }`}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>
                    {serverStatus === "waking" || requestSeconds >= 2
                      ? `Starting up… (${requestSeconds || serverSeconds}s)`
                      : "Analyzing Community Data…"}
                  </span>
                </>
              ) : (
                <span>Analyze This Community</span>
              )}
            </button>

            {hasValidationErrors && (
              <p className="text-center text-[11px] text-rose-600 bg-rose-500/10 border border-rose-300/60 rounded-xl py-1.5 px-3 mt-2 font-medium flex items-center justify-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Please fix the errors above. Percentages must be 0–100, income and family size must be greater than zero.</span>
              </p>
            )}

            {!isFormFilled && !hasValidationErrors && !loading && (
              <p className="text-center text-[10px] text-slate-400 flex items-center justify-center gap-1 mt-2 font-mono">
                <AlertCircle className="w-3 h-3" /> Fill in all 10 fields to run the analysis.
              </p>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-300 text-red-700 rounded-2xl p-3 text-[11px] font-medium mt-2">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Classification Results */}
        <div className="relative">
          {/* Scroll hint — bouncing arrow shown when results overflow */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none"
              >
                <motion.div
                  animate={{ y: [0, 6, 0] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                  className="flex flex-col items-center gap-1"
                >
                  <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">
                    More below
                  </span>
                  <ChevronDown className="w-4 h-4 text-indigo-400" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="h-[620px] overflow-y-auto pr-1 space-y-4 rounded-3xl scrollbar-thin scrollbar-thumb-slate-300">
            {loading && (
              <div className="h-full neu-surface rounded-3xl flex flex-col items-center justify-center text-center p-8 border border-white/80">
                <motion.div
                  animate={{ scale: [1, 1.05, 1], rotate: [0, 180, 360] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="w-16 h-16 mb-4 flex items-center justify-center p-3 neu-inset-sm rounded-2xl text-indigo-600"
                >
                  <RotateCcw className="w-8 h-8 animate-spin text-indigo-600" />
                </motion.div>
                <h3 className="text-sm font-bold text-slate-800">
                  {serverStatus === "waking" || requestSeconds >= 2
                    ? "Server is Starting Up"
                    : "Analyzing Community Data"}
                </h3>
                <p className="text-xs font-mono text-indigo-600 font-semibold mt-1">
                  {requestSeconds > 0 ? `${requestSeconds}s elapsed` : "Running analysis…"}
                </p>
                <p className="text-[11px] text-slate-500 mt-2 max-w-[280px] leading-relaxed">
                  The system is evaluating 10 community indicators using our machine learning model to determine the income tier.
                </p>
                <div className="w-48 h-1.5 rounded-full neu-inset overflow-hidden mt-4">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-amber-500 rounded-full animate-pulse w-3/4" />
                </div>
              </div>
            )}

            {!result && !loading && (
              <div className="h-full neu-surface rounded-3xl flex flex-col items-center justify-center text-center p-10 shadow-sm">
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="w-16 h-16 mb-3 flex items-center justify-center p-2 neu-inset-sm rounded-2xl"
                >
                  <img
                    src={kalingaLogo}
                    alt="KalingaBot AI"
                    className="w-full h-full object-contain"
                  />
                </motion.div>
                <p className="text-sm font-semibold text-slate-700">Ready to Analyze</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[260px] leading-relaxed font-normal">
                  Fill in the community information on the left and click <strong>"Analyze This Community"</strong> to see the income tier, confidence level, and recommended programs.
                </p>
              </div>
            )}

            {result && (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-4"
              >
                {/* Result Summary Banner */}
                <motion.div variants={itemVariants}>
                  <div className="neu-surface rounded-3xl px-5 py-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-semibold">Analysis Result for</p>
                      <p className="text-sm font-bold text-slate-900">{form.barangay}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 font-medium">Income Level</p>
                      <p className={`text-base font-black tracking-tight ${
                        result.predicted_class === "High" ? "text-emerald-600" :
                        result.predicted_class === "Middle" ? "text-amber-600" : "text-rose-600"
                      }`}>
                        {result.predicted_class === "High" ? "Level 3 — Self-Sufficient" :
                         result.predicted_class === "Middle" ? "Level 2 — Subsistence" :
                         "Level 1 — Survival"}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {result.confidence ? `${Math.round(result.confidence * 100)}% confidence` : ""}
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Prediction Card */}
                <motion.div variants={itemVariants}>
                  <PredictionCard
                    predictedClass={result.predicted_class}
                    confidence={result.confidence}
                    probabilities={result.probabilities}
                    targetName={`Barangay ${form.barangay}`}
                    isIndividual={false}
                  />
                </motion.div>

                {/* Geographic GIS Map */}
                <motion.div variants={itemVariants}>
                  <GeoMap
                    barangay={form.barangay}
                    tier={result.predicted_class}
                  />
                </motion.div>

                {/* Key Decision Drivers */}
                {result.feature_impacts?.length > 0 && (
                  <motion.div variants={itemVariants}>
                    <FeatureDrivers
                      featureImpacts={result.feature_impacts}
                      subtitle="The factors below most influenced this community's income classification"
                    />
                  </motion.div>
                )}

                {/* AI Policy Suggestions */}
                {(result.interpretation || result.recommendations?.length > 0 || result.ai_note) && (
                  <motion.div variants={itemVariants}>
                    <AISuggestions
                      interpretation={result.interpretation}
                      recommendations={result.recommendations}
                      subtitle="Recommended government programs and interventions for this community"
                      isFallback={result.is_fallback}
                      aiProvider={result.ai_provider}
                      aiNote={result.ai_note}
                    />
                  </motion.div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
