import React, { useState } from 'react';
import { cn } from '../lib/utils';

export function NexusLogo({ className = "w-10 h-10" }: { className?: string }) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className={cn("relative shrink-0 flex items-center justify-center group select-none", className)}>
      {!imgFailed ? (
        <img
          src="/nexus-logo.png"
          alt="Nexus Private"
          draggable={false}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-contain rounded-[22%] filter drop-shadow-[0_4px_14px_rgba(255,255,255,0.2)] transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <svg
          viewBox="0 0 180 180"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full filter drop-shadow-[0_4px_14px_rgba(255,255,255,0.2)] transition-transform duration-300 group-hover:scale-105"
        >
          <defs>
            <linearGradient id="nexusGlossBg" x1="0" y1="0" x2="180" y2="180" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#141518" />
              <stop offset="48%" stopColor="#050507" />
              <stop offset="100%" stopColor="#000000" />
            </linearGradient>
            <linearGradient id="nexusPlatinumOuter" x1="28" y1="22" x2="152" y2="158" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="32%" stopColor="#E5E5E5" />
              <stop offset="68%" stopColor="#A8A8AC" />
              <stop offset="100%" stopColor="#D4D4D8" />
            </linearGradient>
            <linearGradient id="nexusPlatinumInner" x1="36" y1="30" x2="144" y2="150" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F9F9F9" />
              <stop offset="55%" stopColor="#B7B7B5" />
              <stop offset="100%" stopColor="#E5E5E5" />
            </linearGradient>
          </defs>
          <rect x="2" y="2" width="176" height="176" rx="40" ry="40" fill="url(#nexusGlossBg)" stroke="#71717A" strokeWidth="1.5" />
          <polygon
            points="90,22 149,56 149,124 90,158 31,124 31,56"
            fill="#030304"
            stroke="url(#nexusPlatinumOuter)"
            strokeWidth="6.5"
            strokeLinejoin="miter"
          />
          <polygon
            points="90,33.5 139,61.8 139,118.2 90,146.5 41,118.2 41,61.8"
            fill="none"
            stroke="url(#nexusPlatinumInner)"
            strokeWidth="2.2"
            strokeLinejoin="miter"
          />
          <path d="M51 61 H60.5 L77 100.5 V61 H86.5 V119 H77 L60.5 79.5 V119 H51 Z" fill="url(#nexusPlatinumOuter)" />
          <path d="M93.5 61 H114.5 C127 61 134 68.5 134 79 C134 89.5 127 97 114.5 97 H103 V119 H93.5 Z M103 70 V88 H113.5 C120 88 124 84.5 124 79 C124 73.5 120 70 113.5 70 Z" fill="url(#nexusPlatinumOuter)" fillRule="evenodd" />
        </svg>
      )}
    </div>
  );
}
