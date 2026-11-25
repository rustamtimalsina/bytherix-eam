"use client";

import React from "react";
import Image from "next/image";

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
      ? 22
      : size === "sm"
      ? 28
      : size === "md"
      ? 36
      : size === "lg"
      ? 52
      : 68;

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Official Sovereign Security Shield Emblem */}
      <div
        className="relative flex items-center justify-center shrink-0 group"
        style={{ width: pixelSize, height: pixelSize }}
      >
        {/* Subtle Ambient Glow */}
        <div
          className={`absolute inset-0 rounded-2xl bg-gradient-to-tr from-cyan-500/25 via-blue-600/20 to-indigo-600/20 blur-md pointer-events-none transition-all duration-500 ${
            animated ? "group-hover:scale-125 group-hover:opacity-100" : ""
          }`}
        />

        {/* Crisp High-Res Brand Shield Emblem */}
        <Image
          src="/bytherix_eam_icon.png"
          alt="Bytherix EAM Logo"
          width={pixelSize}
          height={pixelSize}
          priority
          className={`w-full h-full object-contain relative z-10 drop-shadow-[0_2px_10px_rgba(0,168,150,0.3)] ${
            animated ? "transition-transform duration-300 group-hover:scale-[1.05]" : ""
          }`}
        />
      </div>

      {/* Official Bytherix EAM Wordmark */}
      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-slate-900 dark:text-white tracking-tight text-base sm:text-lg">
              BYTHERIX
            </span>
            <span className="text-[10px] font-mono font-bold tracking-widest px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/10">
              EAM
            </span>
          </div>
          <span className="text-[10px] font-mono tracking-wider uppercase text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Enterprise AI Management
          </span>
        </div>
      )}
    </div>
  );
}
