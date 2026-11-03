"use client";

import React from "react";

interface BytherixEAMLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  className?: string;
  showText?: boolean;
  animated?: boolean;
}

export function BytherixEAMLogo({
  size = "md",
  className = "",
  showText = false,
  animated = true,
}: BytherixEAMLogoProps) {
  const pixelSize =
    typeof size === "number"
      ? size
      : size === "xs"
      ? 20
      : size === "sm"
      ? 26
      : size === "md"
      ? 34
      : size === "lg"
      ? 46
      : 60;

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Precision Neural-Orbital "B" Emblem */}
      <div
        className="relative flex items-center justify-center shrink-0 group"
        style={{ width: pixelSize, height: pixelSize }}
      >
        {/* Subtle Ambient Glow */}
        <div
          className={`absolute inset-0 rounded-xl bg-gradient-to-tr from-cyan-500/20 via-blue-600/20 to-amber-500/15 blur-sm pointer-events-none transition-all duration-500 ${
            animated ? "group-hover:scale-125 group-hover:opacity-100" : ""
          }`}
        />

        <svg
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`w-full h-full relative z-10 drop-shadow-[0_2px_8px_rgba(6,182,212,0.3)] ${
            animated ? "transition-transform duration-300 group-hover:scale-[1.04]" : ""
          }`}
        >
          <defs>
            {/* Gradient: Spine (Enterprise Backbone) */}
            <linearGradient id="eamSpineGrad" x1="20" y1="18" x2="42" y2="102" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="40%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </linearGradient>

            {/* Gradient: Upper Neural Loop (AI Intelligence) */}
            <linearGradient id="eamNeuralGrad" x1="42" y1="18" x2="88" y2="60" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="60%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#4338ca" />
            </linearGradient>

            {/* Gradient: Lower Enterprise Data Loop */}
            <linearGradient id="eamLowerGrad" x1="42" y1="58" x2="94" y2="102" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>

            {/* Gradient: Bytherix Planetary Orbit */}
            <linearGradient id="eamOrbitGrad" x1="12" y1="84" x2="108" y2="36" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="35%" stopColor="#fbbf24" />
              <stop offset="70%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>

            {/* Glowing Core Filter */}
            <filter id="eamCoreGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 1. Planetary Trajectory Ring (Back Arc) */}
          <path
            d="M 22 78 C 12 73, 10 65, 26 53 C 48 37, 82 27, 98 33"
            stroke="url(#eamOrbitGrad)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="2 3"
            opacity="0.45"
          />

          {/* 2. Solid Spine (Enterprise Core) */}
          <rect x="24" y="20" width="16" height="80" rx="8" fill="url(#eamSpineGrad)" />
          <rect
            x="25"
            y="21"
            width="14"
            height="78"
            rx="7"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="1"
            fill="none"
          />

          {/* 3. Upper AI Neural Facet (Hex Chamber) */}
          <path
            d="M 38 20 H 68 C 80 20, 88 28, 88 40 C 88 52, 80 58, 68 58 H 38 V 20 Z"
            fill="url(#eamNeuralGrad)"
          />
          {/* Upper Neural Hexagon Aperture (Dark-Aware Inner Counter) */}
          <polygon
            points="54,28 66,28 72,39 66,50 54,50 48,39"
            className="fill-slate-950 dark:fill-[#080d1a]"
          />
          {/* Floating Cyan Neural Core */}
          <polygon
            points="57,33 63,33 66,39 63,45 57,45 54,39"
            fill="#06b6d4"
            opacity="0.95"
            filter="url(#eamCoreGlow)"
            className={animated ? "animate-pulse" : ""}
          />

          {/* 4. Lower Enterprise Data Facet */}
          <path
            d="M 38 56 H 72 C 86 56, 94 65, 94 79 C 94 93, 84 100, 70 100 H 38 V 56 Z"
            fill="url(#eamLowerGrad)"
          />
          {/* Lower Inner Counter */}
          <path
            d="M 52 68 H 68 C 74 68, 78 72, 78 78 C 78 84, 74 88, 68 88 H 52 Z"
            className="fill-slate-950 dark:fill-[#080d1a]"
          />
          {/* Lower Data Core */}
          <circle cx="62" cy="78" r="4" fill="#38bdf8" opacity="0.9" />

          {/* 5. Precision Laser Cut Dividers */}
          <path
            d="M 22 57 H 42"
            strokeWidth="3"
            strokeLinecap="round"
            className="stroke-slate-950 dark:stroke-[#080d1a]"
          />
          <path
            d="M 38 57 H 96"
            strokeWidth="3"
            className="stroke-slate-950 dark:stroke-[#080d1a]"
          />

          {/* 6. Planetary Trajectory Ring (Front Arc) */}
          <path
            d="M 20 80 C 35 90, 72 96, 96 82 C 108 75, 110 65, 96 55"
            stroke="url(#eamOrbitGrad)"
            strokeWidth="3.2"
            strokeLinecap="round"
          />

          {/* Trajectory Amber Focal Node */}
          <circle cx="96" cy="55" r="3" fill="#f59e0b" filter="url(#eamCoreGlow)" />
          <circle cx="20" cy="80" r="2" fill="#fbbf24" />
        </svg>
      </div>

      {/* Optional Integrated Wordmark */}
      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-slate-900 dark:text-white tracking-tight text-base sm:text-lg">
              BYTHERIX
            </span>
            <span className="text-[10px] font-mono font-bold tracking-widest px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
              EAM
            </span>
          </div>
          <span className="text-[9px] font-mono tracking-wider uppercase text-slate-400 dark:text-slate-500 font-medium mt-0.5">
            Enterprise AI Management
          </span>
        </div>
      )}
    </div>
  );
}
