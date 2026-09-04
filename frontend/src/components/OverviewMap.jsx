import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export default function OverviewMap({ barangays, selectedBarangay, onSelectBarangay }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});

  const defaultCenter = [14.712, 121.045];

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Free public OpenStreetMap tile layer (zero API key required)
      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 12.5,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Add Locality Markers for each barangay
    barangays.forEach((b) => {
      if (!b.lat || !b.lng) return;

      const isSelected = selectedBarangay?.name === b.name;
      const color = b.community_class === 'priority' ? '#EF4444' : b.community_class === 'developing' ? '#F59E0B' : '#10B981';
      
      const customIcon = L.divIcon({
        className: 'custom-brgy-pin',
        html: `
          <div class="relative flex items-center justify-center cursor-pointer transition-transform duration-200 hover:scale-125">
            <span class="absolute w-5 h-5 rounded-full animate-ping opacity-30" style="background-color: ${color}"></span>
            <div class="w-6 h-6 rounded-full flex items-center justify-center text-white font-black text-[9px] shadow-md border border-white ${isSelected ? 'ring-4 ring-indigo-500/30 scale-125' : ''}" style="background-color: ${color}">
              ${b.rank}
            </div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      if (markersRef.current[b.name]) {
        markersRef.current[b.name].setIcon(customIcon);
      } else {
        const marker = L.marker([b.lat, b.lng], { icon: customIcon })
          .addTo(map)
          .on('click', () => onSelectBarangay(b));

        marker.bindTooltip(`
          <div class="px-2 py-1 font-sans">
            <p class="font-bold text-xs text-slate-900">${b.name}</p>
            <p class="text-[10px] font-semibold text-slate-500">Rank #${b.rank} · ${b.community_label}</p>
          </div>
        `, { direction: 'top', offset: [0, -8] });

        markersRef.current[b.name] = marker;
      }
    });

  }, [barangays, selectedBarangay]);

  // Center on selected barangay
  useEffect(() => {
    if (selectedBarangay?.lat && selectedBarangay?.lng && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([selectedBarangay.lat, selectedBarangay.lng], 13.5, {
        duration: 1.0,
      });
    }
  }, [selectedBarangay]);

  return (
    <div className="relative w-full h-full min-h-[300px] bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Floating Header Badge */}
      <div className="absolute top-3 left-3 z-[400] flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-sm text-xs font-bold text-slate-800">
        <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
        <span>District V Map</span>
      </div>

      {/* Clean Legend */}
      <div className="absolute bottom-3 left-3 z-[400] bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200/80 shadow-sm text-[11px] flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500"></span>
          <span className="text-slate-700 font-semibold">Priority</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          <span className="text-slate-700 font-semibold">Transition</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="text-slate-700 font-semibold">Stable</span>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-3 right-3 z-[400] flex flex-col gap-1 bg-white/95 backdrop-blur-md p-1 rounded-xl border border-slate-200/80 shadow-sm">
        <button
          onClick={() => mapInstanceRef.current?.zoomIn()}
          className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 rounded-lg text-slate-600 cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => mapInstanceRef.current?.zoomOut()}
          className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 rounded-lg text-slate-600 cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => mapInstanceRef.current?.setView(defaultCenter, 12.5)}
          className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 rounded-lg text-slate-600 cursor-pointer"
          title="Reset"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
