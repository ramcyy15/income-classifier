import React, { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// District V, Quezon City — barangay center coordinates
const DISTRICT_V_COORDS = {
  "Bagbag":              [14.7483, 121.0416],
  "Capri":               [14.7289, 121.0428],
  "Fairview":            [14.7418, 121.0507],
  "Greater Lagro":       [14.7527, 121.0583],
  "Gulod":               [14.7312, 121.0536],
  "Kaligayahan":         [14.7612, 121.0391],
  "Nagkaisang Nayon":    [14.7344, 121.0479],
  "North Fairview":      [14.7489, 121.0536],
  "Novaliches Proper":   [14.7270, 121.0395],
  "Pasong Putik Proper": [14.7193, 121.0486],
  "San Agustin":         [14.7394, 121.0367],
  "San Bartolome":       [14.7231, 121.0449],
  "Santa Lucia":         [14.7362, 121.0620],
  "Santa Monica":        [14.7512, 121.0464],
};

const TIER_COLORS = {
  Low:    { fill: "#EF4444", ring: "#FCA5A5", label: "Level 1 · Low-Income"    },
  Middle: { fill: "#F59E0B", ring: "#FDE68A", label: "Level 2 · Middle-Income" },
  High:   { fill: "#10B981", ring: "#6EE7B7", label: "Level 3 · High-Income"   },
};

const DISTRICT_V_CENTER = [14.7380, 121.0490];

// Smoothly fly/zoom to the classified barangay whenever it changes
function FlyTo({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.flyTo(coords, 16, { duration: 1.3 });
    } else {
      map.flyTo(DISTRICT_V_CENTER, 13, { duration: 1.0 });
    }
  }, [coords, map]);
  return null;
}

export default function GeoMap({ barangay, tier }) {
  const coords = DISTRICT_V_COORDS[barangay] || null;
  const tierMeta = TIER_COLORS[tier] || TIER_COLORS["Middle"];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-800">Barangay Location</p>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">
            {coords
              ? `${barangay}, District V · Quezon City`
              : "Select a specific barangay to pin its location"}
          </p>
        </div>
        {coords && (
          <span
            className="text-[10px] font-bold px-2.5 py-1 rounded-full border"
            style={{
              color: tierMeta.fill,
              backgroundColor: tierMeta.ring + "55",
              borderColor: tierMeta.ring,
            }}
          >
            {tierMeta.label}
          </span>
        )}
      </div>

      {/* Map */}
      <div style={{ height: 280 }}>
        <MapContainer
          center={coords || DISTRICT_V_CENTER}
          zoom={coords ? 16 : 13}
          style={{ height: "100%", width: "100%" }}
          zoomControl={true}
          scrollWheelZoom={false}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          <FlyTo coords={coords} />

          {coords ? (
            <>
              {/* Outer pulse ring */}
              <CircleMarker
                center={coords}
                radius={22}
                pathOptions={{
                  fillColor: tierMeta.fill,
                  color: tierMeta.fill,
                  weight: 1.5,
                  fillOpacity: 0.12,
                  opacity: 0.4,
                }}
              />
              {/* Inner solid dot with popup */}
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
                  <div style={{ fontFamily: "sans-serif", fontSize: 12, minWidth: 130 }}>
                    <strong style={{ color: tierMeta.fill, fontSize: 13 }}>{barangay}</strong>
                    <div style={{ color: "#64748B", marginTop: 3 }}>{tierMeta.label}</div>
                    <div style={{ color: "#94A3B8", fontSize: 10, marginTop: 2 }}>
                      District V · Quezon City
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            </>
          ) : (
            /* Fallback dot for "Other / Custom Community" */
            <CircleMarker
              center={DISTRICT_V_CENTER}
              radius={14}
              pathOptions={{
                fillColor: "#94A3B8",
                color: "#CBD5E1",
                weight: 2,
                fillOpacity: 0.3,
                opacity: 0.6,
              }}
            >
              <Popup>
                <div style={{ fontFamily: "sans-serif", fontSize: 12 }}>
                  <strong>District V</strong>
                  <div style={{ color: "#94A3B8", fontSize: 10 }}>Quezon City</div>
                </div>
              </Popup>
            </CircleMarker>
          )}
        </MapContainer>
      </div>

      {/* Footer */}
      <div className="px-5 py-2.5 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[9px] text-slate-400">© OpenStreetMap contributors</span>
        <span className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
          <span
            className="w-2.5 h-2.5 rounded-full inline-block"
            style={{ backgroundColor: coords ? tierMeta.fill : "#94A3B8" }}
          />
          {coords ? `${barangay} · ${tierMeta.label}` : "District V · Quezon City"}
        </span>
      </div>
    </div>
  );
}
