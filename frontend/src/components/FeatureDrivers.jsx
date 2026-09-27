import React from "react";
import {
  DollarSign, Home, Sparkles, TrendingUp, CheckCircle2,
  GraduationCap, Users, Baby, Wallet, Scale, AlertCircle, BarChart3, User
} from "lucide-react";

const FEATURE_ICON_MAP = {
  // Barangay level
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

  // Individual level
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

export default function FeatureDrivers({ featureImpacts = [], subtitle = "Model feature importances contextualized by baseline deviations" }) {
  if (!featureImpacts || featureImpacts.length === 0) return null;

  return (
    <div className="neu-surface rounded-3xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold tracking-[-0.01em] text-slate-800">
            Key Decision Drivers
          </p>
          <p className="text-[10px] text-slate-400 font-medium">
            {subtitle}
          </p>
        </div>
        <span className="text-[9px] font-mono font-medium px-2 py-0.5 rounded-full neu-surface-sm text-indigo-700 uppercase tracking-wider">
          Ensemble SHAP / Imp
        </span>
      </div>

      <div className="space-y-2.5 pt-1">
        {featureImpacts.map((d, i) => {
          const IconComp = FEATURE_ICON_MAP[d.feature] || BarChart3;
          const isTop = i === 0;

          return (
            <div
              key={d.feature}
              className={`p-3 rounded-2xl transition-all ${
                isTop
                  ? "neu-surface-sm border border-indigo-200/80 bg-indigo-50/20"
                  : "neu-surface-sm hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0 ${
                      isTop
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "neu-inset-sm text-slate-600"
                    }`}
                  >
                    #{i + 1}
                  </span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <IconComp
                      className={`w-3.5 h-3.5 flex-shrink-0 ${
                        isTop ? "text-indigo-600" : "text-slate-400"
                      }`}
                    />
                    <span
                      className={`text-[11px] font-semibold truncate ${
                        isTop ? "text-indigo-950" : "text-slate-700"
                      }`}
                    >
                      {d.feature}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {d.user_value && (
                    <span className="text-[10px] font-mono font-medium text-slate-600 neu-inset-sm px-2 py-0.5 rounded-md">
                      {d.user_value}
                    </span>
                  )}
                  <span
                    className={`text-xs font-bold font-mono tabular-nums min-w-[42px] text-right ${
                      isTop ? "text-indigo-600" : "text-slate-700"
                    }`}
                  >
                    {Number(d.impact).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Neumorphic Inset Progress Well */}
              <div className="w-full neu-inset-sm rounded-full h-2 p-0.5 overflow-hidden">
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
                <p className="text-[9.5px] text-slate-500 mt-1 pl-7 leading-tight font-medium">
                  {d.desc}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
