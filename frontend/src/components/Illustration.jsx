import React from "react";

// Original flat illustrations in the app's level palette (#104281 / #2a78d6 / #6da7ec).
// Decorative only: always paired with a text heading, so they are hidden from screen readers.

const NAVY = "#104281";
const BLUE = "#2a78d6";
const SKY = "#6da7ec";
const MIST = "#dbe7f6";
const INK = "#0d366b";

function Community() {
  // Three homes of different sizes = the three income levels, on one street.
  return (
    <svg viewBox="0 0 240 150" fill="none">
      <circle cx="196" cy="34" r="16" fill="#fde68a" />
      <ellipse cx="120" cy="134" rx="112" ry="10" fill={MIST} />
      {/* Level 1: small house */}
      <path d="M22 132V100l24-18 24 18v32z" fill={NAVY} />
      <path d="M16 102l30-24 30 24" stroke={INK} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="38" y="110" width="15" height="22" rx="2" fill="#fff" opacity=".9" />
      {/* Level 2: medium house */}
      <path d="M84 132V88l32-24 32 24v44z" fill={BLUE} />
      <path d="M77 91l39-31 39 31" stroke={NAVY} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="95" y="98" width="13" height="13" rx="2" fill="#fff" opacity=".9" />
      <rect x="124" y="98" width="13" height="13" rx="2" fill="#fff" opacity=".9" />
      <rect x="109" y="114" width="14" height="18" rx="2" fill="#fff" opacity=".9" />
      {/* Level 3: two-storey house */}
      <path d="M160 132V72l30-20 30 20v60z" fill={SKY} />
      <path d="M154 75l36-26 36 26" stroke={BLUE} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="170" y="82" width="12" height="12" rx="2" fill="#fff" />
      <rect x="198" y="82" width="12" height="12" rx="2" fill="#fff" />
      <rect x="170" y="102" width="12" height="12" rx="2" fill="#fff" />
      <rect x="198" y="102" width="12" height="12" rx="2" fill="#fff" />
      <rect x="183" y="116" width="14" height="16" rx="2" fill={NAVY} opacity=".85" />
    </svg>
  );
}

function SavedList() {
  // A clipboard of results with level-colored rows.
  return (
    <svg viewBox="0 0 240 150" fill="none">
      <ellipse cx="120" cy="136" rx="80" ry="8" fill={MIST} />
      <rect x="70" y="18" width="100" height="116" rx="10" fill="#fff" stroke={MIST} strokeWidth="3" />
      <rect x="98" y="10" width="44" height="16" rx="6" fill={BLUE} />
      {[
        [44, NAVY, 52],
        [66, BLUE, 40],
        [88, SKY, 58],
        [110, MIST, 34],
      ].map(([y, c, w]) => (
        <g key={y}>
          <rect x="84" y={y} width="12" height="12" rx="3" fill={c} />
          <rect x="102" y={y + 3} width={w} height="6" rx="3" fill={MIST} />
        </g>
      ))}
      <circle cx="176" cy="110" r="20" fill={NAVY} />
      <path d="M167 110l6 6 12-12" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MapPin() {
  // A folded district map with a pin.
  return (
    <svg viewBox="0 0 240 150" fill="none">
      <ellipse cx="120" cy="138" rx="90" ry="8" fill={MIST} />
      <path d="M40 40l50-14 60 14 50-14v100l-50 14-60-14-50 14z" fill="#fff" stroke={MIST} strokeWidth="3" strokeLinejoin="round" />
      <path d="M90 26v100M150 40v100" stroke={MIST} strokeWidth="3" />
      <path d="M52 92l22-20 18 12 16-24 20 14" stroke={SKY} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="160" y="60" width="28" height="20" rx="4" fill={SKY} />
      <rect x="100" y="94" width="34" height="24" rx="4" fill={BLUE} />
      <rect x="54" y="104" width="26" height="18" rx="4" fill={NAVY} />
      <path d="M150 18c-13 0-22 9-22 21 0 16 22 37 22 37s22-21 22-37c0-12-9-21-22-21z" fill={NAVY} />
      <circle cx="150" cy="39" r="8" fill="#fff" />
    </svg>
  );
}

const SCENES = { community: Community, saved: SavedList, map: MapPin };

export default function Illustration({ name, className = "w-48" }) {
  const Scene = SCENES[name];
  if (!Scene) return null;
  return (
    <div className={className} aria-hidden="true">
      <Scene />
    </div>
  );
}
