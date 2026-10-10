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
    <div className="surface-card rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold tracking-[-0.01em] text-[#e6edf3]">
            Key Decision Drivers
          </p>
          <p className="text-[10px] text-[#8b949e] font-medium">
            {subtitle}
          </p>
        </div>
        <span className="text-[9px] font-mono font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider">
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
              className={`p-3 rounded-xl transition-all ${
                isTop
                  ? "bg-[#111d2e] border border-blue-500/30"
                  : "bg-[#090f18] border border-white/6 hover:border-white/12"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0 ${
                      isTop
                        ? "bg-blue-600 text-white"
                        : "surface-inset text-[#8b949e] border border-white/5"
                    }`}
                  >
                    #{i + 1}
                  </span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <IconComp
                      className={`w-3.5 h-3.5 flex-shrink-0 ${
                        isTop ? "text-blue-400" : "text-[#8b949e]"
                      }`}
                    />
                    <span
                      className={`text-[11px] font-semibold truncate ${
                        isTop ? "text-[#e6edf3]" : "text-[#c9d1d9]"
                      }`}
                    >
                      {d.feature}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {d.user_value && (
                    <span className="text-[10px] font-mono font-medium text-[#8b949e] surface-inset px-2 py-0.5 rounded-md border border-white/5">
                      {d.user_value}
                    </span>
                  )}
                  <span
                    className={`text-xs font-bold font-mono tabular-nums min-w-[42px] text-right ${
                      isTop ? "text-blue-400" : "text-[#8b949e]"
                    }`}
                  >
                    {Number(d.impact).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Progress Well */}
              <div className="w-full surface-inset rounded-full h-1.5 overflow-hidden border border-white/5">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    isTop
                      ? "bg-gradient-to-r from-blue-500 to-cyan-400"
                      : "bg-gradient-to-r from-blue-600/70 to-slate-600"
                  }`}
                  style={{ width: `${Math.max(Number(d.impact), 3.5)}%` }}
                />
              </div>

              {d.desc && (
                <p className="text-[9.5px] text-[#8b949e] mt-1.5 pl-7 leading-tight font-medium">
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
