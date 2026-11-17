"use client";

import React, { useEffect, useRef } from "react";
import { useTheme } from "@/lib/theme-context";

/**
 * EnterpriseCanvasBackground
 * Living Aurora & Ethereal Quantum Mesh (Apple Intelligence & Stripe Inspired).
 *
 * Visual Features:
 * - Full-bleed multi-layered fluid color nodes (Cyan, Electric Indigo, Deep Violet)
 * - Harmonically undulating Lissajous curves creating a living, breathing aurora
 * - Interactive Cursor Dynamics: Gentle magnetic illumination tracking the mouse
 * - 100% Cross-Theme Adaptation:
 *     * Dark Mode: Deep Void with luminous quantum nebula
 *     * Light Mode: Luminous iridescent pearl aura (never plain, never floating balls)
 * - 60 FPS hardware-accelerated canvas with automatic tab-unfocus pausing
 */
export function EnterpriseCanvasBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { isDark } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let dpr = 1;

    // Fluid Aurora Nodes configuration
    const nodes = [
      // Node 1: Primary Electric Cyan Beacon (Brand signature)
      {
        baseX: 0.25,
        baseY: 0.25,
        radius: 0.45,
        freqX: 0.45,
        freqY: 0.35,
        phase: 0,
        darkColor: "rgba(0, 229, 204, 0.18)",
        lightColor: "rgba(14, 165, 233, 0.15)",
      },
      // Node 2: Royal Indigo Core (Center workspace)
      {
        baseX: 0.70,
        baseY: 0.40,
        radius: 0.50,
        freqX: 0.35,
        freqY: 0.50,
        phase: 2.1,
        darkColor: "rgba(99, 102, 241, 0.22)",
        lightColor: "rgba(99, 102, 241, 0.14)",
      },
      // Node 3: Deep Cosmic Violet (Lower-left quadrant)
      {
        baseX: 0.35,
        baseY: 0.75,
        radius: 0.55,
        freqX: 0.40,
        freqY: 0.30,
        phase: 4.2,
        darkColor: "rgba(139, 92, 246, 0.16)",
        lightColor: "rgba(168, 85, 247, 0.12)",
      },
      // Node 4: Horizon Sapphire Glow (Lower-right footer quadrant)
      {
        baseX: 0.80,
        baseY: 0.85,
        radius: 0.45,
        freqX: 0.50,
        freqY: 0.40,
        phase: 1.4,
        darkColor: "rgba(59, 130, 246, 0.15)",
        lightColor: "rgba(56, 189, 248, 0.14)",
      },
    ];

    // Cursor tracking with smooth lerp physics
    let targetMouseX = -1000;
    let targetMouseY = -1000;
    let curMouseX = -1000;
    let curMouseY = -1000;
    let hasInteracted = false;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function resize() {
      if (!canvas) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx?.scale(dpr, dpr);

      if (prefersReducedMotion) {
        renderFrame(0);
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
      hasInteracted = true;
    };

    const handleMouseLeave = () => {
      targetMouseX = -1000;
      targetMouseY = -1000;
    };

    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);
    resize();

    function renderFrame(time: number) {
      if (!ctx) return;

      const t = time * 0.0006; // Calm, hypnotic breathing tempo

      // Damped cursor physics
      curMouseX += (targetMouseX - curMouseX) * 0.08;
      curMouseY += (targetMouseY - curMouseY) * 0.08;

      ctx.clearRect(0, 0, width, height);

      // Render living fluid aurora nodes
      nodes.forEach((node) => {
        // Harmonic organic displacement
        const offsetX = Math.sin(t * node.freqX + node.phase) * width * 0.09;
        const offsetY = Math.cos(t * node.freqY + node.phase) * height * 0.08;

        let nodeX = node.baseX * width + offsetX;
        let nodeY = node.baseY * height + offsetY;

        // Subtle magnetic pull toward active cursor
        if (hasInteracted && curMouseX > 0) {
          const dx = curMouseX - nodeX;
          const dy = curMouseY - nodeY;
          const dist = Math.hypot(dx, dy);
          const pullRadius = Math.min(width, height) * 0.6;
          if (dist < pullRadius) {
            const pull = (1 - dist / pullRadius) * 40;
            nodeX += (dx / dist) * pull;
            nodeY += (dy / dist) * pull;
          }
        }

        const radius = Math.max(width, height) * node.radius;

        const gradient = ctx.createRadialGradient(
          nodeX,
          nodeY,
          0,
          nodeX,
          nodeY,
          radius
        );

        const color = isDark ? node.darkColor : node.lightColor;
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.5, color.replace(/[\d.]+\)$/, "0.06)"));
        gradient.addColorStop(1, "transparent");

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      });

      // Interactive Cursor Ambient Spotlight Aura
      if (hasInteracted && curMouseX > 0) {
        const spotRadius = Math.min(width, height) * 0.32;
        const spotGrad = ctx.createRadialGradient(
          curMouseX,
          curMouseY,
          0,
          curMouseX,
          curMouseY,
          spotRadius
        );

        const spotColor = isDark
          ? "rgba(0, 229, 204, 0.09)"
          : "rgba(59, 130, 246, 0.08)";

        spotGrad.addColorStop(0, spotColor);
        spotGrad.addColorStop(0.6, spotColor.replace(/[\d.]+\)$/, "0.02)"));
        spotGrad.addColorStop(1, "transparent");

        ctx.fillStyle = spotGrad;
        ctx.fillRect(0, 0, width, height);
      }
    }

    let isRunning = true;
    function loop(time: number) {
      if (!isRunning) return;
      renderFrame(time);
      animationFrameId = requestAnimationFrame(loop);
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isRunning = false;
        cancelAnimationFrame(animationFrameId);
      } else {
        if (!prefersReducedMotion) {
          isRunning = true;
          animationFrameId = requestAnimationFrame(loop);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    if (!prefersReducedMotion) {
      animationFrameId = requestAnimationFrame(loop);
    } else {
      renderFrame(0);
    }

    return () => {
      isRunning = false;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isDark]);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
    >
      {/* 1. Base Dark Obsidian / Crisp Slate Platform Foundation */}
      <div className="absolute inset-0 bg-[#f8fafc] dark:bg-[#060810] transition-colors duration-500" />

      {/* 2. Full-Bleed Living Aurora Fluid Canvas (Top-to-Bottom Coverage) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* 3. Ultra-Fine High-Precision Blueprint Grid (Subtle, Crisp, Non-Intrusive) */}
      <svg
        className="absolute inset-0 w-full h-full text-slate-900/[0.035] dark:text-white/[0.045] pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="aurora-grid-pattern"
            width="32"
            height="32"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r="0.65" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#aurora-grid-pattern)" />
      </svg>

      {/* 4. Subtle Ambient Vignette: Guarantees 100% foreground card contrast */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_60%_at_50%_35%,rgba(248,250,252,0.55)_0%,transparent_75%)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_35%,rgba(6,8,16,0.60)_0%,transparent_80%)]" />

      {/* 5. Header Horizon Hairline */}
      <div className="absolute top-16 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-300/40 dark:via-white/10 to-transparent pointer-events-none" />
    </div>
  );
}
