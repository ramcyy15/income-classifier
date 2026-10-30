import React from "react";

/**
 * Full-width photo card. By default a navy gradient keeps white text readable
 * (white on #0d366b is ~11:1); `plain` shows the photo untouched, so content
 * must sit on its own solid card. The license credit is always visible.
 */
export default function PhotoBanner({ photo, children, className = "", minHeight = "min-h-[200px]", plain = false }) {
  return (
    <div className={`relative overflow-hidden rounded-3xl shadow-[0_10px_30px_-12px_rgba(13,54,107,0.45)] ${minHeight} ${className}`}>
      <img
        src={photo.src}
        alt={photo.alt}
        className="absolute inset-0 w-full h-full object-cover"
        loading="eager"
        decoding="async"
      />
      {!plain && <div className="absolute inset-0 bg-gradient-to-r from-[#0d366b] from-25% via-[#0d366b]/75 via-55% to-[#0d366b]/5" />}
      <div className="relative h-full">{children}</div>
      <p
        className={`absolute bottom-1.5 right-3 text-[9px] ${
          plain ? "text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.9)]" : "text-white/75"
        }`}
      >
        Photo:{" "}
        <a href={photo.source} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
          {photo.author}
        </a>
        ,{" "}
        <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
          {photo.license}
        </a>
      </p>
    </div>
  );
}
