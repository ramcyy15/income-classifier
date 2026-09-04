import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import KpiGrid from './components/KpiGrid';
import OverviewMap from './components/OverviewMap';
import BarangayDirectory from './components/BarangayDirectory';
import BarangayProfile from './components/BarangayProfile';
import SimulationView from './components/SimulationView';
import PolicyBriefsView from './components/PolicyBriefsView';
import SimulationModal from './components/SimulationModal';
import PolicyBriefModal from './components/PolicyBriefModal';
import { fetchOverview, fetchBarangays, fetchBarangayDetails } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [overview, setOverview] = useState(null);
  const [barangays, setBarangays] = useState([]);
  const [selectedBarangay, setSelectedBarangay] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showSimulation, setShowSimulation] = useState(false);
  const [showBrief, setShowBrief] = useState(false);

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [ovData, brgyList] = await Promise.all([
          fetchOverview(),
          fetchBarangays(),
        ]);
        setOverview(ovData);
        setBarangays(brgyList);

        // Auto select first barangay
        if (brgyList && brgyList.length > 0) {
          const detail = await fetchBarangayDetails(brgyList[0].name);
          setSelectedBarangay(detail);
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, []);

  const handleSelectBarangay = async (b) => {
    try {
      const details = await fetchBarangayDetails(b.name);
      setSelectedBarangay(details);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredBarangays = barangays.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-900 antialiased">
      {/* Sleek Left Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <Header
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          barangays={filteredBarangays}
          selectedBarangay={selectedBarangay}
          onSelectBarangay={handleSelectBarangay}
          onOpenSimulation={() => setShowSimulation(true)}
        />

        {/* Dynamic Scrollable Body */}
        <main className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          {/* Top 4 KPI Metrics */}
          <KpiGrid 
            metrics={overview?.metrics} 
            communityCounts={overview?.community_counts} 
          />

          {/* Tab 1: Overview with Clean Free Map + Directory + Profile */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[580px]">
              {/* Left 4 Cols: Barangay Directory */}
              <div className="lg:col-span-4 h-full">
                <BarangayDirectory
                  barangays={filteredBarangays}
                  selectedBarangay={selectedBarangay}
                  onSelectBarangay={handleSelectBarangay}
                  onOpenSimulation={() => setShowSimulation(true)}
                />
              </div>

              {/* Center 4 Cols: Clean Free Map (No Geofence) */}
              <div className="lg:col-span-4 h-full">
                <OverviewMap
                  barangays={filteredBarangays}
                  selectedBarangay={selectedBarangay}
                  onSelectBarangay={handleSelectBarangay}
                />
              </div>

              {/* Right 4 Cols: Selected Barangay Details & Progress Bars */}
              <div className="lg:col-span-4 h-full">
                <BarangayProfile
                  barangay={selectedBarangay}
                  onOpenSimulation={() => setShowSimulation(true)}
                  onOpenBrief={() => setShowBrief(true)}
                />
              </div>
            </div>
          )}

          {/* Tab 2: Intervention View */}
          {activeTab === 'simulation' && (
            <SimulationView
              barangays={barangays}
              selectedBarangay={selectedBarangay}
              onSelectBarangay={handleSelectBarangay}
            />
          )}

          {/* Tab 3: Policy Briefs View */}
          {activeTab === 'briefs' && (
            <PolicyBriefsView
              barangays={barangays}
              selectedBarangay={selectedBarangay}
              onSelectBarangay={handleSelectBarangay}
              onOpenSimulation={() => setActiveTab('simulation')}
            />
          )}
        </main>
      </div>

      {/* Pop-up Modals for Quick Actions */}
      {showSimulation && (
        <SimulationModal
          barangay={selectedBarangay}
          onClose={() => setShowSimulation(false)}
        />
      )}

      {showBrief && (
        <PolicyBriefModal
          barangay={selectedBarangay}
          onClose={() => setShowBrief(false)}
        />
      )}
    </div>
  );
}
