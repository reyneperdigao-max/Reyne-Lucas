import React from 'react';
import { cn } from '../lib/utils';

export function NexusLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <div className={cn("relative shrink-0 flex items-center justify-center group", className)}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full filter drop-shadow-[0_4px_16px_rgba(212,175,55,0.45)] transition-transform duration-300 group-hover:scale-105"
      >
        <defs>
          <linearGradient id="nexusGoldBright" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="20%" stopColor="#FFF2A1" />
            <stop offset="50%" stopColor="#FFD700" />
            <stop offset="80%" stopColor="#D4AF37" />
            <stop offset="100%" stopColor="#997A15" />
          </linearGradient>

          <linearGradient id="nexusGoldSecondary" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#B38728" />
            <stop offset="40%" stopColor="#FBF5B7" />
            <stop offset="70%" stopColor="#DAA520" />
            <stop offset="100%" stopColor="#AA7C11" />
          </linearGradient>

          <linearGradient id="nexusShieldBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="50%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          <linearGradient id="nexusGlowOverlay" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#FFD700" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* Outer Shield Hexagon */}
        <polygon
          points="50,4 92,25 92,75 50,96 8,75 8,25"
          fill="url(#nexusShieldBg)"
          stroke="url(#nexusGoldBright)"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />

        {/* Inner Shield Bevel Rim */}
        <polygon
          points="50,10 86,28 86,72 50,90 14,72 14,28"
          fill="url(#nexusGlowOverlay)"
          stroke="url(#nexusGoldSecondary)"
          strokeWidth="1.5"
          strokeOpacity="0.7"
          strokeLinejoin="round"
        />

        {/* Top Diamond Crown Accent */}
        <line x1="50" y1="10" x2="50" y2="20" stroke="url(#nexusGoldBright)" strokeWidth="1.5" strokeOpacity="0.5" />
        <polygon points="50,16 55,22 50,28 45,22" fill="url(#nexusGoldBright)" />

        {/* --- INTERLOCKING NP MONOGRAM --- */}
        <path d="M 21 26 H 29 V 74 H 21 Z" fill="url(#nexusGoldBright)" />
        <path d="M 29 26 L 48 64 V 74 H 40 L 21 36 V 26 H 29 Z" fill="url(#nexusGoldSecondary)" />
        <path d="M 40 26 H 48 V 74 H 40 Z" fill="url(#nexusGoldBright)" />
        <path
          d="M 48 26 H 65 C 74.5 26 80 31.5 80 38.5 C 80 45.5 74.5 51 65 51 H 48 V 43 H 64 C 69 43 72 41 72 38.5 C 72 36 69 34 64 34 H 48 V 26 Z"
          fill="url(#nexusGoldBright)"
        />

        {/* Bottom Accent Dot */}
        <circle cx="50" cy="84" r="2" fill="url(#nexusGoldBright)" />
      </svg>
    </div>
  );
}
