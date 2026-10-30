// Shared income-level metadata for the District Map, ranking, and SHAP views.
//
// Map fills are a one-hue ordinal ramp (darker = higher need), validated with the
// dataviz skill's validator (`--ordinal`, surface #EEF2F6): monotone lightness,
// adjacent ΔL >= 0.06, light end 2.23:1. Red/amber/green was rejected for the map
// because red↔green collapses under deuteranopia (ΔE 4.1), and on a choropleth any
// two barangays can sit side by side. Labels inside fills: white on the two darker
// steps, near-black on the lightest (APCA |Lc| >= 54).

export const DISTRICT_V_BARANGAYS = [
  "Bagbag", "Capri", "Fairview", "Greater Lagro", "Gulod", "Kaligayahan",
  "Nagkaisang Nayon", "North Fairview", "Novaliches Proper",
  "Pasong Putik Proper", "San Agustin", "San Bartolome",
  "Santa Lucia", "Santa Monica",
];

// One level palette for the whole app. Tailwind class strings are written out in full
// so Tailwind's scanner picks them up.
export const LEVELS = {
  Low: {
    num: 1,
    short: "Level 1",
    name: "Low Income",
    meaning: "Needs most help",
    need: "Needs most help",
    description: "Many families struggle with basic needs. Prioritize for aid.",
    programs: "4Ps cash aid, emergency assistance",
    fill: "#104281",
    ink: "#ffffff",
    text: "text-[#104281]",
    dot: "bg-[#104281]",
    badge: "bg-[#104281] text-white border-[#104281]",
    soft: "bg-[#104281]/10 border-[#104281]/30",
  },
  Middle: {
    num: 2,
    short: "Level 2",
    name: "Middle Income",
    meaning: "Needs some help",
    need: "Needs some help",
    description: "Basic needs are met, but families can easily fall back.",
    programs: "Livelihood and skills training",
    fill: "#2a78d6",
    ink: "#ffffff",
    text: "text-[#1c5cab]",
    dot: "bg-[#2a78d6]",
    badge: "bg-[#2a78d6] text-white border-[#2a78d6]",
    soft: "bg-[#2a78d6]/10 border-[#2a78d6]/30",
  },
  High: {
    num: 3,
    short: "Level 3",
    name: "Higher Income",
    meaning: "Doing well",
    need: "Doing well",
    description: "Most families have steady income and stable homes.",
    programs: "Small business support, scholarships",
    fill: "#6da7ec",
    ink: "#0b0b0b",
    text: "text-[#256abf]",
    dot: "bg-[#6da7ec]",
    badge: "bg-[#6da7ec] text-[#0b0b0b] border-[#6da7ec]",
    soft: "bg-[#6da7ec]/15 border-[#6da7ec]/40",
  },
};

export const levelOf = (cls) => LEVELS[cls] || LEVELS.Middle;

export const LEVEL_ORDER = ["Low", "Middle", "High"];

export const UNCLASSIFIED = {
  short: "Not checked",
  fill: "#D5DBE3",
  ink: "#475569",
};

// Diverging poles for SHAP bars (validated: CVD ΔE 24.7, normal-vision ΔE 33.6).
// Orange sits at 2.84:1 on the surface, so every bar also carries a printed value.
export const SHAP_COLORS = {
  supports: "#2a78d6",
  against: "#eb6834",
};
