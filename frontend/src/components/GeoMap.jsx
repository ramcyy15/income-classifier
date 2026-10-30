import React, { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import { Landmark, Navigation } from "lucide-react";
import districtGeo from "../data/districtV.geo.json";
import { levelOf } from "../constants/levels";
import "leaflet/dist/leaflet.css";

// Verified District V Quezon City Barangay Halls: exact coordinates & addresses
const DISTRICT_V_HALLS = {
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

const DISTRICT_V_CENTER = [14.7225, 121.048];

function FitTo({ feature, coords }) {
  const map = useMap();
  useEffect(() => {
    if (feature) map.flyToBounds(L.geoJSON(feature).getBounds(), { padding: [24, 24], duration: 0.8 });
    else if (coords) map.flyTo(coords, 15, { duration: 0.8 });
    else map.flyTo(DISTRICT_V_CENTER, 13, { duration: 0.8 });
  }, [feature, coords, map]);
  return null;
}

export default function GeoMap({ barangay, tier }) {
  const hall = DISTRICT_V_HALLS[barangay] || null;
  const level = tier ? levelOf(tier) : null;
  const feature = districtGeo.features.find((f) => f.properties.barangay === barangay) || null;

  return (
    <div className="neu-surface rounded-3xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl neu-inset-sm flex items-center justify-center text-slate-600 shrink-0">
            <Landmark className="w-4 h-4" />
          </div>
          <p className="text-[13px] font-semibold text-slate-800 truncate">
            {barangay ? `Barangay ${barangay}` : "District V"}
          </p>
        </div>
        {level && (
          <span className={`text-[10.5px] font-semibold px-2.5 py-1 rounded-full border shrink-0 ${level.badge}`}>
            {level.short} · {level.name}
          </span>
        )}
      </div>

      {/* Map */}
      <div className="h-[240px] mx-3 rounded-2xl overflow-hidden bg-slate-100">
        <MapContainer
          center={hall?.coords || DISTRICT_V_CENTER}
          zoom={14}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={false}
          attributionControl={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            className="dv-basemap"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {feature && (
            <GeoJSON
              key={barangay}
              data={feature}
              style={{
                fillColor: level?.fill || "#94a3b8",
                fillOpacity: 0.35,
                color: level?.fill || "#64748b",
                weight: 2,
              }}
            />
          )}
          {hall && (
            <CircleMarker
              center={hall.coords}
              radius={7}
              pathOptions={{ fillColor: level?.fill || "#475569", fillOpacity: 1, color: "#ffffff", weight: 2.5 }}
            />
          )}
          <FitTo feature={feature} coords={hall?.coords} />
        </MapContainer>
      </div>

      {/* Hall address */}
      {hall ? (
        <div className="px-5 py-3.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11.5px] font-semibold text-slate-800 truncate">{hall.hallName}</p>
            <p className="text-[10.5px] text-slate-500 truncate">{hall.address}</p>
          </div>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${hall.hallName}, Quezon City`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl neu-btn text-[11px] font-semibold text-slate-700 shrink-0"
          >
            <Navigation className="w-3 h-3" />
            Directions
          </a>
        </div>
      ) : (
        <p className="px-5 py-3.5 text-[11px] text-slate-500">Pick a District V barangay to see its location.</p>
      )}
    </div>
  );
}
