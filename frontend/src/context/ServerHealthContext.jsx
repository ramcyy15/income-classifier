import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { checkServerHealth, checkSupabaseHealth } from "../services/api";

const ServerHealthContext = createContext(null);

export function ServerHealthProvider({ children }) {
  // Server Status: 'probing' | 'waking' | 'ready' | 'offline'
  const [serverStatus, setServerStatus] = useState("probing");
  // Supabase Status: 'checking' | 'active' | 'paused' | 'unconfigured'
  const [supabaseStatus, setSupabaseStatus] = useState("checking");
  const [supabaseData, setSupabaseData] = useState({
    project_ref: "vcpxuhvbiqghdweagiaa",
    dashboard_url: "https://supabase.com/dashboard/project/vcpxuhvbiqghdweagiaa",
  });

  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [lastPingTime, setLastPingTime] = useState(null);
  const [responseTimeMs, setResponseTimeMs] = useState(null);

  // Gateway (Full-Screen takeover) state:
  // Show by default on load if waking or probing, unless user explicitly clicked "Continue to App"
  const [isBypassed, setIsBypassed] = useState(false);
  const [isGatewayOpen, setIsGatewayOpen] = useState(true);
  const [gatewayTab, setGatewayTab] = useState("server"); // "server" | "supabase"

  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const probeAbortRef = useRef(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    startTimeRef.current = Date.now();
    setSecondsElapsed(0);
    timerRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const secs = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setSecondsElapsed(secs);
      }
    }, 500);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Ping Supabase independently
  const pingSupabase = useCallback(async () => {
    setSupabaseStatus("checking");
    try {
      const data = await checkSupabaseHealth();
      if (data && data.status === "active") {
        setSupabaseStatus("active");
      } else {
        setSupabaseStatus("paused");
      }
      if (data) {
        setSupabaseData((prev) => ({
          ...prev,
          ...data,
          dashboard_url: data.dashboard_url || "https://supabase.com/dashboard/project/vcpxuhvbiqghdweagiaa",
          project_ref: data.project_ref || "vcpxuhvbiqghdweagiaa",
        }));
      }
      return data;
    } catch (err) {
      setSupabaseStatus("paused");
      return { status: "paused" };
    }
  }, []);

  // Main Backend Server Ping
  const pingServer = useCallback(async (isManual = false) => {
    if (probeAbortRef.current) {
      probeAbortRef.current.abort();
    }
    const controller = new AbortController();
    probeAbortRef.current = controller;

    setServerStatus((prev) => (prev === "ready" && !isManual ? "ready" : "probing"));
    startTimer();
    const pingStart = Date.now();

    // If server takes longer than 2.0s, switch to waking
    const wakeTimer = setTimeout(() => {
      setServerStatus("waking");
    }, 2000);

    let isFinished = false;

    const attempt = async () => {
      try {
        const data = await checkServerHealth();
        clearTimeout(wakeTimer);
        stopTimer();
        isFinished = true;
        setResponseTimeMs(Date.now() - pingStart);
        setLastPingTime(new Date());
        setServerStatus("ready");

        // If gateway is open and server just became ready, auto-dismiss to dashboard after smooth delay
        setTimeout(() => {
          setIsGatewayOpen(false);
        }, 1200);

        // Also check supabase if included in response
        if (data && data.supabase) {
          setSupabaseData((prev) => ({ ...prev, ...data.supabase }));
        }

        // Trigger background check of supabase
        pingSupabase();

        return data;
      } catch (err) {
        if (!isFinished) {
          setServerStatus("waking");
          // Re-attempt every 3 seconds while booting
          setTimeout(() => {
            if (!isFinished) attempt();
          }, 3000);
        }
      }
    };

    attempt();
  }, [startTimer, stopTimer, pingSupabase]);

  useEffect(() => {
    pingServer();
    pingSupabase();

    return () => {
      stopTimer();
      if (probeAbortRef.current) probeAbortRef.current.abort();
    };
  }, [pingServer, pingSupabase, stopTimer]);

  const openGateway = useCallback((tab = "server") => {
    setGatewayTab(tab);
    setIsGatewayOpen(true);
    setIsBypassed(false);
  }, []);

  const closeGateway = useCallback(() => {
    setIsGatewayOpen(false);
  }, []);

  const bypassToApp = useCallback(() => {
    setIsBypassed(true);
    setIsGatewayOpen(false);
  }, []);

  // Compute smooth progress percentage
  const progressPercent = serverStatus === "ready"
    ? 100
    : Math.min(94, Math.round(100 * (1 - Math.exp(-secondsElapsed / 14))));

  return (
    <ServerHealthContext.Provider
      value={{
        status: serverStatus, // 'probing' | 'waking' | 'ready' | 'offline'
        serverStatus,
        supabaseStatus,
        supabaseData,
        secondsElapsed,
        progressPercent,
        lastPingTime,
        responseTimeMs,
        isGatewayOpen: isGatewayOpen && !isBypassed,
        gatewayTab,
        setGatewayTab,
        openGateway,
        closeGateway,
        bypassToApp,
        retryServer: () => pingServer(true),
        retrySupabase: () => pingSupabase(),
      }}
    >
      {children}
    </ServerHealthContext.Provider>
  );
}

export function useServerHealth() {
  const ctx = useContext(ServerHealthContext);
  if (!ctx) {
    throw new Error("useServerHealth must be used within a ServerHealthProvider");
  }
  return ctx;
}
