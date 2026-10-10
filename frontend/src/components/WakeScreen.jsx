import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../assets/logo.png';

const TIPS = [
  'Analyzing socio-economic indicators…',
  'Loading stacking ensemble model…',
  'Preparing barangay datasets…',
  'Initializing AI policy engine…',
  'Almost ready…',
];

export default function WakeScreen({ ready }) {
  const [tipIdx, setTipIdx] = React.useState(0);

  React.useEffect(() => {
    if (ready) return;
    const id = setInterval(() => {
      setTipIdx(i => (i + 1) % TIPS.length);
    }, 3000);
    return () => clearInterval(id);
  }, [ready]);

  return (
    <motion.div
      key="wake"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#080d14] select-none"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
    >
      {/* Background ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(59,130,246,0.08) 0%, transparent 70%)',
        }}
      />

      {/* Logo + rings */}
      <div className="relative flex items-center justify-center mb-10">
        {/* Pulsing rings — spatial consistency: show "waking" state */}
        {!ready && (
          <>
            <span
              className="absolute rounded-full border border-blue-500/20"
              style={{
                width: 100, height: 100,
                animation: 'wake-ring 2s cubic-bezier(0.23,1,0.32,1) infinite',
              }}
            />
            <span
              className="absolute rounded-full border border-blue-500/15"
              style={{
                width: 100, height: 100,
                animation: 'wake-ring 2s cubic-bezier(0.23,1,0.32,1) 0.7s infinite',
              }}
            />
          </>
        )}
        {/* Steady ring when ready */}
        {ready && (
          <motion.span
            className="absolute rounded-full border border-blue-500/40"
            style={{ width: 80, height: 80 }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.1, opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          />
        )}

        {/* Logo */}
        <motion.div
          className="relative z-10 w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{
            background: 'rgba(13,21,32,0.9)',
            border: '1px solid rgba(59,130,246,0.3)',
            boxShadow: '0 0 32px rgba(59,130,246,0.15), 0 8px 32px rgba(0,0,0,0.5)',
          }}
          animate={ready ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <img src={logo} alt="KalingaBot" className="w-10 h-10 object-contain" />
        </motion.div>
      </div>

      {/* Title */}
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      >
        <h1 className="text-xl font-semibold tracking-[-0.03em] text-[#e6edf3] mb-1">
          District V Income Intelligence
        </h1>
        <p className="text-[11px] font-mono text-[#484f58] tracking-[0.05em] uppercase">
          Quezon City · District V · Stacking Ensemble ML
        </p>
      </motion.div>

      {/* Status area */}
      <div className="flex flex-col items-center gap-4">
        <AnimatePresence mode="wait">
          {!ready ? (
            <motion.div
              key="loading"
              className="flex flex-col items-center gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Spinner */}
              <div
                className="w-5 h-5 rounded-full border-2 border-[#1d3a6a] border-t-blue-500"
                style={{ animation: 'spin-slow 0.9s linear infinite' }}
              />

              {/* Rotating tip */}
              <AnimatePresence mode="wait">
                <motion.p
                  key={tipIdx}
                  className="text-[11px] font-mono text-[#8b949e] tracking-[0.02em]"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                >
                  {TIPS[tipIdx]}
                </motion.p>
              </AnimatePresence>

              <p className="text-[10px] text-[#484f58] mt-1">
                Server is waking up · This may take up to 30s
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="ready"
              className="flex items-center gap-2"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
            >
              {/* Green check */}
              <div className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center">
                <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-[12px] font-mono text-emerald-400">System online</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom label */}
      <motion.p
        className="absolute bottom-6 text-[10px] font-mono text-[#484f58] tracking-[0.04em]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        CS Thesis II · Barangay Income Classification System
      </motion.p>
    </motion.div>
  );
}
