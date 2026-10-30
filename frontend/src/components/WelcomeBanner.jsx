import React, { useState } from "react";
import { X, UploadCloud } from "lucide-react";
import PhotoBanner from "./PhotoBanner";
import { PHOTOS } from "../constants/photos";

const STORAGE_KEY = "qc5_welcome_hidden";

export default function WelcomeBanner({ onUpload }) {
  const [hidden, setHidden] = useState(() => localStorage.getItem(STORAGE_KEY) === "1");

  if (hidden) {
    return (
      <button
        onClick={() => {
          localStorage.removeItem(STORAGE_KEY);
          setHidden(false);
        }}
        className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
      >
        Show the welcome guide
      </button>
    );
  }

  return (
    <PhotoBanner photo={PHOTOS.welcome}>
      <div className="p-6 sm:p-7 pb-8 min-h-[200px] flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-md self-center">
          <p className="text-[11px] font-semibold text-sky-200">District V · Quezon City</p>
          <h2 className="text-2xl font-bold tracking-tight text-white mt-1">
            Find the barangays that need help most
          </h2>
          <p className="text-[12px] text-white/85 mt-2">Enter a barangay's details to see its income level and program ideas.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onUpload}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-[#104281] text-xs font-bold shadow-md hover:bg-sky-50 active:scale-95 transition cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            Upload a file
          </button>
        </div>
      </div>

      <button
        onClick={() => {
          localStorage.setItem(STORAGE_KEY, "1");
          setHidden(true);
        }}
        aria-label="Hide welcome guide"
        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/25 hover:bg-black/40 text-white flex items-center justify-center cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </PhotoBanner>
  );
}
