import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Sliders, RotateCcw, AlertCircle, Sparkles, User, Users, Scale, GraduationCap, TrendingUp, Info
} from "lucide-react";
import kalingaLogo from "../assets/KalingaBot AI.png";
import PredictionCard from "./PredictionCard";
import FeatureDrivers from "./FeatureDrivers";
import AISuggestions from "./AISuggestions";
import { saveClassificationRecord } from "../utils/historyStore";
import { classifyIndividual } from "../services/api";
import { useServerHealth } from "../context/ServerHealthContext";

const DISTRICT_V_BARANGAYS = [
  "Bagbag", "Capri", "Fairview", "Greater Lagro", "Gulod", "Kaligayahan",
  "Nagkaisang Nayon", "North Fairview", "Novaliches Proper",
  "Pasong Putik Proper", "San Agustin", "San Bartolome",
  "Santa Lucia", "Santa Monica"
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

const REQUIRED_KEYS = ["total_monthly_income", "family_size", "dependents_0_18", "children_in_school"];

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

export default function IndividualClassifier() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hoveredField, setHoveredField] = useState(null);
  const [requestSeconds, setRequestSeconds] = useState(0);

  const { status: serverStatus, secondsElapsed: serverSeconds } = useServerHealth();

  const handleChange = (id, val) => setForm((f) => ({ ...f, [id]: val }));

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
      const familySize = Math.max(Number(form.family_size), 1);
      const data = await classifyIndividual({
        barangay: form.barangay,
        total_monthly_income: Number(form.total_monthly_income),
        family_size: familySize,
        dependents_0_18: Number(form.dependents_0_18),
        children_in_school: Number(form.children_in_school),
        household_status: form.household_status,
      });
      setResult(data);

      try {
        const topDriver =
          data.top_features && data.top_features.length > 0
            ? data.top_features[0].feature
            : null;
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
      clearInterval(reqTimer);
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm(DEFAULT_FORM);
    setResult(null);
    setError(null);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        {/* LEFT PANEL: Household Profile Form */}
        <div className="neu-surface rounded-3xl p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-600" />
                <span className="text-[13px] font-semibold tracking-[-0.01em] text-slate-800">
                  Household Socio-Economic Profile
                </span>
              </div>
              <button
                onClick={handleReset}
                className="flex items-center gap-1 text-[10px] font-medium text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>

            <div className="space-y-4">
              {/* Barangay Location Dropdown */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1 flex items-center justify-between">
                  <span>RESIDENTIAL BARANGAY LOCATION</span>
                  <span className="text-[9.5px] text-slate-400 font-normal">District V Catchment</span>
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

              {/* Hero Field: Monthly Per-Capita Income */}
              <div
                className="relative"
                onMouseEnter={() => setHoveredField("total_monthly_income")}
                onMouseLeave={() => setHoveredField(null)}
              >
                <label className="block text-[11px] font-medium text-slate-600 mb-1 flex items-center justify-between">
                  <span>Monthly Per-Capita Income</span>
                  <span className="text-[9.5px] font-mono text-indigo-600 font-semibold">CORE BASELINE</span>
                </label>
                <div className="relative flex items-center rounded-xl neu-inset border-l-4 border-l-indigo-600 overflow-hidden">
                  <span className="pl-3.5 text-indigo-600 font-bold text-sm">₱</span>
                  <input
                    type="number"
                    min={0}
                    max={500000}
                    step={500}
                    placeholder="15,000"
                    value={form.total_monthly_income}
                    onChange={(e) => handleChange("total_monthly_income", e.target.value)}
                    className="w-full px-2.5 py-2.5 text-sm font-semibold font-mono tabular-nums text-slate-900 bg-transparent focus:outline-none placeholder:text-slate-400"
                  />
                </div>
                {hoveredField === "total_monthly_income" && (
                  <div className="absolute left-0 -top-8 z-30 bg-slate-900 text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-xl pointer-events-none">
                    Total combined income of all household earners per month.
                  </div>
                )}
              </div>

              {/* Family Demographics Cluster */}
              <div className="space-y-2">
                <div className="border-l-2 border-slate-300 pl-2">
                  <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 block font-semibold">
                    HOUSEHOLD COMPOSITION & VULNERABILITY
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  {/* Family Size */}
                  <div
                    className="relative"
                    onMouseEnter={() => setHoveredField("family_size")}
                    onMouseLeave={() => setHoveredField(null)}
                  >
                    <label className="block text-[10px] font-medium text-slate-600 truncate mb-1">
                      Family Size
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      step={1}
                      placeholder="5"
                      value={form.family_size}
                      onChange={(e) => handleChange("family_size", e.target.value)}
                      className="w-full px-2.5 py-2 text-xs font-mono tabular-nums font-medium text-slate-800 neu-input rounded-xl"
                    />
                    {hoveredField === "family_size" && (
                      <div className="absolute left-0 -top-8 z-30 bg-slate-900 text-white text-[10px] px-2 py-1 rounded-md shadow-xl whitespace-nowrap pointer-events-none">
                        Total living members
                      </div>
                    )}
                  </div>

                  {/* Dependents < 18 */}
                  <div
                    className="relative"
                    onMouseEnter={() => setHoveredField("dependents_0_18")}
                    onMouseLeave={() => setHoveredField(null)}
                  >
                    <label className="block text-[10px] font-medium text-slate-600 truncate mb-1">
                      Minors (&lt; 18)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      step={1}
                      placeholder="3"
                      value={form.dependents_0_18}
                      onChange={(e) => handleChange("dependents_0_18", e.target.value)}
                      className="w-full px-2.5 py-2 text-xs font-mono tabular-nums font-medium text-slate-800 neu-input rounded-xl"
                    />
                    {hoveredField === "dependents_0_18" && (
                      <div className="absolute left-0 -top-8 z-30 bg-slate-900 text-white text-[10px] px-2 py-1 rounded-md shadow-xl whitespace-nowrap pointer-events-none">
                        Children aged 0-18
                      </div>
                    )}
                  </div>

                  {/* Children in School */}
                  <div
                    className="relative"
                    onMouseEnter={() => setHoveredField("children_in_school")}
                    onMouseLeave={() => setHoveredField(null)}
                  >
                    <label className="block text-[10px] font-medium text-slate-600 truncate mb-1">
                      In School
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      step={1}
                      placeholder="2"
                      value={form.children_in_school}
                      onChange={(e) => handleChange("children_in_school", e.target.value)}
                      className="w-full px-2.5 py-2 text-xs font-mono tabular-nums font-medium text-slate-800 neu-input rounded-xl"
                    />
                    {hoveredField === "children_in_school" && (
                      <div className="absolute right-0 -top-8 z-30 bg-slate-900 text-white text-[10px] px-2 py-1 rounded-md shadow-xl whitespace-nowrap pointer-events-none">
                        Currently enrolled youth
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 4Ps Household Status Pill Selector */}
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1.5 flex items-center justify-between">
                  <span>Pantawid Pamilyang Pilipino Program (4Ps) Status</span>
                  <span className="text-[9.5px] text-slate-400 font-normal">DSWD Beneficiary Registry</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 neu-inset p-1.5 rounded-xl">
                  {FOUR_PS_STATUS_OPTIONS.map((status) => {
                    const isSelected = form.household_status === status;
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => handleChange("household_status", status)}
                        className={`text-[11px] py-1.5 px-2 rounded-lg transition-all cursor-pointer text-center ${
                          isSelected
                            ? "neu-surface-sm text-slate-900 font-bold"
                            : "text-slate-500 hover:text-slate-800 font-medium"
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
                      : "Computing SWDI Tier…"}
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Classify Household Income Tier</span>
                </>
              )}
            </button>

            {loading && (serverStatus === "waking" || requestSeconds >= 2) && (
              <p className="text-center text-[10.5px] text-amber-700 bg-amber-500/10 border border-amber-300/60 rounded-xl py-1.5 px-3 mt-2 font-medium">
                ⏳ First request wakes the Render cloud container (~30s). Please keep this page open.
              </p>
            )}

            {!isFormValid && !loading && (
              <p className="text-center text-[10px] text-slate-400 flex items-center justify-center gap-1 mt-2 font-mono">
                <AlertCircle className="w-3 h-3" /> Complete all fields to evaluate the household income profile.
              </p>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-300 text-red-700 rounded-2xl p-3 text-[11px] font-medium mt-2">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Results Panel */}
        <div className="h-[580px] overflow-y-auto pr-1 space-y-4 rounded-3xl scrollbar-thin scrollbar-thumb-slate-300">
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
                  : "Evaluating Household SWDI Tier"}
              </h3>
              <p className="text-xs font-mono text-indigo-600 font-semibold mt-1">
                {requestSeconds > 0 ? `${requestSeconds}s elapsed` : "Running decision pipeline…"}
              </p>
              <p className="text-[11px] text-slate-500 mt-2 max-w-[280px] leading-relaxed">
                {serverStatus === "waking" || requestSeconds >= 2
                  ? "Render free-tier instances hibernate after 15 min. Loading Python runtime & household model into RAM (~30s)."
                  : "Computing per-capita subsistence metrics and evaluating multidimensional poverty indicators."}
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
              <p className="text-[11px] text-slate-400 mt-1 max-w-[250px] leading-relaxed font-normal">
                Provide household indicators on the left and run inference to view SWDI welfare predictions, confidence levels, and intervention opportunities.
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
                  targetName={`${form.barangay} Household`}
                  isIndividual={true}
                />
              </motion.div>

              {/* Key Decision Drivers */}
              {result.feature_impacts?.length > 0 && (
                <motion.div variants={itemVariants}>
                  <FeatureDrivers
                    featureImpacts={result.feature_impacts}
                    subtitle="Tree importance blended with District V household baseline deviations"
                  />
                </motion.div>
              )}

              {/* AI Recommendations */}
              {(result.interpretation || result.recommendations?.length > 0) && (
                <motion.div variants={itemVariants}>
                  <AISuggestions
                    interpretation={result.interpretation}
                    recommendations={result.recommendations}
                    subtitle="DSWD & LGU policy alignment based on household indicators"
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
