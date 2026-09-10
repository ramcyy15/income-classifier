import React from "react";
import { X, LayoutDashboard, Sliders, FileText, UserSearch } from "lucide-react";

const PAGE_INFO = {
  dashboard: {
    Icon: LayoutDashboard,
    color: "bg-indigo-600",
    title: "Overview",
    tagline: "Your birds-eye view of District V.",
    bullets: [
      {
        heading: "What is this page?",
        body: "This is the main dashboard. It shows a summary of all 14 barangays in Quezon City District V — their population, income levels, and how they compare to each other.",
      },
      {
        heading: "The Map",
        body: "Each colored dot on the map is a barangay. Red means the area needs urgent help (low income), Yellow means it is in the middle, and Green means families there are doing well.",
      },
      {
        heading: "The Roster (left list)",
        body: "Barangays are sorted from most vulnerable (#1 priority) to most stable. Click any row to load its details on the right.",
      },
      {
        heading: "The Detail Card (right)",
        body: "Shows the selected barangay population, average monthly income, income class breakdown, and the top factors the AI used to make its predictions.",
      },
    ],
  },
  simulation: {
    Icon: Sliders,
    color: "bg-violet-600",
    title: "Intervention Simulator",
    tagline: "See what would happen if things changed.",
    bullets: [
      {
        heading: "What is this page?",
        body: "This is a what-if tool. You can change certain conditions in a barangay — like reducing the number of children at home or increasing income — and instantly see how that might shift families between income classes.",
      },
      {
        heading: "Why is this useful?",
        body: "Local government officials can use this to plan programs. For example: if we help 20 more families join 4Ps, how many will move from Low to Middle income? You can test that here.",
      },
      {
        heading: "How to use it",
        body: "Select a barangay, adjust the sliders to reflect a planned change, then click Simulate. The results show how many families are expected to change income level.",
      },
    ],
  },
  briefs: {
    Icon: FileText,
    color: "bg-emerald-600",
    title: "Policy Briefs",
    tagline: "Ready-made reports for each barangay.",
    bullets: [
      {
        heading: "What is this page?",
        body: "This page has an automatically generated report for every barangay. Each report explains the current income situation, which families are most at risk, and what programs could help.",
      },
      {
        heading: "Who is this for?",
        body: "These briefs are written for barangay officials, city planners, and social workers — people who need a quick, clear summary without digging through raw data.",
      },
      {
        heading: "What is inside each brief?",
        body: "You will find the income class breakdown, the top reasons families are in their current income level (from the AI model), and specific actionable recommendations such as prioritizing 4Ps enrollment for families with 3 or more children.",
      },
    ],
  },
  classifier: {
    Icon: UserSearch,
    color: "bg-indigo-600",
    title: "Individual Family Classifier",
    tagline: "Socio-economic classification for a single household.",
    bullets: [
      {
        heading: "What is this tool?",
        body: "Enter a household's monthly income, family size, dependent count, school attendance, and 4Ps status to classify them into SWDI Level 1 (Survival), Level 2 (Subsistence), or Level 3 (Self-Sufficient).",
      },
      {
        heading: "Model Confidence & Visuals",
        body: "See the ensemble model's confidence distribution across all 3 tiers and a decision driver chart detailing what influenced the prediction most.",
      },
      {
        heading: "Actionable Recommendations",
        body: "Includes immediate program recommendations (4Ps, Educational grants, SLP, TESDA) and an AI evaluation tailored to the family's profile.",
      },
    ],
  },
};

export default function NavInfoModal({ pageId, onClose }) {
  const info = PAGE_INFO[pageId];
  if (!info) return null;
  const { Icon, color, title, tagline, bullets } = info;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Colored header */}
        <div className={`${color} px-6 py-5`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-white leading-tight">{title}</h2>
                <p className="text-white/70 text-xs font-medium mt-0.5">{tagline}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bullet sections */}
        <div className="px-6 py-5 space-y-4">
          {bullets.map((b, i) => (
            <div key={i}>
              <p className="text-xs font-bold text-slate-900 mb-1">{b.heading}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{b.body}</p>
              {i < bullets.length - 1 && (
                <div className="border-b border-slate-100 mt-4" />
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5">
          <button
            onClick={onClose}
            className={`w-full py-2.5 ${color} hover:opacity-90 text-white font-semibold text-sm rounded-xl transition-all cursor-pointer`}
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}