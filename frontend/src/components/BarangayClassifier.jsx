import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sliders, RotateCcw, AlertCircle, Eye, EyeOff, Info,
  DollarSign, Users, Home, Sparkles, TrendingUp, CheckCircle2, GraduationCap, Baby
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

export default function BarangayClassifier() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hoveredField, setHoveredField] = useState(null);
  const [selectedPreset, setPreset] = useState("");
  const [showPresets, setShowPresets] = useState(false);
  const [requestSeconds, setRequestSeconds] = useState(0);

  const { status: serverStatus, secondsElapsed: serverSeconds } = useServerHealth();

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

  const isFormValid = REQUIRED_KEYS.every(
    (k) => form[k] !== "" && !isNaN(Number(form[k]))
  );

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
        const topDriver =
          data.top_features && data.top_features.length > 0
            ? data.top_features[0].feature
            : null;
        saveClassificationRecord({
          type: "barangay",
          target: form.barangay,
          predicted_class: data.predicted_class,
          confidence: data.confidence ? Math.round(data.confidence * 100) : null,
          top_feature: topDriver,
          inputs: {
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
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        {/* LEFT PANEL: Multi-Density Form */}
        <div className="neu-surface rounded-3xl p-6 space-y-4 flex flex-col justify-between">
          <div>
            {/* Header / Subtitle & Test Controls */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-600" />
                <span className="text-[13px] font-semibold tracking-[-0.01em] text-slate-800">
                  Community Socio-Economic Profile
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
                  <span>Testing Samples: {showPresets ? "ON" : "OFF"}</span>
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
                    Testing Mode: Select Sample Community Profile
                  </label>
                  <span className="text-[9px] text-indigo-600 font-medium font-mono">Auto-fills 10 indicators</span>
                </div>
                <select
                  value={selectedPreset}
                  onChange={(e) => handlePresetSelect(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-medium text-slate-700 neu-input rounded-xl focus:outline-none cursor-pointer"
                >
                  <option value="">Choose a test profile to load...</option>
                  {SAMPLE_PRESETS.map((p, idx) => (
                    <option key={idx} value={idx}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Target Community Selector */}
            <div className="mb-4">
              <label className="block text-[11px] font-medium text-slate-500 mb-1 flex items-center justify-between">
                <span>TARGET COMMUNITY (REFERENCE BARANGAY)</span>
                <span className="text-[9.5px] text-slate-400 font-normal">Identifies local jurisdiction</span>
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

            {/* ── CLUSTER 1: ECONOMIC INDICATORS ── */}
            <div className="space-y-2.5 mb-4">
              <div className="border-l-2 border-indigo-500 pl-2.5">
                <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 block font-semibold">
                  ECONOMIC INDICATORS
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 items-end">
                {/* Hero Field: Avg Monthly Income */}
                <div
                  className="md:col-span-2 relative"
                  onMouseEnter={() => setHoveredField("avgMonthlyIncomePhp")}
                  onMouseLeave={() => setHoveredField(null)}
                >
                  <label className="block text-[11px] font-medium text-slate-600 mb-1 flex items-center justify-between">
                    <span>Avg. Monthly Income</span>
                    <span className="text-[9.5px] font-mono text-indigo-600 font-semibold">PRIMARY DRIVER</span>
                  </label>
                  <div className="relative flex items-center rounded-xl neu-inset border-l-4 border-l-indigo-600 overflow-hidden">
                    <span className="pl-3.5 text-indigo-600 font-bold text-sm">₱</span>
                    <input
                      type="number"
                      min={2000}
                      max={100000}
                      step={500}
                      placeholder="25,000"
                      value={form.avgMonthlyIncomePhp}
                      onChange={(e) => handleChange("avgMonthlyIncomePhp", e.target.value)}
                      className="w-full px-2.5 py-2.5 text-sm font-semibold font-mono tabular-nums text-slate-900 bg-transparent focus:outline-none placeholder:text-slate-400"
                    />
                  </div>
                  {hoveredField === "avgMonthlyIncomePhp" && (
                    <div className="absolute left-0 -top-8 z-30 bg-slate-900 text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-xl pointer-events-none">
                      Average monthly household income benchmarked against PSA FIES.
                    </div>
                  )}
                </div>

                {/* Employed Household Heads */}
                <div
                  className="relative"
                  onMouseEnter={() => setHoveredField("pctEmployedHead")}
                  onMouseLeave={() => setHoveredField(null)}
                >
                  <label className="block text-[11px] font-medium text-slate-600 mb-1 truncate">
                    Employed Heads (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    placeholder="e.g. 60.0"
                    value={form.pctEmployedHead}
                    onChange={(e) => handleChange("pctEmployedHead", e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono tabular-nums font-medium text-slate-800 neu-input rounded-xl placeholder:text-slate-400"
                  />
                  {hoveredField === "pctEmployedHead" && (
                    <div className="absolute right-0 -top-8 z-30 bg-slate-900 text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-xl pointer-events-none">
                      Share of household heads gainfully employed.
                    </div>
                  )}
                </div>
              </div>

              {/* Informal Settlers */}
              <div
                className="relative"
                onMouseEnter={() => setHoveredField("pctInformalSettlers")}
                onMouseLeave={() => setHoveredField(null)}
              >
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-medium text-slate-600 truncate">
                    Informal Settlers Rate (%)
                  </label>
                  <span className="text-[9px] text-slate-400 font-normal">Tenure insecurity</span>
                </div>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  placeholder="e.g. 28.5"
                  value={form.pctInformalSettlers}
                  onChange={(e) => handleChange("pctInformalSettlers", e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono tabular-nums font-medium text-slate-800 neu-input rounded-xl placeholder:text-slate-400"
                />
                {hoveredField === "pctInformalSettlers" && (
                  <div className="absolute left-0 -top-8 z-30 bg-slate-900 text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-xl pointer-events-none">
                    Households in informal or insecure tenure (PSA CPH Housing).
                  </div>
                )}
              </div>
            </div>

            {/* ── CLUSTER 2: LIVING CONDITIONS (4-col compact grid) ── */}
            <div className="space-y-2.5 mb-4">
              <div className="border-l-2 border-slate-300 pl-2.5">
                <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 block font-semibold">
                  LIVING CONDITIONS & UTILITIES (0-100%)
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* Electricity */}
                <div
                  className="relative"
                  onMouseEnter={() => setHoveredField("pctWithAccessToElectricity")}
                  onMouseLeave={() => setHoveredField(null)}
                >
                  <label className="block text-[10px] font-medium text-slate-600 truncate mb-1">
                    Electricity (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    placeholder="78.0"
                    value={form.pctWithAccessToElectricity}
                    onChange={(e) => handleChange("pctWithAccessToElectricity", e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums font-medium text-slate-800 neu-input rounded-lg"
                  />
                  {hoveredField === "pctWithAccessToElectricity" && (
                    <div className="absolute left-0 -top-8 z-30 bg-slate-900 text-white text-[10px] px-2 py-1 rounded-md shadow-xl whitespace-nowrap pointer-events-none">
                      Grid electricity access
                    </div>
                  )}
                </div>

                {/* Safe Water */}
                <div
                  className="relative"
                  onMouseEnter={() => setHoveredField("pctWithSafeWaterAccess")}
                  onMouseLeave={() => setHoveredField(null)}
                >
                  <label className="block text-[10px] font-medium text-slate-600 truncate mb-1">
                    Safe Water (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    placeholder="70.0"
                    value={form.pctWithSafeWaterAccess}
                    onChange={(e) => handleChange("pctWithSafeWaterAccess", e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums font-medium text-slate-800 neu-input rounded-lg"
                  />
                  {hoveredField === "pctWithSafeWaterAccess" && (
                    <div className="absolute left-0 -top-8 z-30 bg-slate-900 text-white text-[10px] px-2 py-1 rounded-md shadow-xl whitespace-nowrap pointer-events-none">
                      Potable drinking water
                    </div>
                  )}
                </div>

                {/* Sanitary Toilet */}
                <div
                  className="relative"
                  onMouseEnter={() => setHoveredField("pctWithSanitaryToilet")}
                  onMouseLeave={() => setHoveredField(null)}
                >
                  <label className="block text-[10px] font-medium text-slate-600 truncate mb-1">
                    Sanitary Toilet (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    placeholder="68.0"
                    value={form.pctWithSanitaryToilet}
                    onChange={(e) => handleChange("pctWithSanitaryToilet", e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums font-medium text-slate-800 neu-input rounded-lg"
                  />
                  {hoveredField === "pctWithSanitaryToilet" && (
                    <div className="absolute left-0 -top-8 z-30 bg-slate-900 text-white text-[10px] px-2 py-1 rounded-md shadow-xl whitespace-nowrap pointer-events-none">
                      Water-sealed toilet facility
                    </div>
                  )}
                </div>

                {/* Permanent Housing */}
                <div
                  className="relative"
                  onMouseEnter={() => setHoveredField("pctPermanentHouseMaterial")}
                  onMouseLeave={() => setHoveredField(null)}
                >
                  <label className="block text-[10px] font-medium text-slate-600 truncate mb-1">
                    Perm. House (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    placeholder="55.0"
                    value={form.pctPermanentHouseMaterial}
                    onChange={(e) => handleChange("pctPermanentHouseMaterial", e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums font-medium text-slate-800 neu-input rounded-lg"
                  />
                  {hoveredField === "pctPermanentHouseMaterial" && (
                    <div className="absolute right-0 -top-8 z-30 bg-slate-900 text-white text-[10px] px-2 py-1 rounded-md shadow-xl whitespace-nowrap pointer-events-none">
                      Sturdy roof & concrete walls
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── CLUSTER 3: HUMAN CAPITAL ── */}
            <div className="space-y-2.5">
              <div className="border-l-2 border-slate-300 pl-2.5">
                <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 block font-semibold">
                  HUMAN CAPITAL & DEMOGRAPHICS
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* School Enrollment */}
                <div
                  className="relative"
                  onMouseEnter={() => setHoveredField("netEnrollmentRate")}
                  onMouseLeave={() => setHoveredField(null)}
                >
                  <label className="block text-[11px] font-medium text-slate-600 mb-1 truncate">
                    School Enrollment (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    placeholder="81.0"
                    value={form.netEnrollmentRate}
                    onChange={(e) => handleChange("netEnrollmentRate", e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono tabular-nums font-medium text-slate-800 neu-input rounded-xl"
                  />
                  {hoveredField === "netEnrollmentRate" && (
                    <div className="absolute left-0 -top-8 z-30 bg-slate-900 text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-xl pointer-events-none">
                      Net enrollment of children aged 6 to 17.
                    </div>
                  )}
                </div>

                {/* Completed High School */}
                <div
                  className="relative"
                  onMouseEnter={() => setHoveredField("pctCompletedSecondaryEducation")}
                  onMouseLeave={() => setHoveredField(null)}
                >
                  <label className="block text-[11px] font-medium text-slate-600 mb-1 truncate">
                    Completed High School (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    placeholder="54.0"
                    value={form.pctCompletedSecondaryEducation}
                    onChange={(e) => handleChange("pctCompletedSecondaryEducation", e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono tabular-nums font-medium text-slate-800 neu-input rounded-xl"
                  />
                  {hoveredField === "pctCompletedSecondaryEducation" && (
                    <div className="absolute right-0 -top-8 z-30 bg-slate-900 text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-xl pointer-events-none">
                      Share of heads completing secondary education.
                    </div>
                  )}
                </div>
              </div>

              {/* Family Size - full width */}
              <div
                className="relative"
                onMouseEnter={() => setHoveredField("avgFamilySize")}
                onMouseLeave={() => setHoveredField(null)}
              >
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-medium text-slate-600 truncate">
                    Average Family Size (Household Members)
                  </label>
                  <span className="text-[9px] text-slate-400 font-normal">Subsistence divisor</span>
                </div>
                <input
                  type="number"
                  min={1}
                  max={12}
                  step={0.1}
                  placeholder="e.g. 5.1"
                  value={form.avgFamilySize}
                  onChange={(e) => handleChange("avgFamilySize", e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-mono tabular-nums font-medium text-slate-800 neu-input rounded-xl"
                />
                {hoveredField === "avgFamilySize" && (
                  <div className="absolute left-0 -top-8 z-30 bg-slate-900 text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-xl pointer-events-none">
                    Average household size dividing income and subsistence resources.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Button & Status */}
          <div className="pt-3">
            <button
              onClick={handleSubmit}
              disabled={!isFormValid || loading}
              className="w-full py-3.5 rounded-2xl text-white font-semibold text-[13px] flex items-center justify-center gap-2 neu-btn-primary"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>
                    {serverStatus === "waking" || requestSeconds >= 2
                      ? `Waking Server (${requestSeconds || serverSeconds}s)…`
                      : "Running Stacking Model…"}
                  </span>
                </>
              ) : (
                <span>Classify Barangay Income Tier</span>
              )}
            </button>

            {loading && (serverStatus === "waking" || requestSeconds >= 2) && (
              <p className="text-center text-[10.5px] text-amber-700 bg-amber-500/10 border border-amber-300/60 rounded-xl py-1.5 px-3 mt-2 font-medium">
                ⏳ First request wakes the Render cloud container (~30s). Please keep this page open.
              </p>
            )}

            {!isFormValid && !loading && (
              <p className="text-center text-[10px] text-slate-400 flex items-center justify-center gap-1 mt-2 font-mono">
                <AlertCircle className="w-3 h-3" /> Complete all 10 indicators to run the machine learning classification.
              </p>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-300 text-red-700 rounded-2xl p-3 text-[11px] font-medium mt-2">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Classification Results & Staggered Reveal */}
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
                  ? "Waking Cloud Backend Instance"
                  : "Computing ML Ensemble Prediction"}
              </h3>
              <p className="text-xs font-mono text-indigo-600 font-semibold mt-1">
                {requestSeconds > 0 ? `${requestSeconds}s elapsed` : "Initializing inference…"}
              </p>
              <p className="text-[11px] text-slate-500 mt-2 max-w-[280px] leading-relaxed">
                {serverStatus === "waking" || requestSeconds >= 2
                  ? "Render free-tier instances hibernate after 15 min of inactivity. Loading runtime & 62MB Scikit-Learn stacking model into memory (~30s)."
                  : "Evaluating 10 community socio-economic indicators across Random Forest and Gradient Boosting base estimators."}
              </p>
              <div className="w-48 h-1.5 rounded-full neu-inset overflow-hidden mt-4">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-amber-500 rounded-full animate-pulse w-3/4" />
              </div>
            </div>
          )}

          {!result && !loading && (
            <div className="h-full neu-surface rounded-3xl flex flex-col items-center justify-center text-center p-10">
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
              <p className="text-sm font-semibold text-slate-700">Ready to Classify</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-[260px] leading-relaxed font-normal">
                Provide the community indicators on the left and run classification to view the ML predictions, confidence levels, and decision drivers.
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
                    subtitle="Model feature importances contextualized by District V baseline deviations"
                  />
                </motion.div>
              )}

              {/* AI Policy Suggestions */}
              {(result.interpretation || result.recommendations?.length > 0) && (
                <motion.div variants={itemVariants}>
                  <AISuggestions
                    interpretation={result.interpretation}
                    recommendations={result.recommendations}
                    subtitle="Gemini-powered recommendations based on this barangay's PSA indicators"
                  />
                </motion.div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
