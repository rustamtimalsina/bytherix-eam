"use client";

import React from "react";
import { Plus, Zap, ArrowRight, Sparkles, LucideIcon } from "lucide-react";

export interface FlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  icon?: "plus" | "zap" | "arrow" | "sparkles" | LucideIcon;
  variant?: "primary" | "amber" | "subtle";
  size?: "sm" | "md" | "lg";
}

export function FlowButton({
  children,
  icon = "plus",
  variant = "primary",
  size = "md",
  className = "",
  disabled,
  ...props
}: FlowButtonProps) {
  // Size presets
  const sizeClasses = {
    sm: "px-2.5 py-1 text-xs gap-1.5 rounded-lg",
    md: "px-3.5 py-2 text-xs sm:text-[13px] gap-2 rounded-xl",
    lg: "px-5 py-2.5 text-sm gap-2.5 rounded-xl",
  }[size];

  // Variant themes
  const variantClasses = {
    primary:
      "bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-500 hover:via-indigo-500 hover:to-indigo-600 text-white shadow-md shadow-indigo-500/25 border border-indigo-400/30",
    amber:
      "bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 hover:from-amber-400 hover:via-orange-400 hover:to-indigo-500 text-white shadow-md shadow-orange-500/20 border border-amber-300/30",
    subtle:
      "bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-900 dark:text-white border border-slate-200/80 dark:border-white/[0.08] shadow-xs",
  }[variant];

  // Render dynamic icon
  const renderIcon = () => {
    if (!icon) return null;

    if (icon === "plus") {
      return (
        <Plus className="w-3.5 h-3.5 transition-transform duration-300 ease-out group-hover:rotate-90 group-hover:scale-110 shrink-0" />
      );
    }
    if (icon === "zap") {
      return (
        <Zap className="w-3.5 h-3.5 transition-transform duration-300 ease-out group-hover:scale-125 text-amber-200 shrink-0" />
      );
    }
    if (icon === "arrow") {
      return (
        <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 ease-out group-hover:translate-x-1 shrink-0" />
      );
    }
    if (icon === "sparkles") {
      return (
        <Sparkles className="w-3.5 h-3.5 transition-transform duration-300 ease-out group-hover:scale-110 text-amber-300 shrink-0" />
      );
    }

    // Custom LucideIcon component
    const IconComponent = icon as LucideIcon;
    return (
      <IconComponent className="w-3.5 h-3.5 transition-transform duration-300 ease-out group-hover:scale-110 shrink-0" />
    );
  };

  return (
    <button
      {...props}
      disabled={disabled}
      className={`group relative overflow-hidden font-bold select-none transition-all duration-300 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center ${sizeClasses} ${variantClasses} ${className}`}
    >
      {/* 1. Ambient Radial Glow on Hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.25)_0%,_transparent_70%)] pointer-events-none" />

      {/* 2. Flowing Specular Shimmer Sweep (Flow Animation from 21st.dev style) */}
      <div
        className="absolute inset-0 -translate-x-[120%] group-hover:translate-x-[120%] transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-12 pointer-events-none"
        aria-hidden="true"
      />

      {/* 3. Button Content & Animated Micro-Interaction Icon */}
      <span className="relative z-10 flex items-center justify-center gap-1.5 sm:gap-2">
        {renderIcon()}
        <span className="tracking-wide">{children}</span>
      </span>
    </button>
  );
}
