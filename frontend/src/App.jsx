import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ClassificationCenter from './components/ClassificationCenter';
import HistoryView from './components/HistoryView';
import ServerWarmupAlert from './components/ServerWarmupAlert';
import { ServerHealthProvider } from './context/ServerHealthContext';

export default function App() {
  const [activeTab, setActiveTab] = useState('classifier');

  return (
    <ServerHealthProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-[#EEF2F6] font-sans text-slate-900 antialiased">
        {/* Sleek Left Sidebar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Header */}
          <Header />

          {/* Dynamic Scrollable Body */}
          <main className="flex-1 overflow-y-auto px-8 py-6">
            <div className="max-w-5xl mx-auto">
              {/* Server Warmup & Status Alert */}
              <ServerWarmupAlert />
            </div>

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
