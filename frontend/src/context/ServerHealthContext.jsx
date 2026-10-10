import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { checkServerHealth } from "../services/api";

const ServerHealthContext = createContext(null);

export function ServerHealthProvider({ children }) {
  // Status: 'probing' | 'waking' | 'ready' | 'offline'
  const [status, setStatus] = useState("probing");
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [lastPingTime, setLastPingTime] = useState(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [responseTimeMs, setResponseTimeMs] = useState(null);

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

  const pingServer = useCallback(async (isManualRetry = false) => {
    if (probeAbortRef.current) {
      probeAbortRef.current.abort();
    }
    const controller = new AbortController();
    probeAbortRef.current = controller;

    setStatus((prev) => (prev === "ready" && !isManualRetry ? "ready" : "probing"));
    startTimer();
    const pingStart = Date.now();

    // If server takes longer than 2.2 seconds to reply, it's definitely waking from sleep
    const wakeThresholdTimeout = setTimeout(() => {
      setStatus("waking");
    }, 2200);

    // Repeated poll interval while waking (every 3 seconds)
    let isFinished = false;

    const attempt = async () => {
      try {
        const data = await checkServerHealth();
        clearTimeout(wakeThresholdTimeout);
        stopTimer();
        isFinished = true;
        setResponseTimeMs(Date.now() - pingStart);
        setLastPingTime(new Date());
        setStatus("ready");
        return data;
      } catch (err) {
        if (!isFinished) {
          setStatus("waking");
          // Retry after delay while container is starting
          setTimeout(() => {
            if (!isFinished) attempt();
          }, 3000);
        }
      }
    };

    attempt();
  }, [startTimer, stopTimer]);

  useEffect(() => {
    // Proactively ping server as soon as the app mounts
    pingServer();

    return () => {
      stopTimer();
      if (probeAbortRef.current) {
        probeAbortRef.current.abort();
      }
    };
  }, [pingServer, stopTimer]);

  // Compute progress percentage with realistic ease (asymptote to 92% until finished)
  // Most Render cold starts take ~25 to 35 seconds
  const progressPercent = status === "ready"
    ? 100
    : Math.min(94, Math.round(100 * (1 - Math.exp(-secondsElapsed / 14))));

  // Realistic milestone stages based on elapsed cold start time
  let stageIndex = 0;
  if (status === "ready") {
    stageIndex = 3;
  } else if (secondsElapsed < 6) {
    stageIndex = 0; // Container spin-up
  } else if (secondsElapsed < 18) {
    stageIndex = 1; // Python & FastAPI runtime initialization
  } else {
    stageIndex = 2; // Loading ML models into RAM
  }

  const stages = [
    { label: "Container Spin-up", desc: "Waking dormant cloud instance on Render" },
    { label: "Runtime Boot", desc: "Starting FastAPI & Python analytics engine" },
    { label: "Model Memory Cache", desc: "Loading Scikit-Learn stacking ensemble into RAM" },
    { label: "Online & Ready", desc: "Instantaneous sub-second inference active" },
  ];

  return (
    <ServerHealthContext.Provider
      value={{
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
        retryPing: () => pingServer(true),
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
