"use client";

import React, { useState } from "react";
import { Activity } from "lucide-react";

interface TelemetrySparklineProps {
  totalTokens?: number;
  queriesCount?: number;
}

export function TelemetrySparkline({
  totalTokens = 31464,
  queriesCount = 55,
}: TelemetrySparklineProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{
    index: number;
    tokens: number;
    time: string;
  } | null>(null);

  // Generate a realistic 24-hour telemetry distribution curve
  const points = [
    120, 180, 240, 160, 90, 80, 210, 480, 890, 1420, 2100, 2800, 3200, 3600,
    3100, 2900, 3400, 4100, 3800, 2900, 2100, 1600, 950, 620,
  ];

  const maxVal = Math.max(...points, 4500);
  const minVal = Math.min(...points, 50);

  // Convert points to SVG coordinates (width: 500, height: 100)
  const width = 500;
  const height = 90;
  const paddingY = 10;

  const coords = points.map((val, idx) => {
    const x = (idx / (points.length - 1)) * width;
    const y =
      height - paddingY - ((val - minVal) / (maxVal - minVal)) * (height - 2 * paddingY);
    return { x, y, val, hour: `${idx.toString().padStart(2, "0")}:00` };
  });

  // Smooth SVG path command
  const pathD = coords.reduce((acc, point, i, arr) => {
    if (i === 0) return `M ${point.x},${point.y}`;
    const prev = arr[i - 1];
    const cp1x = prev.x + (point.x - prev.x) / 2;
    const cp1y = prev.y;
    const cp2x = prev.x + (point.x - prev.x) / 2;
    const cp2y = point.y;
    return `${acc} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${point.x},${point.y}`;
  }, "");

  // Area fill under curve
  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;

  return (
    <div className="space-y-2 pt-2">
      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 font-mono text-slate-500 dark:text-slate-400">
          <Activity className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
          <span>24h Consumption Curve</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">Real-time</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400">
          <span>P95: 42ms</span>
          <span>&bull;</span>
          <span>~{(totalTokens / (queriesCount || 1)).toFixed(0)} tok/req</span>
        </div>
      </div>

      <div className="relative rounded-xl bg-slate-50/70 dark:bg-black/30 border border-slate-200/80 dark:border-white/[0.06] p-3 overflow-hidden">
        {hoveredPoint && (
          <div className="absolute top-2 right-3 z-10 px-2 py-0.5 rounded-md bg-white/90 dark:bg-[#0c1220]/90 backdrop-blur-md border border-slate-200 dark:border-white/10 text-[10px] font-mono shadow-md flex items-center gap-2">
            <span className="text-slate-400">{hoveredPoint.time}</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              +{hoveredPoint.tokens.toLocaleString()} tokens
            </span>
          </div>
        )}

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-16 sm:h-20 overflow-visible"
        >
          <defs>
            <linearGradient id="token-telemetry-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Area fill */}
          <path d={areaD} fill="url(#token-telemetry-gradient)" />

          {/* Line stroke */}
          <path
            d={pathD}
            fill="none"
            stroke="#6366f1"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive hover points */}
          {coords.map((c, idx) => (
            <circle
              key={idx}
              cx={c.x}
              cy={c.y}
              r={hoveredPoint?.index === idx ? 4 : 2}
              className={`transition-all duration-150 cursor-pointer ${
                hoveredPoint?.index === idx
                  ? "fill-indigo-400 stroke-white dark:stroke-black stroke-2"
                  : "fill-indigo-500 opacity-40 hover:opacity-100"
              }`}
              onMouseEnter={() =>
                setHoveredPoint({ index: idx, tokens: c.val, time: c.hour })
              }
              onMouseLeave={() => setHoveredPoint(null)}
            />
          ))}
        </svg>

        <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 pt-1 border-t border-slate-200/50 dark:border-white/[0.04]">
          <span>00:00 (Start of Day)</span>
          <span>12:00 (Peak Ingestion)</span>
          <span>Now (Live Window)</span>
        </div>
      </div>
    </div>
  );
}
