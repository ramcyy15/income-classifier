import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Server,
  Database,
  ExternalLink,
  RotateCw,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Sparkles,
  Terminal,
  Cpu,
  Layers,
  ChevronRight,
  X,
} from "lucide-react";
import { useServerHealth } from "../context/ServerHealthContext";
import kalingaLogo from "../assets/KalingaBot AI.png";

export default function SystemGateway() {
  const {
    serverStatus,
    supabaseStatus,
    supabaseData,
    secondsElapsed,
    progressPercent,
    responseTimeMs,
    isGatewayOpen,
    gatewayTab,
    setGatewayTab,
    closeGateway,
    bypassToApp,
    retryServer,
    retrySupabase,
  } = useServerHealth();

  const isServerReady = serverStatus === "ready";
  const isSupabasePaused = supabaseStatus === "paused";

  // If gateway is not active, don't render
  if (!isGatewayOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="system-gateway-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
        className="fixed inset-0 z-50 flex flex-col bg-[#070B12] text-slate-100 select-none overflow-y-auto"
      >
        {/* Subtle Ambient Mesh Lighting (Anti-Slop: single neutral indigo tint, no rainbow chaos) */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            background:
              "radial-gradient(circle 800px at 50% 20%, rgba(99, 102, 241, 0.12) 0%, rgba(15, 23, 42, 0) 70%)",
          }}
        />

        {/* ── TOP NAV BAR ── */}
        <header className="relative z-10 h-16 border-b border-white/[0.08] px-6 sm:px-10 flex items-center justify-between backdrop-blur-md bg-[#070B12]/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-1 flex items-center justify-center">
              <img src={kalingaLogo} alt="KalingaBot AI" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="text-xs font-bold tracking-tight text-white block">
                District V AI Gateway
              </span>
              <span className="text-[10px] font-mono text-slate-400 block tracking-wider uppercase">
                Cloud Architecture Telemetry
              </span>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-xl p-1 gap-1">
              <button
                onClick={() => setGatewayTab("server")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  gatewayTab === "server"
                    ? "bg-white/[0.12] text-white shadow-sm font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Server className="w-3.5 h-3.5" />
                <span>Backend Container</span>
                {isServerReady ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-1" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse ml-1" />
                )}
              </button>

              <button
                onClick={() => setGatewayTab("supabase")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  gatewayTab === "supabase"
                    ? "bg-white/[0.12] text-white shadow-sm font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Supabase Database</span>
                {isSupabasePaused ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 ml-1" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-1" />
                )}
              </button>
            </div>

            {/* Skip / Bypass Button */}
            <button
              onClick={bypassToApp}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-white/[0.12] hover:border-white/[0.24] bg-white/[0.03] hover:bg-white/[0.08] text-xs font-medium text-slate-300 transition-all ml-2"
              title="Continue to workspace directly"
            >
              <span>Explore Workspace</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </header>

        {/* ── MAIN CONTENT AREA ── */}
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 sm:p-12 max-w-4xl mx-auto w-full">
          {gatewayTab === "server" ? (
            /* ────────────────────────────────────────────────────────
               SCREEN 1: RENDER CLOUD CONTAINER WAKING
               ──────────────────────────────────────────────────────── */
            <motion.div
              key="server-screen"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="w-full space-y-8 text-center"
            >
              {/* Concentric Node Visual */}
              <div className="relative flex items-center justify-center mx-auto w-24 h-24 mb-2">
                <span
                  className={`absolute inset-0 rounded-full border transition-all duration-1000 ${
                    isServerReady
                      ? "border-emerald-500/40 bg-emerald-500/5 scale-100"
                      : "border-indigo-500/20 animate-ping opacity-60"
                  }`}
                />
                <span
                  className={`absolute inset-2 rounded-full border ${
                    isServerReady ? "border-emerald-500/30" : "border-indigo-500/30"
                  }`}
                />
                <div
                  className={`relative z-10 w-16 h-16 rounded-2xl flex items-center justify-center border transition-all ${
                    isServerReady
                      ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.2)]"
                      : "bg-[#0B101D] border-indigo-500/40 text-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.2)]"
                  }`}
                >
                  {isServerReady ? (
                    <CheckCircle2 className="w-8 h-8" />
                  ) : (
                    <Server className="w-8 h-8 animate-pulse" />
                  )}
                </div>
              </div>

              {/* Title & Editorial Subtext */}
              <div className="space-y-2 max-w-lg mx-auto">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.08] bg-white/[0.03] text-[11px] font-mono tracking-wider uppercase text-slate-400">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isServerReady ? "bg-emerald-400" : "bg-amber-400 animate-pulse"
                    }`}
                  />
                  <span>
                    {isServerReady ? "Cloud Runtime Active" : "Cold Start In Progress"}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-white">
                  {isServerReady
                    ? "Inference Engine Connected"
                    : "Waking Cloud ML Runtime"}
                </h1>

                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-normal">
                  {isServerReady
                    ? "The FastAPI environment is loaded and Scikit-Learn stacking weights are cached in memory. Ready for sub-100ms inference."
                    : "The free Render cloud backend hibernates after 15 minutes of inactivity. Initializing Python container and loading ensemble model into RAM (~25–35s)."}
                </p>
              </div>

              {/* Telemetry Spec Card */}
              <div className="w-full max-w-2xl mx-auto rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 backdrop-blur-sm space-y-4 text-left">
                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Elapsed: {secondsElapsed}s · Typical cold-start: ~30s</span>
                    </span>
                    <span className="text-indigo-400 font-bold tabular-nums">
                      {progressPercent}%
                    </span>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isServerReady
                          ? "bg-emerald-500"
                          : "bg-gradient-to-r from-indigo-500 to-teal-400"
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* 4 Steps Telemetry */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/[0.06] text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <span className="text-[10px] text-slate-500 block">01 · CONTAINER</span>
                    <span className="text-slate-200 font-medium">Render Instance</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <span className="text-[10px] text-slate-500 block">02 · ENVIRONMENT</span>
                    <span className="text-slate-200 font-medium">FastAPI Runtime</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <span className="text-[10px] text-slate-500 block">03 · MODEL CACHE</span>
                    <span className="text-slate-200 font-medium">Stacking Weights</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <span className="text-[10px] text-slate-500 block">04 · LATENCY</span>
                    <span className="text-emerald-400 font-medium">
                      {responseTimeMs ? `${responseTimeMs}ms` : "< 100ms Target"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Primary Actions */}
              <div className="flex items-center justify-center gap-3 pt-2">
                {!isServerReady ? (
                  <>
                    <button
                      onClick={retryServer}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Ping Cloud Server</span>
                    </button>

                    <button
                      onClick={bypassToApp}
                      className="px-5 py-2.5 rounded-xl border border-white/[0.12] hover:bg-white/[0.06] active:scale-[0.98] text-slate-300 text-xs font-semibold transition-all cursor-pointer"
                    >
                      Enter Workspace Anyway
                    </button>
                  </>
                ) : (
                  <button
                    onClick={closeGateway}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-xs font-semibold shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
                  >
                    <span>Launch Classifier</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </motion.div>
          ) : (
            /* ────────────────────────────────────────────────────────
               SCREEN 2: SUPABASE DATABASE PAUSED
               ──────────────────────────────────────────────────────── */
            <motion.div
              key="supabase-screen"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="w-full space-y-8 text-center"
            >
              {/* Database Icon with Sleep Pulse */}
              <div className="relative flex items-center justify-center mx-auto w-24 h-24 mb-2">
                <span className="absolute inset-0 rounded-full border border-amber-500/20 bg-amber-500/5" />
                <div className="relative z-10 w-16 h-16 rounded-2xl flex items-center justify-center bg-[#15120D] border border-amber-500/40 text-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.15)]">
                  <Database className="w-8 h-8" />
                </div>
              </div>

              {/* Headline & Explanation */}
              <div className="space-y-2 max-w-lg mx-auto">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/20 bg-amber-500/10 text-[11px] font-mono tracking-wider uppercase text-amber-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>Supabase Free-Tier Paused</span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-white">
                  Database Instance Sleeping
                </h1>

                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-normal">
                  Supabase automatically pauses projects after 7 days of inactivity to preserve free-tier compute hours. You can unpause it in 1 click from your Supabase Dashboard.
                </p>
              </div>

              {/* Diagnostic Specification Box */}
              <div className="w-full max-w-2xl mx-auto rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 backdrop-blur-sm space-y-4 text-left font-mono text-xs">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <span className="text-slate-400">PROJECT REFERENCE:</span>
                  <span className="text-amber-400 font-bold tracking-wider">
                    {supabaseData.project_ref || "vcpxuhvbiqghdweagiaa"}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <span className="text-slate-400">DATABASE STATUS:</span>
                  <span className="text-amber-400 font-semibold uppercase">
                    {supabaseStatus === "active" ? "ONLINE" : "PAUSED (INACTIVITY)"}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <span className="text-slate-400">WAKE DURATION:</span>
                  <span className="text-slate-200">~60 seconds upon clicking Restore</span>
                </div>

                {/* Important Thesis Reassurance */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[11px] text-slate-300 font-sans leading-relaxed flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">Notice for Thesis Evaluators: </strong>
                    All 14 District V barangay datasets, CBMS demographic indicators, and Scikit-Learn stacking models are self-contained in the deployment bundle. The classifier operates smoothly even while Supabase is sleeping!
                  </div>
                </div>
              </div>

              {/* Primary Actions */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <a
                  href={supabaseData.dashboard_url || "https://supabase.com/dashboard/project/vcpxuhvbiqghdweagiaa"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-[0.98] text-white text-xs font-semibold shadow-lg shadow-amber-600/25 transition-all cursor-pointer"
                >
                  <span>Restore on Supabase Dashboard</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  onClick={retrySupabase}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/[0.12] hover:bg-white/[0.06] active:scale-[0.98] text-slate-200 text-xs font-semibold transition-all cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Verify Connection</span>
                </button>

                <button
                  onClick={bypassToApp}
                  className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Continue in Offline Mode →
                </button>
              </div>
            </motion.div>
          )}
        </main>

        {/* ── FOOTER TELEMETRY ── */}
        <footer className="relative z-10 h-12 border-t border-white/[0.08] px-6 sm:px-10 flex items-center justify-between text-[11px] font-mono text-slate-400 bg-[#070B12]/80 backdrop-blur-md">
          <span>Quezon City District V · Socio-Economic Classifier</span>
          <div className="flex items-center gap-4">
            <span>Render: {isServerReady ? "Ready" : `Cold Start (${secondsElapsed}s)`}</span>
            <span className="hidden sm:inline">·</span>
            <span>Supabase: {supabaseStatus === "active" ? "Active" : "Paused"}</span>
          </div>
        </footer>
      </motion.div>
    </AnimatePresence>
  );
}
