import React, { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Download, UploadCloud, ListOrdered } from "lucide-react";
import districtGeo from "../data/districtV.geo.json";
import { LEVELS, LEVEL_ORDER, UNCLASSIFIED, DISTRICT_V_BARANGAYS } from "../constants/levels";
import { getClassificationHistory } from "../utils/historyStore";
import { buildDistrictRanking, rankingToCSV } from "../utils/districtRanking";
import ShapExplanation from "./ShapExplanation";
import Illustration from "./Illustration";
import PhotoBanner from "./PhotoBanner";
import { PHOTOS } from "../constants/photos";

const fmtDate = (ts) =>
  ts ? new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";

function useHistory() {
  const [history, setHistory] = useState(() => getClassificationHistory());
  useEffect(() => {
    const refresh = () => setHistory(getClassificationHistory());
    window.addEventListener("qc5_history_updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("qc5_history_updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return history;
}

function LevelSwatch({ level, size = "w-3 h-3" }) {
  const meta = LEVELS[level] || UNCLASSIFIED;
  return <span className={`${size} rounded-[3px] flex-shrink-0`} style={{ background: meta.fill }} />;
}

/* ── Choropleth ──────────────────────────────────────────────────────────── */
function DistrictChoropleth({ byBarangay, hovered, selected, onHover, onSelect }) {
  const layerRef = useRef(null);
  const bounds = useMemo(() => L.geoJSON(districtGeo).getBounds(), []);
  // Re-mount the GeoJSON layer when classifications change so permanent labels refresh.
  const dataKey = DISTRICT_V_BARANGAYS.map((b) => byBarangay[b]?.level || "-").join("|");

  const styleFor = (name) => {
    const row = byBarangay[name];
    const fill = row ? LEVELS[row.level].fill : UNCLASSIFIED.fill;
    const isSel = name === selected;
    const isHov = name === hovered;
    return {
      fillColor: fill,
      fillOpacity: isHov || isSel ? 1 : 0.88,
      color: isSel ? "#0f172a" : "#EEF2F6", // 2px surface gap between polygons
      weight: isSel ? 3 : isHov ? 3 : 2,
    };
  };

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.eachLayer((l) => {
      const name = l.feature.properties.barangay;
      l.setStyle(styleFor(name));
      if (name === selected || name === hovered) l.bringToFront();
    });
  });

  const onEachFeature = (feature, layer) => {
    const name = feature.properties.barangay;
    const row = byBarangay[name];
    const meta = row ? LEVELS[row.level] : UNCLASSIFIED;
    layer.bindTooltip(row ? String(meta.num) : "–", {
      permanent: true,
      direction: "center",
      className: "dv-label",
      opacity: 1,
    });
    layer.on("add", () => {
      const el = layer.getTooltip()?.getElement();
      if (el) el.style.color = meta.ink;
    });
    layer.on({
      mouseover: () => onHover(name),
      mouseout: () => onHover(null),
      click: () => onSelect(name),
    });
  };

  const hovRow = hovered ? byBarangay[hovered] : null;

  return (
    <div className="relative h-[460px] rounded-2xl overflow-hidden bg-slate-100">
      <MapContainer
        bounds={bounds}
        boundsOptions={{ padding: [16, 16] }}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
        attributionControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="dv-basemap"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · Boundaries: PSGC via philippines-json-maps (MIT)'
        />
        <GeoJSON
          key={dataKey}
          ref={layerRef}
          data={districtGeo}
          style={(f) => styleFor(f.properties.barangay)}
          onEachFeature={onEachFeature}
        />
      </MapContainer>

      {/* Hover readout (React-rendered, no HTML strings) */}
      <div className="absolute top-3 right-3 z-[400] pointer-events-none">
        {hovered ? (
          <div className="neu-surface-sm rounded-2xl px-3 py-2 min-w-[190px] shadow-md">
            <p className="text-[12px] font-bold text-slate-900">{hovered}</p>
            {hovRow ? (
              <>
                <p className="flex items-center gap-1.5 text-[10.5px] font-semibold text-slate-700 mt-0.5">
                  <LevelSwatch level={hovRow.level} size="w-2.5 h-2.5" />
                  {LEVELS[hovRow.level].short} · {LEVELS[hovRow.level].meaning}
                </p>
                <p className="text-[10px] text-slate-500 mt-1 tabular-nums">
                  #{hovRow.rank} in need · {(hovRow.pLevel1 * 100).toFixed(0)}% chance of Level 1
                </p>
                <p className="text-[9.5px] text-slate-400">Checked {fmtDate(hovRow.timestamp)}</p>
              </>
            ) : (
              <p className="text-[10.5px] text-slate-500 mt-0.5">Not checked yet</p>
            )}
          </div>
        ) : (
          <div className="neu-surface-sm rounded-2xl py-2 px-3 shadow-sm">
            <p className="text-[10.5px] font-medium text-slate-500">Tap a barangay</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-7 right-3 z-[400] neu-surface-sm rounded-2xl px-3 py-2.5 space-y-1.5 shadow-sm">
        <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500">Income level</p>
        {LEVEL_ORDER.map((lvl) => (
          <p key={lvl} className="flex items-center gap-2 text-[10.5px] font-medium text-slate-700">
            <LevelSwatch level={lvl} />
            <span className="font-semibold">{LEVELS[lvl].num}</span>
            {LEVELS[lvl].short} · {LEVELS[lvl].need}
          </p>
        ))}
        <p className="flex items-center gap-2 text-[10.5px] font-medium text-slate-500">
          <LevelSwatch level={null} />
          <span className="font-semibold">–</span>
          {UNCLASSIFIED.short}
        </p>
      </div>
    </div>
  );
}

/* ── Ranking table (also the map's accessible table view) ──────────────── */
function RankingTable({ ranked, missing, hovered, selected, onHover, onSelect }) {
  return (
    <div className="overflow-y-auto max-h-[460px] -mx-1 px-1">
      <table className="w-full text-[10.5px]">
        <caption className="sr-only">District V barangays, most in need first</caption>
        <thead className="sticky top-0 bg-[#EEF2F6] z-10">
          <tr className="text-left text-slate-500 border-b border-slate-200">
            <th className="py-2 pl-1 font-semibold w-8">#</th>
            <th className="py-2 font-semibold">Barangay</th>
            <th className="py-2 font-semibold">Level</th>
            <th className="py-2 pr-1 font-semibold text-right">Level 1 chance</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {ranked.map((r) => {
            const meta = LEVELS[r.level];
            const isSel = r.barangay === selected;
            const isHov = r.barangay === hovered;
            return (
              <tr
                key={r.barangay}
                tabIndex={0}
                onClick={() => onSelect(r.barangay)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelect(r.barangay))}
                onMouseEnter={() => onHover(r.barangay)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover(r.barangay)}
                onBlur={() => onHover(null)}
                aria-selected={isSel}
                className={`border-b border-slate-100 cursor-pointer outline-none transition-colors focus-visible:bg-white ${
                  isSel ? "bg-white shadow-sm" : isHov ? "bg-white/60" : ""
                }`}
              >
                <td className="py-2 pl-1 font-bold text-slate-900">{r.rank}</td>
                <td className="py-2">
                  <p className="font-semibold text-slate-800">{r.barangay}</p>
                  {r.driver && (
                    <p className="text-[9.5px] text-slate-500 truncate max-w-[160px]" title={`Main reason: ${r.driver.feature} (${r.driver.value})`}>
                      Main reason: {r.driver.feature}
                    </p>
                  )}
                </td>
                <td className="py-2">
                  <span className="flex items-center gap-1.5 font-semibold text-slate-700 whitespace-nowrap">
                    <LevelSwatch level={r.level} size="w-2.5 h-2.5" />
                    {meta.short}
                  </span>
                </td>
                <td className="py-2 pr-1 text-right font-semibold text-slate-800">{(r.pLevel1 * 100).toFixed(0)}%</td>
              </tr>
            );
          })}
          {missing.map((b) => (
            <tr
              key={b}
              onMouseEnter={() => onHover(b)}
              onMouseLeave={() => onHover(null)}
              className="border-b border-slate-100 text-slate-400"
            >
              <td className="py-2 pl-1">–</td>
              <td className="py-2 font-medium">{b}</td>
              <td className="py-2" colSpan={2}>
                <span className="flex items-center gap-1.5">
                  <LevelSwatch level={null} size="w-2.5 h-2.5" />
                  Not checked yet
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────── */
export default function DistrictView({ onClassifyBatch }) {
  const history = useHistory();
  const { ranked, missing } = useMemo(() => buildDistrictRanking(history), [history]);
  const byBarangay = useMemo(() => Object.fromEntries(ranked.map((r) => [r.barangay, r])), [ranked]);
  const [hovered, setHovered] = useState(null);
  const [picked, setSelected] = useState(null);
  // Default to the top-priority barangay until the user picks one.
  const selected = picked && byBarangay[picked] ? picked : ranked[0]?.barangay ?? null;

  const counts = LEVEL_ORDER.map((lvl) => ({ lvl, n: ranked.filter((r) => r.level === lvl).length }));
  const sel = selected ? byBarangay[selected] : null;

  const exportCSV = () => {
    const blob = new Blob([rankingToCSV(ranked, missing)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `district_v_priority_ranking_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-6">
      {/* Header */}
      <PhotoBanner photo={PHOTOS.district} minHeight="min-h-[150px]">
        <div className="p-6 flex flex-wrap items-end justify-between gap-4 min-h-[150px]">
          <div className="space-y-2">
            <div>
              <p className="text-[11px] font-semibold text-sky-200">District V · Quezon City</p>
              <h1 className="text-2xl font-bold tracking-tight text-white">District Map</h1>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-40 h-1.5 rounded-full bg-white/25 overflow-hidden"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={14}
                aria-valuenow={ranked.length}
                aria-label="Barangays checked"
              >
                <div className="h-full bg-white rounded-full" style={{ width: `${(ranked.length / 14) * 100}%` }} />
              </div>
              <p className="text-[11px] text-white/90 font-medium">{ranked.length} of 14 barangays checked</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={onClassifyBatch}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/40 bg-[#0d366b]/50 backdrop-blur-sm text-white text-[11px] font-semibold hover:bg-white/10 transition cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              Check barangays
            </button>
            <button
              onClick={exportCSV}
              disabled={!ranked.length}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-[#104281] text-[11px] font-bold shadow-md hover:bg-sky-50 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5" />
              Download list
            </button>
          </div>
        </div>
      </PhotoBanner>

      {ranked.length === 0 ? (
        <div className="neu-surface rounded-3xl p-10 text-center space-y-3">
          <Illustration name="map" className="w-52 mx-auto" />
          <p className="text-[13px] font-semibold text-slate-800">No barangays checked yet</p>
          <p className="text-[11px] text-slate-500 max-w-md mx-auto">
            Upload a file with all 14 barangays, then press Save.
          </p>
          <button
            onClick={onClassifyBatch}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl neu-btn-primary text-[11px] font-semibold text-white"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            Upload a file
          </button>
        </div>
      ) : (
        <>
          {/* Stat tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {counts.map(({ lvl, n }) => (
              <div key={lvl} className="neu-surface rounded-2xl px-4 py-3">
                <p className="flex items-center gap-1.5 text-[10.5px] font-semibold text-slate-600">
                  <LevelSwatch level={lvl} size="w-2.5 h-2.5" />
                  {LEVELS[lvl].short} · {LEVELS[lvl].need}
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-0.5">{n}</p>
              </div>
            ))}
            <div className="neu-surface rounded-2xl px-4 py-3">
              <p className="flex items-center gap-1.5 text-[10.5px] font-semibold text-slate-500">
                <LevelSwatch level={null} size="w-2.5 h-2.5" />
                Not checked
              </p>
              <p className="text-2xl font-bold text-slate-500 mt-0.5">{missing.length}</p>
            </div>
          </div>

          {/* Map + ranking */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <div className="lg:col-span-3 neu-surface rounded-3xl p-3">
              <DistrictChoropleth
                byBarangay={byBarangay}
                hovered={hovered}
                selected={selected}
                onHover={setHovered}
                onSelect={setSelected}
              />
            </div>
            <div className="lg:col-span-2 neu-surface rounded-3xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-indigo-600" />
                <div>
                  <p className="text-[13px] font-semibold text-slate-800">Who needs help first</p>
                </div>
              </div>
              <RankingTable
                ranked={ranked}
                missing={missing}
                hovered={hovered}
                selected={selected}
                onHover={setHovered}
                onSelect={setSelected}
              />
            </div>
          </div>

          {/* Selected barangay detail */}
          {sel && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-1">
                <h2 className="text-[14px] font-bold text-slate-900">Barangay {sel.barangay}</h2>
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                  <LevelSwatch level={sel.level} size="w-2.5 h-2.5" />
                  {LEVELS[sel.level].short} · {LEVELS[sel.level].need} · #{sel.rank} in need
                </span>
                <span className="text-[10.5px] text-slate-400">Checked {fmtDate(sel.timestamp)}</span>
              </div>
              {sel.record.shap ? (
                <ShapExplanation shap={sel.record.shap} predictedClass={sel.level} />
              ) : (
                <div className="neu-surface rounded-3xl p-5 text-[11px] text-slate-500">
                  Check Barangay {sel.barangay} again to see what affected its result.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
