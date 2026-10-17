import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ClassificationCenter from './components/ClassificationCenter';
import HistoryView from './components/HistoryView';
import SystemGateway from './components/SystemGateway';
import { ServerHealthProvider } from './context/ServerHealthContext';

export default function App() {
  const [activeTab, setActiveTab] = useState('classifier');

  return (
    <ServerHealthProvider>
      {/* Full-Screen Anti-Slop System Gateway for Waking State & Supabase Paused State */}
      <SystemGateway />

      <div className="flex h-screen w-screen overflow-hidden bg-[#EEF2F6] font-sans text-slate-900 antialiased">
        {/* Sleek Left Sidebar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Header */}
          <Header />

          {/* Dynamic Scrollable Body */}
          <main className="flex-1 overflow-y-auto px-8 py-6">
            <AnimatePresence mode="wait">
              {activeTab === 'classifier' && (
                <motion.div
                  key="classifier"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                  className="h-full"
                >
                  <ClassificationCenter />
                </motion.div>
              )}
              {activeTab === 'history' && (
                <motion.div
                  key="history"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
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
    </ServerHealthProvider>
  );
}
