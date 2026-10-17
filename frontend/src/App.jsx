import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ClassificationCenter from './components/ClassificationCenter';
import HistoryView from './components/HistoryView';
import SystemPage from './components/SystemPage';
import { ServerHealthProvider, useServerHealth } from './context/ServerHealthContext';

function MainAppLayout() {
  const [activeTab, setActiveTab] = useState('classifier');
  const { isGatewayOpen, serverStatus, supabaseStatus } = useServerHealth();

  // If the server is waking or Supabase is paused on initial load (and user has not clicked bypass):
  // Render the dedicated whole-screen standalone page!
  const isColdWaking = serverStatus === 'waking';
  const isDBPaused = supabaseStatus === 'paused';

  if (isGatewayOpen && (isColdWaking || isDBPaused)) {
    return (
      <SystemPage
        isFullScreen={true}
        onEnterApp={() => setActiveTab('classifier')}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#EEF2F6] font-sans text-slate-900 antialiased">
      {/* Sleek Left Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header - pristine clean, zero server/db status badges */}
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
  );
}

export default function App() {
  return (
    <ServerHealthProvider>
      <MainAppLayout />
    </ServerHealthProvider>
  );
}
