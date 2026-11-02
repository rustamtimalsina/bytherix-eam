"use client";

import React, { useState } from "react";
import { useTheme } from "@/lib/theme-context";

export function CosmicThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  const [isAnimating, setIsAnimating] = useState(false);

  const handleToggle = () => {
    setIsAnimating(true);
    toggleTheme();
    setTimeout(() => setIsAnimating(false), 700);
  };

  return (
    <button
      onClick={handleToggle}
      type="button"
      aria-label={isDark ? "Switch to Daylight Mode" : "Switch to Deep Space Mode"}
      title={isDark ? "Switch to Daylight Mode" : "Switch to Deep Space Mode"}
      className={`group relative w-[72px] h-[34px] rounded-full p-1 cursor-pointer transition-all duration-700 overflow-hidden select-none outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 active:scale-95 ${
        isDark
          ? "bg-gradient-to-r from-[#060a17] via-[#0d162d] to-[#162244] border border-indigo-500/30 shadow-[inset_0_2px_6px_rgba(0,0,0,0.7),0_0_20px_rgba(99,102,241,0.25)] hover:border-indigo-400/50"
          : "bg-gradient-to-r from-[#38bdf8] via-[#60a5fa] to-[#818cf8] border border-sky-300/60 shadow-[inset_0_2px_6px_rgba(0,0,0,0.2),0_0_20px_rgba(56,189,248,0.4)] hover:border-sky-300"
      }`}
    >
      {/* 1. NIGHT SKY ENVIRONMENT (Stars, Nebula & Shooting Star) */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 pointer-events-none ${
          isDark ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Twinkling Star 1 */}
        <span className="absolute top-2 left-3 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_4px_#ffffff] animate-pulse" />
        {/* Twinkling Star 2 */}
        <span className="absolute bottom-2.5 left-7 w-1 h-1 rounded-full bg-indigo-200 opacity-90 shadow-[0_0_3px_#c7d2fe]" />
        {/* Twinkling Star 3 */}
        <span className="absolute top-4 left-5 w-0.5 h-0.5 rounded-full bg-white opacity-70" />
        {/* Twinkling Star 4 */}
        <span className="absolute top-2.5 left-10 w-1 h-1 rounded-full bg-amber-100 opacity-80 animate-ping [animation-duration:3s]" />
        {/* Shooting Star Streak */}
        <div
          className={`absolute top-1 left-2 w-6 h-[1px] bg-gradient-to-r from-transparent via-cyan-300 to-transparent rotate-[-25deg] transition-transform duration-1000 ${
            isDark ? "translate-x-2 opacity-60" : "-translate-x-6 opacity-0"
          }`}
        />
      </div>

      {/* 2. DAY SKY ENVIRONMENT (Fluffy Floating Clouds) */}
      <div
        className={`absolute inset-0 transition-all duration-700 pointer-events-none ${
          isDark ? "translate-y-8 opacity-0" : "translate-y-0 opacity-100"
        }`}
      >
        {/* Cloud Puff 1 (Right) */}
        <div className="absolute -bottom-1.5 right-2 w-7 h-4 rounded-full bg-white/90 shadow-sm" />
        {/* Cloud Puff 2 (Center) */}
        <div className="absolute -bottom-2 right-6 w-5 h-5 rounded-full bg-white/95 shadow-sm" />
        {/* Cloud Puff 3 (Back layer) */}
        <div className="absolute bottom-0 right-8 w-4 h-3.5 rounded-full bg-white/70" />
      </div>

      {/* 3. CELESTIAL ORB (Spring-animated morphing Sun/Moon) */}
      <div
        className={`relative w-[26px] h-[26px] rounded-full transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex items-center justify-center ${
          isDark
            ? "translate-x-[38px] rotate-[360deg] bg-gradient-to-tr from-[#fef08a] via-[#fde047] to-[#ffffff] shadow-[0_0_14px_rgba(253,224,71,0.7),inset_0_-2px_4px_rgba(202,138,4,0.4)]"
            : "translate-x-0 rotate-0 bg-gradient-to-tr from-[#f59e0b] via-[#fbbf24] to-[#fef08a] shadow-[0_0_16px_rgba(245,158,11,0.8),inset_0_-2px_4px_rgba(180,83,9,0.3)]"
        } ${isAnimating ? "scale-110" : "scale-100"}`}
      >
        {/* LUNAR DETAILS (Realistic Moon Craters - Zero Black Mask!) */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 rounded-full overflow-hidden ${
            isDark ? "opacity-100" : "opacity-0"
          }`}
        >
          {/* Crater 1 (Top Right) */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-300/40 shadow-[inset_0_1px_1.5px_rgba(161,98,7,0.3)]" />
          {/* Crater 2 (Bottom Center) */}
          <span className="absolute bottom-1.5 left-2.5 w-1.5 h-1.5 rounded-full bg-amber-300/40 shadow-[inset_0_1px_1px_rgba(161,98,7,0.3)]" />
          {/* Crater 3 (Small micro-dimple) */}
          <span className="absolute top-3 left-1.5 w-1 h-1 rounded-full bg-amber-300/35" />
        </div>

        {/* SOLAR RAYS (Rotating Corona Burst when Daylight) */}
        <div
          className={`absolute -inset-1.5 transition-all duration-700 flex items-center justify-center pointer-events-none ${
            isDark ? "opacity-0 rotate-90 scale-50" : "opacity-100 rotate-0 scale-100"
          }`}
        >
          <svg
            className="w-8 h-8 text-amber-400/80 animate-[spin_18s_linear_infinite]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        </div>
      </div>
    </button>
  );
}
