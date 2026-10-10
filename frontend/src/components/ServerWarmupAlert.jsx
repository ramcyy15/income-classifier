import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Server,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Clock,
  ChevronUp,
  ChevronDown,
  X,
  Sparkles,
  Cpu,
  Layers,
} from "lucide-react";
import { useServerHealth } from "../context/ServerHealthContext";

export default function ServerWarmupAlert() {
  const {
    status,
    secondsElapsed,
    progressPercent,
    stages,
    stageIndex,
    lastPingTime,
    responseTimeMs,
    isDismissed,
    setIsDismissed,
    isMinimized,
    setIsMinimized,
    retryPing,
  } = useServerHealth();

  const [hasAutoClosedReady, setHasAutoClosedReady] = useState(false);

  // When status becomes ready, keep success banner visible for 6s then auto-collapse
  useEffect(() => {
    if (status === "ready" && !hasAutoClosedReady) {
      const timer = setTimeout(() => {
        setIsMinimized(true);
        setHasAutoClosedReady(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [status, hasAutoClosedReady, setIsMinimized]);

  if (isDismissed) return null;

  // Render different visual styles based on status
  const isWaking = status === "waking" || status === "probing";
  const isReady = status === "ready";

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status === "ready" ? "ready-alert" : "waking-alert"}
        initial={{ opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ duration: 0.32, ease: [0.23, 1, 0.32, 1] }}
        className="mb-5"
      >
        {/* ── MINIMIZED PILL (Subtle top bar) ── */}
        {isMinimized ? (
          <div className="flex items-center justify-between px-4 py-2 neu-surface rounded-2xl border border-white/80 shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                {isReady ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </>
                ) : (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                  </>
                )}
              </span>

              <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                {isReady ? (
                  <>
                    <span className="text-emerald-700 font-bold">Cloud Server Online</span>
                    <span className="text-slate-400 text-[10px] hidden sm:inline">
                      ({responseTimeMs ? `${responseTimeMs}ms` : "<100ms response"})
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-amber-800 font-bold">Server Waking from Sleep</span>
                    <span className="text-amber-600 font-mono text-[11px] tabular-nums">
                      ({secondsElapsed}s)
                    </span>
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsMinimized(false)}
                className="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 neu-btn rounded-lg flex items-center gap-1 transition-transform active:scale-95"
                title="Expand server details"
              >
                <span>Details</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              <button
                onClick={() => setIsDismissed(true)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* ── EXPANDED INTERACTIVE CARD ── */
          <div
            className={`relative overflow-hidden rounded-3xl neu-surface border transition-colors duration-300 p-5 sm:p-6 ${
              isReady
                ? "border-emerald-200/80 shadow-[0_10px_30px_rgba(16,185,129,0.08)]"
                : "border-amber-200/80 shadow-[0_10px_30px_rgba(245,158,11,0.08)]"
            }`}
          >
            {/* Ambient Background Glow */}
            <div
              className={`absolute -right-12 -top-12 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-40 transition-colors duration-500 ${
                isReady ? "bg-emerald-300" : "bg-amber-300"
              }`}
            />

            {/* Top Bar: Title, Status Badge & Actions */}
            <div className="relative z-10 flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center neu-inset-sm transition-colors duration-300 ${
                    isReady ? "text-emerald-600" : "text-amber-600"
                  }`}
                >
                  {isReady ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <Server className="w-5 h-5 animate-pulse text-amber-600" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-bold text-slate-900 tracking-[-0.01em]">
                      {isReady
                        ? "Backend ML Server Connected & Online"
                        : "Cloud Server Waking from Sleep"}
                    </h2>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider flex items-center gap-1 ${
                        isReady
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300/60"
                          : "bg-amber-100 text-amber-800 border border-amber-300/60"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isReady ? "bg-emerald-500 animate-pulse" : "bg-amber-500 animate-ping"
                        }`}
                      />
                      {isReady ? "Active" : "Waking (~30s)"}
                    </span>
                  </div>

                  <p className="text-[11.5px] text-slate-500 font-medium mt-0.5">
                    {isReady
                      ? "FastAPI server active with Scikit-Learn ensemble models preloaded. Instant predictions ready."
                      : "The free Render cloud backend hibernates when inactive. A wake signal is running in background."}
                  </p>
                </div>
              </div>

              {/* Action buttons (Minimize & Dismiss) */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-1.5 neu-btn rounded-xl text-slate-500 hover:text-slate-800 transition-transform active:scale-95"
                  title="Minimize"
                  aria-label="Minimize server alert"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsDismissed(true)}
                  className="p-1.5 neu-btn rounded-xl text-slate-500 hover:text-slate-800 transition-transform active:scale-95"
                  title="Dismiss alert"
                  aria-label="Dismiss server alert"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Progress Bar (Dynamic with subtle glow) */}
            <div className="relative z-10 mb-4">
              <div className="flex items-center justify-between text-[11px] mb-1.5 font-mono">
                <span className="text-slate-600 font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {isReady
                      ? "Cold start complete"
                      : `Elapsed: ${secondsElapsed}s · typically takes ~25–35s`}
                  </span>
                </span>
                <span
                  className={`font-bold tabular-nums ${
                    isReady ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {progressPercent}%
                </span>
              </div>

              <div className="w-full h-2.5 rounded-full neu-inset overflow-hidden p-0.5">
                <motion.div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isReady
                      ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                      : "bg-gradient-to-r from-amber-500 via-orange-400 to-indigo-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                  }`}
                  style={{ width: `${progressPercent}%` }}
                  transition={{ ease: [0.23, 1, 0.32, 1] }}
                />
              </div>
            </div>

            {/* 4-Stage Visual Milestones */}
            <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              {stages.map((stg, idx) => {
                const isPassed = stageIndex > idx || isReady;
                const isCurrent = stageIndex === idx && !isReady;

                return (
                  <div
                    key={stg.label}
                    className={`p-2.5 rounded-2xl border transition-all duration-200 ${
                      isPassed
                        ? "bg-white/80 border-emerald-200/60 shadow-sm"
                        : isCurrent
                        ? "bg-amber-50/70 border-amber-300/80 shadow-sm ring-1 ring-amber-400/30"
                        : "bg-white/30 border-slate-200/40 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      {isPassed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      ) : isCurrent ? (
                        <RotateCw className="w-3.5 h-3.5 text-amber-600 animate-spin flex-shrink-0" />
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block flex-shrink-0" />
                      )}
                      <span
                        className={`text-[11px] font-bold truncate ${
                          isPassed
                            ? "text-slate-800"
                            : isCurrent
                            ? "text-amber-900"
                            : "text-slate-500"
                        }`}
                      >
                        {stg.label}
                      </span>
                    </div>
                    <p className="text-[9.5px] text-slate-500 leading-tight">
                      {stg.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Bottom Status / Helpful Explanation & Retry */}
            <div className="relative z-10 pt-2 border-t border-slate-200/60 flex items-center justify-between flex-wrap gap-2 text-[11px]">
              <div className="flex items-center gap-2 text-slate-500">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>
                  {isReady
                    ? "You can now classify barangays or individual households instantly."
                    : "You don't need to wait — feel free to fill in the form now while it finishes booting!"}
                </span>
              </div>

              {!isReady && (
                <button
                  onClick={retryPing}
                  className="px-3 py-1.5 neu-btn rounded-xl font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1.5 transition-transform active:scale-95"
                >
                  <RotateCw className="w-3 h-3 text-slate-600" />
                  <span>Ping Server Now</span>
                </button>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
