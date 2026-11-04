"use client";

import React from "react";

/**
 * EnterpriseCanvasBackground
 * Inspired by Linear.app, Vercel, and Magic UI (21st.dev).
 * High-precision architectural dot-matrix blueprint with top-down ambient spotlight.
 * Pure SVG & CSS: zero performance overhead, buttery smooth 60fps.
 */
export function EnterpriseCanvasBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
    >
      {/* 1. Base Canvas */}
      <div className="absolute inset-0 bg-[#f8fafc] dark:bg-[#060810] transition-colors duration-500" />

      {/* 2. Top-Down Ethereal Ambient Spotlight Cone (Linear.app signature) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] sm:w-[1400px] h-[650px] pointer-events-none">
        <div className="w-full h-full bg-[radial-gradient(ellipse_75%_55%_at_50%_0%,rgba(99,102,241,0.18),rgba(59,130,246,0.10),transparent_75%)] dark:bg-[radial-gradient(ellipse_75%_55%_at_50%_0%,rgba(99,102,241,0.25),rgba(59,130,246,0.12),transparent_80%)]" />
      </div>

      {/* 3. Subtle Cyan Horizon Rim Light Accent */}
      <div className="absolute top-[-80px] right-[-80px] w-[600px] h-[500px] bg-[radial-gradient(circle_at_50%_50%,rgba(20,184,166,0.10),transparent_70%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(20,184,166,0.14),transparent_70%)] pointer-events-none" />

      {/* 4. High-Precision Blueprint Dot Matrix Pattern */}
      <svg
        className="absolute inset-0 w-full h-full text-slate-900/[0.05] dark:text-white/[0.10]"
        style={{
          maskImage:
            "radial-gradient(ellipse 90% 80% at 50% 30%, #000 40%, transparent 95%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 90% 80% at 50% 30%, #000 40%, transparent 95%)",
        }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="enterprise-grid-pattern"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r="0.75" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#enterprise-grid-pattern)" />
      </svg>

      {/* 5. Subtle Hairline Horizon Line under header */}
      <div className="absolute top-16 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-white/10 to-transparent pointer-events-none" />
    </div>
  );
}
