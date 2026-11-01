"use client";

import React, { useState, useCallback, useRef } from "react";
import { Sparkles } from "lucide-react";

export function OrbitalCore({ label = "BYTHERIX ENTERPRISE RAG CORE" }: { label?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const rotateX = (0.5 - y) * 20;
    const rotateY = (x - 0.5) * 20;
    setTilt({ x: rotateX, y: rotateY });
  }, []);

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  }, []);

  const transformStyle = isHovered
    ? `perspective(800px) rotateX(${tilt.x.toFixed(2)}deg) rotateY(${tilt.y.toFixed(2)}deg) scale3d(1.04, 1.04, 1.04)`
    : "perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: transformStyle,
        transformStyle: "preserve-3d",
        transition: isHovered
          ? "transform 0.1s ease-out"
          : "transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)",
        willChange: "transform",
      }}
      className="flex flex-col items-center justify-center my-4 select-none cursor-pointer group"
    >
      {/* Orbital Atom Ring System */}
      <div className="relative w-28 h-28 flex items-center justify-center">
        {/* Soft Ambient Core Halo */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-600/30 via-indigo-600/20 to-purple-600/30 blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />

        {/* Orbit Ellipse 1 */}
        <div className="absolute w-24 h-10 border border-blue-400/40 dark:border-blue-400/50 rounded-full rotate-45 animate-[spin_8s_linear_infinite] group-hover:border-cyan-400/70 transition-colors">
          <span className="absolute -top-1 left-3 w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_12px_#67e8f9]" />
        </div>

        {/* Orbit Ellipse 2 */}
        <div className="absolute w-24 h-10 border border-purple-400/40 dark:border-purple-400/50 rounded-full -rotate-45 animate-[spin_10s_linear_infinite_reverse] group-hover:border-purple-400/70 transition-colors">
          <span className="absolute -bottom-1 right-3 w-2 h-2 rounded-full bg-purple-300 shadow-[0_0_12px_#c084fc]" />
        </div>

        {/* Orbit Ellipse 3 */}
        <div className="absolute w-24 h-10 border border-emerald-400/40 dark:border-emerald-400/50 rounded-full rotate-90 animate-[spin_12s_linear_infinite] group-hover:border-emerald-400/70 transition-colors">
          <span className="absolute top-2 -right-1 w-2 h-2 rounded-full bg-emerald-300 shadow-[0_0_12px_#6ee7b7]" />
        </div>

        {/* Glowing Center Nucleus */}
        <div className="relative z-10 w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center shadow-[0_0_25px_rgba(99,102,241,0.8)] border border-white/40 group-hover:shadow-[0_0_35px_rgba(99,102,241,1)] group-hover:scale-110 transition-all duration-300">
          <Sparkles className="w-5 h-5 text-white animate-pulse" />
        </div>
      </div>

      {/* Pill Badge under the core */}
      <div className="mt-3 inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900/[0.06] dark:bg-white/[0.04] border border-slate-900/10 dark:border-white/10 text-[11px] font-mono font-semibold tracking-wider text-slate-800 dark:text-slate-300 shadow-sm backdrop-blur-md group-hover:border-indigo-500/30 group-hover:bg-slate-900/[0.09] dark:group-hover:bg-white/[0.08] transition-all duration-200">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-cyan-400 animate-ping" />
        <span>{label}</span>
      </div>
    </div>
  );
}
