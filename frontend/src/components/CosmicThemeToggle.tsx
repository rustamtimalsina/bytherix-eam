"use client";

import React, { useState } from "react";

export function CosmicThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  const toggle = () => {
    setIsDark(!isDark);
    // Future expansion: toggle document.documentElement.classList
  };

  return (
    <button
      onClick={toggle}
      title={isDark ? "Switch to Celestial Light" : "Switch to Deep Space"}
      className="relative w-16 h-8 rounded-full p-1 cursor-pointer transition-all duration-500 overflow-hidden shadow-[inset_0_2px_4px_rgba(0,0,0,0.6),0_0_15px_rgba(59,130,246,0.2)] border border-white/15 hover:border-white/30"
      style={{
        background: isDark
          ? "linear-gradient(135deg, #090e1c 0%, #151f38 100%)"
          : "linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)",
      }}
    >
      {/* Stars in dark mode */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${
          isDark ? "opacity-100" : "opacity-0"
        }`}
      >
        <span className="absolute top-1.5 left-2.5 w-1 h-1 rounded-full bg-white opacity-80 animate-ping" />
        <span className="absolute bottom-2 left-5 w-0.5 h-0.5 rounded-full bg-blue-200 opacity-90" />
        <span className="absolute top-3 left-7 w-0.5 h-0.5 rounded-full bg-white opacity-70" />
        <span className="absolute top-2 right-4 w-0.5 h-0.5 rounded-full bg-amber-100 opacity-90" />
      </div>

      {/* Floating Celestial Orb (Moon / Sun) */}
      <div
        className={`relative w-6 h-6 rounded-full transition-transform duration-500 ease-out flex items-center justify-center ${
          isDark
            ? "translate-x-8 bg-gradient-to-tr from-amber-200 to-amber-100 shadow-[0_0_12px_rgba(251,191,36,0.6)]"
            : "translate-x-0 bg-gradient-to-tr from-amber-400 to-yellow-300 shadow-[0_0_12px_rgba(245,158,11,0.8)]"
        }`}
      >
        {/* Crescent shadow on moon when dark */}
        {isDark && (
          <div className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#151f38] transition-all" />
        )}
      </div>
    </button>
  );
}
