import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ClassificationCenter from './components/ClassificationCenter';
import HistoryView from './components/HistoryView';

export default function App() {
  const [activeTab, setActiveTab] = useState('classifier');

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-900 antialiased">
      {/* Sleek Left Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <Header />

        {/* Dynamic Scrollable Body */}
        <main className="flex-1 overflow-y-auto px-8 py-6">
          {activeTab === 'classifier' && <ClassificationCenter />}
          {activeTab === 'history' && (
            <HistoryView onNavigateToClassifier={() => setActiveTab('classifier')} />
          )}
        </main>
      </div>
    </div>
  );
}
