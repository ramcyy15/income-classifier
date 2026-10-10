import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ClassificationCenter from './components/ClassificationCenter';
import HistoryView from './components/HistoryView';
import WakeScreen from './components/WakeScreen';

// Check if backend is alive — used to detect Render cold-start
async function pingBackend() {
  try {
    const base = import.meta.env.VITE_API_URL || '';
    const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout(60000) });
    return res.ok;
  } catch {
    return false;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState('classifier');
  const [backendReady, setBackendReady] = useState(false);
  const [waking, setWaking] = useState(true);

  useEffect(() => {
    // In local dev the backend is always on localhost — skip wake screen
    if (!import.meta.env.VITE_API_URL) {
      setBackendReady(true);
      setWaking(false);
      return;
    }
    // Production: ping until backend wakes
    let cancelled = false;
    const poll = async () => {
      const ok = await pingBackend();
      if (cancelled) return;
      if (ok) {
        setBackendReady(true);
        // Let the exit animation play before unmounting
        setTimeout(() => setWaking(false), 800);
      } else {
        setTimeout(poll, 3000);
      }
    };
    poll();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#080d14] font-sans text-[#e6edf3] antialiased">
      <AnimatePresence>
        {waking && <WakeScreen ready={backendReady} />}
      </AnimatePresence>

      {/* Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto px-6 py-5">
          <AnimatePresence mode="wait">
            {activeTab === 'classifier' && (
              <motion.div
                key="classifier"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                className="h-full"
              >
                <ClassificationCenter />
              </motion.div>
            )}
            {activeTab === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                className="h-full"
              >
                <HistoryView onNavigateToClassifier={() => setActiveTab('classifier')} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
