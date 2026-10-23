import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  ExternalLink,
  RotateCw,
  ArrowRight,
  Database,
  Server,
  Sparkles,
} from "lucide-react";
import { useServerHealth } from "../context/ServerHealthContext";
import kalingaLogo from "../assets/KalingaBot AI.png";

/**
 * SystemPage
 * Minimalist, light neumorphic full-page status screen
 * Aligned with main app theme (#EEF2F6).
 * Follows exact structure:
 * (spinner)
 * (Words/Status/State of the System)
 */
export default function SystemPage({ onEnterApp }) {
  const {
    serverStatus,
    supabaseStatus,
    secondsElapsed,
    gatewayTab,
    setGatewayTab,
    bypassToApp,
    retryServer,
    retrySupabase,
  } = useServerHealth();

  const [isRetrying, setIsRetrying] = useState(false);

  // If Supabase is paused, default to supabase view; otherwise server waking view
  const currentView =
    gatewayTab || (supabaseStatus === "paused" ? "supabase" : "server");

  const isServerWaking = serverStatus === "waking" || serverStatus === "probing";
  const isDBPaused = supabaseStatus === "paused";

  const handleContinue = () => {
    bypassToApp();
    if (onEnterApp) onEnterApp();
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    if (currentView === "supabase") {
      await retrySupabase();
    } else {
      await retryServer();
    }
    setTimeout(() => setIsRetrying(false), 600);
  };

  return (
    <div className="fixed inset-0 z-50 min-h-screen w-screen flex flex-col items-center justify-center bg-[#EEF2F6] font-sans text-slate-800 p-6 select-none">
      {/* Optional minimal switcher if both states or toggled */}
      {(isDBPaused || isServerWaking) && (
        <div className="absolute top-8 flex items-center neu-inset-sm p-1 rounded-2xl gap-1">
          <button
            onClick={() => setGatewayTab("server")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              currentView === "server"
                ? "neu-btn font-semibold text-slate-800"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Cloud Engine</span>
            {isServerWaking && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setGatewayTab("supabase")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              currentView === "supabase"
                ? "neu-btn font-semibold text-slate-800"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Supabase DB</span>
            {isDBPaused && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>
        </div>
      )}

      {/* Main Centered Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md neu-surface rounded-3xl p-8 sm:p-10 flex flex-col items-center text-center"
      >
        {/* ========================================================
            VIEW 1: SUPABASE DATABASE PAUSED
           ======================================================== */}
        {currentView === "supabase" ? (
          <>
            {/* (spinner / status icon) */}
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-full neu-inset flex items-center justify-center">
                <Database className="w-8 h-8 text-amber-500" />
              </div>
              <span className="absolute top-0 right-0 w-4 h-4 rounded-full bg-amber-400 border-2 border-[#EEF2F6] animate-pulse" />
            </div>

            {/* (Words / Status / State of the System) */}
            <div className="space-y-2 mb-8">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-600 block">
                Database Paused
              </span>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                Supabase Instance Hibernated
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                Free-tier compute paused after 7 days of inactivity. ML models work 100% offline without the database.
              </p>
            </div>

            {/* Actions */}
            <div className="w-full space-y-3">
              <a
                href="https://supabase.com/dashboard/project/vcpxuhvbiqghdweagiaa"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 neu-btn-primary text-white rounded-xl text-xs font-semibold shadow-md cursor-pointer"
              >
                <span>Unpause on Supabase</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={handleContinue}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 neu-btn rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
              >
                <span>Continue to Classifier (Offline Mode)</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>

            {/* Verify Connection */}
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="mt-5 flex items-center gap-1.5 text-[11px] font-mono text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
            >
              <RotateCw
                className={`w-3 h-3 ${isRetrying ? "animate-spin text-indigo-600" : ""}`}
              />
              <span>{isRetrying ? "Checking..." : "Verify Connection"}</span>
            </button>
          </>
        ) : (
          /* ========================================================
             VIEW 2: CLOUD ENGINE WAKING
             ======================================================== */
          <>
            {/* (spinner) */}
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-full neu-inset flex items-center justify-center">
                <div className="w-12 h-12 rounded-full neu-surface flex items-center justify-center">
                  <img
                    src={kalingaLogo}
                    alt="KalingaBot AI"
                    className="w-7 h-7 object-contain rounded"
                  />
                </div>
              </div>
              {/* Spinner ring */}
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-600 animate-spin" />
            </div>

            {/* (Words / Status / State of the System) */}
            <div className="space-y-2 mb-8">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-600 block">
                Cloud Server Starting
              </span>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                Waking ML Engine
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                Free instances hibernate when inactive. Starting runtime and loading models (~25–30s).
              </p>
              <div className="pt-1">
                <span className="inline-block text-[11px] font-mono font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                  {secondsElapsed}s elapsed
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="w-full space-y-3">
              <button
                onClick={handleContinue}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 neu-btn rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
              >
                <span>Enter Workspace (Draft Form Now)</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>

            {/* Ping Server Now */}
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="mt-5 flex items-center gap-1.5 text-[11px] font-mono text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
            >
              <RotateCw
                className={`w-3 h-3 ${isRetrying ? "animate-spin text-indigo-600" : ""}`}
              />
              <span>{isRetrying ? "Pinging..." : "Ping Server"}</span>
            </button>
          </>
        )}
      </motion.div>

      {/* Discreet footer watermark */}
      <p className="absolute bottom-6 text-[11px] font-mono text-slate-400 tracking-wide">
        District V Socio-Economic Income Classification System
      </p>
    </div>
  );
}
