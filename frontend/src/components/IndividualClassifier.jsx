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

  const handleChange = (id, val) => setForm((f) => ({ ...f, [id]: val }));

  const isFormValid = REQUIRED_KEYS.every(
    (k) => form[k] !== "" && !isNaN(Number(form[k]))
  );

  const handleSubmit = async () => {
    if (!isFormValid) return;
    setLoading(true);
    setError(null);
    setResult(null);

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
        <div className="surface-card rounded-2xl p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-blue-400" />
                <span className="text-[13px] font-semibold tracking-[-0.01em] text-[#e6edf3]">
                  Household Socio-Economic Profile
                </span>
              </div>
              <button
                onClick={handleReset}
                className="flex items-center gap-1 text-[10px] font-medium text-[#8b949e] hover:text-rose-400 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>

            <div className="space-y-4">
              {/* Barangay Location Dropdown */}
              <div>
                <label className="text-[11px] font-medium text-[#8b949e] mb-1.5 flex items-center justify-between">
                  <span>RESIDENTIAL BARANGAY LOCATION</span>
                  <span className="text-[9.5px] text-[#484f58] font-normal">District V Catchment</span>
                </label>
                <select
                  value={form.barangay}
                  onChange={(e) => handleChange("barangay", e.target.value)}
                  className="w-full form-input rounded-xl px-3.5 py-2.5 text-xs font-semibold cursor-pointer"
                >
                  {DISTRICT_V_BARANGAYS.map((b) => (
                    <option key={b} value={b} className="bg-[#0d1520] text-[#e6edf3]">{b}</option>
                  ))}
                </select>
              </div>

              {/* Hero Field: Monthly Per-Capita Income */}
              <div
                className="relative"
                onMouseEnter={() => setHoveredField("total_monthly_income")}
                onMouseLeave={() => setHoveredField(null)}
              >
                <label className="text-[11px] font-medium text-[#8b949e] mb-1.5 flex items-center justify-between">
                  <span>Monthly Per-Capita Income</span>
                  <span className="text-[9.5px] font-mono text-blue-400 font-semibold">CORE BASELINE</span>
                </label>
                <div className="relative flex items-center rounded-xl surface-inset border-l-4 border-l-blue-500 overflow-hidden">
                  <span className="pl-3.5 text-blue-400 font-bold text-sm">₱</span>
                  <input
                    type="number"
                    min={0}
                    max={500000}
                    step={500}
                    placeholder="15,000"
                    value={form.total_monthly_income}
                    onChange={(e) => handleChange("total_monthly_income", e.target.value)}
                    className="w-full px-2.5 py-2.5 text-sm font-semibold font-mono tabular-nums text-[#e6edf3] bg-transparent focus:outline-none placeholder:text-[#484f58]"
                  />
                </div>
                {hoveredField === "total_monthly_income" && (
                  <div className="absolute left-0 -top-8 z-30 bg-[#0d1520] border border-white/10 text-[#e6edf3] text-[10px] px-2.5 py-1.5 rounded-lg shadow-xl pointer-events-none">
                    Total combined income of all household earners per month.
                  </div>
                )}
              </div>

              {/* Family Demographics Cluster */}
              <div className="space-y-2">
                <div className="border-l-2 border-white/15 pl-2">
                  <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#8b949e] block font-semibold">
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
                    <label className="block text-[10px] font-medium text-[#8b949e] truncate mb-1">
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
                      className="w-full form-input rounded-xl px-2.5 py-2 text-xs font-mono tabular-nums font-medium"
                    />
                    {hoveredField === "family_size" && (
                      <div className="absolute left-0 -top-8 z-30 bg-[#0d1520] border border-white/10 text-[#e6edf3] text-[10px] px-2 py-1 rounded-md shadow-xl whitespace-nowrap pointer-events-none">
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
                    <label className="block text-[10px] font-medium text-[#8b949e] truncate mb-1">
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
                      className="w-full form-input rounded-xl px-2.5 py-2 text-xs font-mono tabular-nums font-medium"
                    />
                    {hoveredField === "dependents_0_18" && (
                      <div className="absolute left-0 -top-8 z-30 bg-[#0d1520] border border-white/10 text-[#e6edf3] text-[10px] px-2 py-1 rounded-md shadow-xl whitespace-nowrap pointer-events-none">
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
                    <label className="block text-[10px] font-medium text-[#8b949e] truncate mb-1">
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
                      className="w-full form-input rounded-xl px-2.5 py-2 text-xs font-mono tabular-nums font-medium"
                    />
                    {hoveredField === "children_in_school" && (
                      <div className="absolute right-0 -top-8 z-30 bg-[#0d1520] border border-white/10 text-[#e6edf3] text-[10px] px-2 py-1 rounded-md shadow-xl whitespace-nowrap pointer-events-none">
                        Currently enrolled youth
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 4Ps Household Status Pill Selector */}
              <div>
                <label className="text-[11px] font-medium text-[#8b949e] mb-1.5 flex items-center justify-between">
                  <span>Pantawid Pamilyang Pilipino Program (4Ps) Status</span>
                  <span className="text-[9.5px] text-[#484f58] font-normal">DSWD Beneficiary Registry</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 surface-inset p-1.5 rounded-xl border border-white/5">
                  {FOUR_PS_STATUS_OPTIONS.map((status) => {
                    const isSelected = form.household_status === status;
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => handleChange("household_status", status)}
                        className={`text-[11px] py-1.5 px-2 rounded-lg transition-all cursor-pointer text-center ${
                          isSelected
                            ? "bg-blue-600/20 border border-blue-500/30 text-blue-400 font-bold shadow-xs"
                            : "text-[#8b949e] hover:text-[#e6edf3] font-medium"
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
              className="btn-primary w-full py-3.5 rounded-xl font-semibold text-[13px] flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Computing SWDI Tier…</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Classify Household Income Tier</span>
                </>
              )}
            </button>

            {!isFormValid && !loading && (
              <p className="text-center text-[10px] text-[#8b949e] flex items-center justify-center gap-1 mt-2 font-mono">
                <AlertCircle className="w-3 h-3" /> Complete all fields to evaluate the household income profile.
              </p>
            )}

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl p-3 text-[11px] font-medium mt-2">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Results Panel */}
        <div className="h-[580px] overflow-y-auto pr-1 space-y-4 rounded-2xl scrollbar-thin">
          {!result && !loading && (
            <div className="h-full surface-card rounded-2xl flex flex-col items-center justify-center text-center p-10 border border-white/5">
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="w-16 h-16 mb-3 flex items-center justify-center p-2 surface-inset rounded-2xl border border-white/5"
              >
                <img
                  src={kalingaLogo}
                  alt="KalingaBot AI"
                  className="w-full h-full object-contain"
                />
              </motion.div>
              <p className="text-sm font-semibold text-[#e6edf3]">Ready to Classify</p>
              <p className="text-[11px] text-[#8b949e] mt-1 max-w-[250px] leading-relaxed font-normal">
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
