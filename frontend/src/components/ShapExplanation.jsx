import React, { useState } from "react";
import { BarChart3, Table2, ArrowRight } from "lucide-react";
import { LEVELS, SHAP_COLORS } from "../constants/levels";

const pts = (v) => `${v >= 0 ? "+" : "−"}${Math.abs(v * 100).toFixed(1)} pts`;
const pct = (v) => `${(v * 100).toFixed(1)}%`;

/**
 * SHAP explanation of one barangay classification.
 * Each bar is a Shapley value: how many percentage points that indicator moved the
 * probability of the predicted level, relative to the District V average profile.
 * Bars sum exactly to (prediction − reference), which the footer states.
 */
export default function ShapExplanation({ shap, predictedClass }) {
  const [view, setView] = useState("chart");
  const [active, setActive] = useState(null);

  if (!shap?.contributions?.length) return null;
  const level = LEVELS[predictedClass] || LEVELS[shap.explained_class];
  const levelText = level ? `${level.short} · ${level.name}` : shap.explained_class;
  const rows = shap.contributions;
  const maxAbs = Math.max(...rows.map((c) => Math.abs(c.shap)), 1e-9);
  const sum = rows.reduce((acc, c) => acc + c.shap, 0);

  return (
    <div className="neu-surface rounded-3xl p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold tracking-[-0.01em] text-slate-800">
            What affected this result
          </p>
          <p className="text-[10px] text-slate-400 font-medium">
            Compared with an average District V barangay
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl neu-inset-sm" role="tablist" aria-label="Explanation view">
          {[
            { id: "chart", Icon: BarChart3, label: "Chart" },
            { id: "table", Icon: Table2, label: "Table" },
          ].map(({ id, Icon, label }) => (
            <button
              key={id}
              role="tab"
              aria-selected={view === id}
              onClick={() => setView(id)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold cursor-pointer transition-colors ${
                view === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Reference → prediction summary */}
      <div className="p-3 rounded-2xl neu-inset-sm">
        <p className="text-[10px] font-semibold text-slate-600">Chance of {levelText}</p>
        <div className="flex items-center gap-3 mt-1">
          <div>
            <p className="text-base font-bold text-slate-700">{pct(shap.base_value)}</p>
            <p className="text-[9.5px] font-medium text-slate-500">Average barangay</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <div>
            <p className="text-base font-bold text-slate-900">{pct(shap.output_value)}</p>
            <p className="text-[9.5px] font-medium text-slate-500">This barangay</p>
          </div>
        </div>
      </div>

      {view === "chart" ? (
        <>
          {/* Legend (always present: two series) */}
          <div className="flex flex-wrap items-center gap-4 text-[10px] font-medium text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-2 rounded-sm" style={{ background: SHAP_COLORS.supports }} />
              Raises the chance
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-2 rounded-sm" style={{ background: SHAP_COLORS.against }} />
              Lowers the chance
            </span>
          </div>

          {/* Diverging bars */}
          <ul className="space-y-0.5">
            {rows.map((c) => {
              const positive = c.shap >= 0;
              const width = (Math.abs(c.shap) / maxAbs) * 100;
              const isActive = active === c.key;
              return (
                <li
                  key={c.key}
                  tabIndex={0}
                  onMouseEnter={() => setActive(c.key)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(c.key)}
                  onBlur={() => setActive(null)}
                  aria-label={`${c.feature}: ${c.value} versus district average ${c.reference}; ${pts(c.shap)} ${positive ? "toward" : "away from"} ${levelText}`}
                  className={`grid grid-cols-[minmax(0,170px)_1fr] items-center gap-3 px-2 py-1.5 rounded-xl outline-none transition-colors ${
                    isActive ? "bg-white/70" : ""
                  } focus-visible:ring-2 focus-visible:ring-indigo-400`}
                >
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-slate-700 truncate">{c.feature}</p>
                    <p className="text-[9.5px] text-slate-500 font-medium truncate tabular-nums">
                      {c.value} <span className="text-slate-400">· avg {c.reference}</span>
                    </p>
                  </div>

                  {/* Two half-tracks around a zero baseline */}
                  <div className="grid grid-cols-2 items-center h-6">
                    <div className="flex justify-end items-center h-full gap-1.5">
                      {!positive && (
                        <>
                          <span className="text-[10px] font-semibold text-slate-600 tabular-nums whitespace-nowrap">
                            {pts(c.shap)}
                          </span>
                          <span
                            className="h-3 rounded-l"
                            style={{ width: `${Math.max(width * 0.62, 0.8)}%`, background: SHAP_COLORS.against }}
                          />
                        </>
                      )}
                    </div>
                    <div className="flex items-center h-full gap-1.5 border-l border-slate-300">
                      {positive && (
                        <>
                          <span
                            className="h-3 rounded-r"
                            style={{ width: `${Math.max(width * 0.62, 0.8)}%`, background: SHAP_COLORS.supports }}
                          />
                          <span className="text-[10px] font-semibold text-slate-600 tabular-nums whitespace-nowrap">
                            {pts(c.shap)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {isActive && c.desc && (
                    <p className="col-span-2 text-[9.5px] text-slate-500 leading-tight -mt-0.5">{c.desc}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[10.5px]">
            <caption className="sr-only">SHAP contributions for {levelText}</caption>
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-1.5 font-semibold">Factor</th>
                <th className="py-1.5 font-semibold text-right">This barangay</th>
                <th className="py-1.5 font-semibold text-right">Average</th>
                <th className="py-1.5 font-semibold text-right">Effect</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {rows.map((c) => (
                <tr key={c.key} className="border-b border-slate-100 last:border-0">
                  <td className="py-1.5 font-semibold text-slate-700">{c.feature}</td>
                  <td className="py-1.5 text-right text-slate-700">{c.value}</td>
                  <td className="py-1.5 text-right text-slate-500">{c.reference}</td>
                  <td className="py-1.5 text-right font-semibold text-slate-800">{pts(c.shap)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Additivity: reference + contributions = prediction */}
      <p className="text-[9.5px] text-slate-500 leading-snug border-t border-slate-200/70 pt-3 tabular-nums">
        {pct(shap.base_value)} {sum >= 0 ? "+" : "−"} {Math.abs(sum * 100).toFixed(1)} pts = {pct(shap.output_value)}
      </p>
    </div>
  );
}
