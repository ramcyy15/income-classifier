import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Server,
  Database,
  ExternalLink,
  RotateCw,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Terminal,
  Cpu,
  Layers,
  Activity,
  HardDrive,
  Check,
} from "lucide-react";
import { useServerHealth } from "../context/ServerHealthContext";
import kalingaLogo from "../assets/KalingaBot AI.png";

/**
 * SystemPage
 * High-craft, anti-slop full page for:
 * 1. Supabase Database Paused recovery & diagnostics
 * 2. Render Cloud ML Engine cold-start telemetry
 *
 * Can be rendered as:
 * - A full standalone screen (e.g. during initial cold start or pause)
 * - An internal app page view (Sidebar -> "Cloud & Database" tab)
 */
export default function SystemPage({ isFullScreen = false, onEnterApp }) {
  const {
    serverStatus,
    supabaseStatus,
    supabaseData,
    secondsElapsed,
    progressPercent,
    responseTimeMs,
    gatewayTab,
    setGatewayTab,
    bypassToApp,
    retryServer,
    retrySupabase,
  } = useServerHealth();

  const [isPingingDB, setIsPingingDB] = useState(false);
  const [isPingingServer, setIsPingingServer] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  const activeTab = gatewayTab || (supabaseStatus === "paused" ? "supabase" : "server");

  const isServerReady = serverStatus === "ready";
  const isSupabasePaused = supabaseStatus === "paused";

  const handleTestDB = async () => {
    setIsPingingDB(true);
    await retrySupabase();
    setTimeout(() => setIsPingingDB(false), 600);
  };

  const handleTestServer = async () => {
    setIsPingingServer(true);
    await retryServer();
    setTimeout(() => setIsPingingServer(false), 600);
  };

  const handleCopyRef = () => {
    navigator.clipboard?.writeText("vcpxuhvbiqghdweagiaa");
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleContinue = () => {
    bypassToApp();
    if (onEnterApp) onEnterApp();
  };

  const phases = [
    {
      id: "01",
      name: "Container Spin-Up",
      detail: "Waking dormant instance on Render cloud cluster",
      isComplete: secondsElapsed > 8 || isServerReady,
      isCurrent: secondsElapsed <= 8 && !isServerReady,
    },
    {
      id: "02",
      name: "FastAPI Runtime Boot",
      detail: "Initializing Python 3.10 ASGI server & route handlers",
      isComplete: secondsElapsed > 18 || isServerReady,
      isCurrent: secondsElapsed > 8 && secondsElapsed <= 18 && !isServerReady,
    },
    {
      id: "03",
      name: "Model Memory Cache",
      detail: "Loading Random Forest, Gradient Boosting & Logistic Regression into RAM",
      isComplete: secondsElapsed > 28 || isServerReady,
      isCurrent: secondsElapsed > 18 && secondsElapsed <= 28 && !isServerReady,
    },
    {
      id: "04",
      name: "Inference Engine Ready",
      detail: "Ready for sub-second Barangay & Household classifications",
      isComplete: isServerReady,
      isCurrent: secondsElapsed > 28 && !isServerReady,
    },
  ];

  return (
    <div
      className={`w-full flex flex-col font-sans select-none ${
        isFullScreen
          ? "fixed inset-0 z-50 min-h-screen bg-[#07090E] text-slate-100 overflow-y-auto"
          : "min-h-[calc(100vh-8rem)] rounded-2xl bg-[#090D16] text-slate-100 border border-slate-800/80 shadow-2xl p-6 md:p-8"
      }`}
    >
      {/* Subtle architectural grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
          backgroundSize: "28px 28px",
        }}
      />

      {/* Top Header / View Controller */}
      <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/60 p-1.5 flex items-center justify-center shadow-inner">
            <img src={kalingaLogo} alt="KalingaBot AI" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold tracking-wider text-indigo-400 uppercase">
                System Infrastructure
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/50">
                QC District V
              </span>
            </div>
            <h1 className="text-base font-semibold text-slate-100 tracking-tight">
              Cloud Engine & Database Status
            </h1>
          </div>
        </div>

        {/* Tab Switcher & Bypass Button */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Tabs */}
          <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-xl p-1 gap-1">
            <button
              onClick={() => setGatewayTab("supabase")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === "supabase"
                  ? "bg-slate-800 text-white font-semibold shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Supabase DB</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isSupabasePaused ? "bg-amber-400 animate-pulse" : "bg-emerald-400"
                }`}
              />
            </button>

            <button
              onClick={() => setGatewayTab("server")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === "server"
                  ? "bg-slate-800 text-white font-semibold shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>ML Engine</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isServerReady ? "bg-emerald-400" : "bg-amber-400 animate-pulse"
                }`}
              />
            </button>
          </div>

          {/* Continue / Bypass Button */}
          {isFullScreen && (
            <button
              onClick={handleContinue}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <span>Enter Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Viewport */}
      <div className="relative z-10 w-full max-w-5xl mx-auto flex-1 flex flex-col justify-center py-8">
        <AnimatePresence mode="wait">
          {/* ========================================================
              TAB 1: SUPABASE DATABASE PAUSED RECOVERY PAGE
             ======================================================== */}
          {activeTab === "supabase" && (
            <motion.div
              key="supabase-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {/* Primary Status Card */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm p-6 sm:p-8">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                  <div className="space-y-3 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono font-medium">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      <span>STATUS: PROJECT PAUSED (FREE TIER INACTIVITY)</span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                      Supabase PostgreSQL Instance is Paused
                    </h2>

                    <p className="text-sm text-slate-300 leading-relaxed">
                      Free-tier Supabase projects automatically pause compute after 7 days without inbound traffic to prevent unnecessary resource consumption. All schemas, tables, and credentials remain safely saved.
                    </p>
                  </div>

                  {/* Actions column */}
                  <div className="flex flex-col sm:flex-row md:flex-col gap-3 min-w-[220px]">
                    <a
                      href="https://supabase.com/dashboard/project/vcpxuhvbiqghdweagiaa"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg hover:shadow-emerald-500/25 transition-all cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Unpause on Supabase ↗</span>
                    </a>

                    <button
                      onClick={handleTestDB}
                      disabled={isPingingDB}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/60 transition-all cursor-pointer disabled:opacity-60"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${isPingingDB ? "animate-spin" : ""}`} />
                      <span>{isPingingDB ? "Testing Socket..." : "Verify Connection"}</span>
                    </button>
                  </div>
                </div>

                {/* Offline Independence Notice */}
                <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-indigo-950/20 -mx-6 -mb-6 p-6 rounded-b-2xl border-indigo-500/10">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-xs font-semibold text-indigo-200">
                        100% Offline Model Independence
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                        District V datasets and Scikit-Learn stacking ensemble models are bundled inside the application. You can perform full Barangay and Household classifications right now without waiting for database unpause.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleContinue}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold whitespace-nowrap transition-all cursor-pointer"
                  >
                    <span>Proceed to Classifier</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Technical Diagnostics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
                    Project Reference
                  </span>
                  <div className="flex items-center justify-between font-mono text-xs text-slate-200">
                    <span>vcpxuhvbiqghdweagiaa</span>
                    <button
                      onClick={handleCopyRef}
                      title="Copy Project Ref"
                      className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 cursor-pointer"
                    >
                      {copiedRef ? <Check className="w-3 h-3 text-emerald-400" /> : <Layers className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
                    Endpoint Host
                  </span>
                  <span className="font-mono text-xs text-slate-200 block truncate">
                    vcpxuhvbiqghdweagiaa.supabase.co
                  </span>
                </div>

                <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
                    Historical Storage
                  </span>
                  <span className="font-mono text-xs text-slate-200 block">
                    Local IndexedDB / Session Active
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* ========================================================
              TAB 2: RENDER CLOUD SERVER WAKING / RUNTIME TELEMETRY
             ======================================================== */}
          {activeTab === "server" && (
            <motion.div
              key="server-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {/* Telemetry Card */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm p-6 sm:p-8">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                  <div className="space-y-3 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-mono font-medium">
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                      <span>
                        {isServerReady
                          ? "STATUS: RUNTIME ONLINE & READY"
                          : `COLD START IN PROGRESS · ${secondsElapsed}S ELAPSED`}
                      </span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                      {isServerReady
                        ? "Machine Learning Runtime Active"
                        : "Cloud ML Engine Waking from Sleep"}
                    </h2>

                    <p className="text-sm text-slate-300 leading-relaxed">
                      Render's free tier spins down idle instances after 15 minutes of inactivity. When a request arrives, the cloud host starts the container and loads the Scikit-Learn stacking ensemble into memory.
                    </p>
                  </div>

                  {/* Actions Column */}
                  <div className="flex flex-col sm:flex-row md:flex-col gap-3 min-w-[200px]">
                    <button
                      onClick={handleTestServer}
                      disabled={isPingingServer}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/60 transition-all cursor-pointer disabled:opacity-60"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${isPingingServer ? "animate-spin" : ""}`} />
                      <span>{isPingingServer ? "Pinging..." : "Ping Engine Now"}</span>
                    </button>

                    <button
                      onClick={handleContinue}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm hover:shadow transition-all cursor-pointer"
                    >
                      <span>Enter Workspace Anyway</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Smooth Asymptotic Progress Line */}
                <div className="mt-8 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Typical cold boot: 25s – 35s</span>
                    </span>
                    <span className="font-semibold text-slate-200">
                      {isServerReady ? "100% · Online" : `${progressPercent}%`}
                    </span>
                  </div>

                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full"
                      initial={{ width: "8%" }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                </div>

                {/* 4-Phase Stepper */}
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {phases.map((phase) => (
                    <div
                      key={phase.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        phase.isComplete
                          ? "bg-slate-800/40 border-slate-700/50 text-slate-200"
                          : phase.isCurrent
                          ? "bg-indigo-950/30 border-indigo-500/40 text-indigo-100"
                          : "bg-slate-900/20 border-slate-800/40 text-slate-500"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono font-bold text-slate-400">
                          PHASE {phase.id}
                        </span>
                        {phase.isComplete ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : phase.isCurrent ? (
                          <RotateCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-slate-700" />
                        )}
                      </div>
                      <h5 className="text-xs font-semibold leading-tight">{phase.name}</h5>
                      <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                        {phase.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Technical Metadata Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
                    Host Provider
                  </span>
                  <span className="font-mono text-xs text-slate-200 block">
                    Render Free Web Service (Oregon)
                  </span>
                </div>

                <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
                    Production Endpoint
                  </span>
                  <span className="font-mono text-xs text-slate-200 block truncate">
                    income-classifier-695e.onrender.com
                  </span>
                </div>

                <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
                    ML Architecture
                  </span>
                  <span className="font-mono text-xs text-slate-200 block">
                    Stacking (RF + GB → Logistic Regression)
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer reassurance */}
      <div className="relative z-10 w-full max-w-5xl mx-auto pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
        <span>District V Socio-Economic Income Classification System</span>
        <span className="font-mono text-[11px]">Local Bundled Datasets · 14 Barangays Ready</span>
      </div>
    </div>
  );
}
