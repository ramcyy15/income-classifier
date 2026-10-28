import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { Landmark, Navigation, MapPin, Layers } from "lucide-react";
import "leaflet/dist/leaflet.css";

// Verified District V Quezon City Barangay Halls: exact coordinates & addresses
export const DISTRICT_V_HALLS = {
  "Bagbag": {
    coords: [14.6967, 121.0304],
    hallName: "Bagbag Barangay Hall",
    address: "625 Parokya ng Pagkabuhay Road, Novaliches",
    zip: "1116",
  },
  "Capri": {
    coords: [14.7173, 121.0286],
    hallName: "Capri Barangay Hall",
    address: "Sampaguita St. cor. Narra St., Area 5, Novaliches",
    zip: "1117",
  },
  "Fairview": {
    coords: [14.6998, 121.0639],
    hallName: "Fairview Barangay Hall",
    address: "Barangay Complex, 9-A Dahlia Avenue",
    zip: "1118",
  },
  "Greater Lagro": {
    coords: [14.7265, 121.0660],
    hallName: "Greater Lagro Barangay Hall",
    address: "Blk 47 Lot 1, Ascension Avenue, Lagro Subd.",
    zip: "1118",
  },
  "Gulod": {
    coords: [14.7120, 121.0387],
    hallName: "Gulod Barangay Hall",
    address: "Villaflor Village, Quirino Highway, Novaliches",
    zip: "1117",
  },
  "Kaligayahan": {
    coords: [14.7358, 121.0506],
    hallName: "Kaligayahan Barangay Hall",
    address: "Mockingbird St., Zabarte Subdivision, Novaliches",
    zip: "1124",
  },
  "Nagkaisang Nayon": {
    coords: [14.7192, 121.0285],
    hallName: "Nagkaisang Nayon Barangay Hall",
    address: "Banahaw St., Amparo Subdivision, Novaliches",
    zip: "1125",
  },
  "North Fairview": {
    coords: [14.7225, 121.0629],
    hallName: "North Fairview Barangay Hall",
    address: "Brookside St. cor. Bromley St., Fairville Homes",
    zip: "1121",
  },
  "Novaliches Proper": {
    coords: [14.7209, 121.0391],
    hallName: "Novaliches Proper Barangay Hall",
    address: "Quirino Highway cor. Sarmiento St., Novaliches",
    zip: "1121",
  },
  "Pasong Putik Proper": {
    coords: [14.7286, 121.0559],
    hallName: "Pasong Putik Proper Barangay Hall",
    address: "Bishop Ave. cor. Belfast Ave., Novaliches",
    zip: "1118",
  },
  "San Agustin": {
    coords: [14.7282, 121.0377],
    hallName: "San Agustin Barangay Hall",
    address: "Patnubay St. cor. Katarungan St., St. Francis Subd.",
    zip: "1117",
  },
  "San Bartolome": {
    coords: [14.7006, 121.0344],
    hallName: "San Bartolome Barangay Hall",
    address: "P. Dela Cruz St. cor. Quirino Hwy, Novaliches",
    zip: "1116",
  },
  "Santa Lucia": {
    coords: [14.7044, 121.0494],
    hallName: "Santa Lucia Barangay Hall",
    address: "J.P. Rizal Street, Santa Lucia, Novaliches",
    zip: "1117",
  },
  "Santa Monica": {
    coords: [14.7252, 121.0434],
    hallName: "Santa Monica Barangay Hall",
    address: "Moises St., Jordan Plaines Subd., Novaliches",
    zip: "1117",
  },
};

const TIER_COLORS = {
  Low: {
    fill: "#EF4444",
    ring: "#FCA5A5",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    label: "Level 1 · Low-Income",
  },
  Middle: {
    fill: "#F59E0B",
    ring: "#FDE68A",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    label: "Level 2 · Middle-Income",
  },
  High: {
    fill: "#10B981",
    ring: "#6EE7B7",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    label: "Level 3 · High-Income",
  },
};

const DISTRICT_V_CENTER = [14.7225, 121.0480];

function FlyTo({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.flyTo(coords, 16, { duration: 1.2 });
    } else {
      map.flyTo(DISTRICT_V_CENTER, 13, { duration: 1.0 });
    }
  }, [coords, map]);
  return null;
}

export default function GeoMap({ barangay, tier }) {
  const hallInfo = DISTRICT_V_HALLS[barangay] || null;
  const coords = hallInfo ? hallInfo.coords : null;
  const tierMeta = TIER_COLORS[tier] || TIER_COLORS["Middle"];
  const [mapLayer, setMapLayer] = useState("osm"); // osm or carto

  const tileUrl =
    mapLayer === "carto"
      ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  return (
    <div className="neu-surface rounded-3xl overflow-hidden border border-white/80">
      {/* ── Modern Neumorphic Map Header ── */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-slate-200/60 bg-[#EEF2F6]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl neu-inset-sm flex items-center justify-center text-indigo-600">
            <Landmark className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                Barangay Hall Location
              </h3>
            </div>
            <p className="text-[10.5px] text-slate-500 font-medium mt-0.5">
              {hallInfo
                ? `${hallInfo.hallName} · District V, Quezon City`
                : "Select a District V barangay to pin its official hall"}
            </p>
          </div>
        </div>

        {/* Right Controls: Tier Badge */}
        <div className="flex items-center gap-2">
          {coords && (
            <span
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${tierMeta.badge}`}
            >
              {tierMeta.label}
            </span>
          )}
        </div>
      </div>

      {/* ── Map Container ── */}
      <div style={{ height: 300 }} className="relative bg-slate-100">
        <MapContainer
          center={coords || DISTRICT_V_CENTER}
          zoom={coords ? 16 : 13}
          style={{ height: "100%", width: "100%" }}
          zoomControl={true}
          scrollWheelZoom={false}
          attributionControl={false}
        >
          <TileLayer url={tileUrl} />

          <FlyTo coords={coords} />

          {coords ? (
            <>
              {/* Outer soft radar pulse ring */}
              <CircleMarker
                center={coords}
                radius={24}
                pathOptions={{
                  fillColor: tierMeta.fill,
                  color: tierMeta.fill,
                  weight: 1.5,
                  fillOpacity: 0.15,
                  opacity: 0.5,
                }}
              />

              {/* Inner crisp pinpoint marker */}
              <CircleMarker
                center={coords}
                radius={10}
                pathOptions={{
                  fillColor: tierMeta.fill,
                  color: "#ffffff",
                  weight: 2.5,
                  fillOpacity: 1,
                  opacity: 1,
                }}
              >
                <Popup>
                  <div className="p-1 space-y-1.5" style={{ minWidth: 170 }}>
                    <div className="flex items-center gap-1.5 text-indigo-700 font-bold text-xs border-b pb-1 border-slate-200">
                      <Landmark className="w-3.5 h-3.5" />
                      <span>{hallInfo.hallName}</span>
                    </div>
                    <div className="text-[11px] text-slate-700 leading-tight">
                      {hallInfo.address}
                    </div>
                    <div className="text-[9.5px] font-mono text-slate-400">
                      Zip: {hallInfo.zip} · District V, QC
                    </div>
                    <div
                      className="text-[10px] font-bold inline-block px-1.5 py-0.5 rounded border mt-1"
                      style={{
                        color: tierMeta.fill,
                        backgroundColor: tierMeta.ring + "44",
                        borderColor: tierMeta.ring,
                      }}
                    >
                      {tierMeta.label}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            </>
          ) : (
            /* Fallback center marker */
            <CircleMarker
              center={DISTRICT_V_CENTER}
              radius={12}
              pathOptions={{
                fillColor: "#6366F1",
                color: "#FFFFFF",
                weight: 2,
                fillOpacity: 0.8,
              }}
            >
              <Popup>
                <div className="text-xs font-bold text-slate-800">
                  Quezon City District V
                </div>
              </Popup>
            </CircleMarker>
          )}
        </MapContainer>

        {/* Floating Quick Address Banner */}
        {hallInfo && (
          <div className="absolute bottom-3 left-3 right-3 z-[400] neu-surface-sm p-3 rounded-2xl border border-white/90 shadow-md backdrop-blur-md flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-6 h-6 rounded-lg neu-inset-sm flex items-center justify-center text-indigo-600 flex-shrink-0">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <div className="truncate">
                <p className="font-bold text-slate-900 truncate text-[11.5px]">
                  {hallInfo.hallName}
                </p>
                <p className="text-[10px] text-slate-500 font-normal truncate">
                  {hallInfo.address}
                </p>
              </div>
            </div>

            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                `${hallInfo.hallName}, Quezon City`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl neu-btn text-[10px] font-bold text-indigo-700 flex-shrink-0 hover:text-indigo-900 cursor-pointer"
            >
              <span>View Map</span>
              <Navigation className="w-2.5 h-2.5" />
            </a>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="px-5 py-2.5 border-t border-slate-200/60 bg-[#EEF2F6] flex items-center justify-between">
        <span className="text-[9.5px] font-mono text-slate-400">
          Quezon City District V GIS Registry
        </span>
        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600">
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ backgroundColor: coords ? tierMeta.fill : "#94A3B8" }}
          />
          <span>{barangay ? `Barangay ${barangay}` : "District V"}</span>
        </div>
      </div>
    </div>
  );
}
