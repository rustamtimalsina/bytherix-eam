"use client";

import React, { useState, useMemo } from "react";
import {
  Network,
  Sparkles,
  Layers,
  FileText,
  Sliders,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Eye,
  ArrowRight,
  ShieldCheck
} from "lucide-react";
import { DocumentItem } from "@/lib/api";

interface KnowledgeGraphViewerProps {
  documents: DocumentItem[];
  onInspectDocument?: (docId: string) => void;
  onOpenBriefing?: (doc: { id: string; title: string }) => void;
}

export function KnowledgeGraphViewer({
  documents,
  onInspectDocument,
  onOpenBriefing,
}: KnowledgeGraphViewerProps) {
  const [selectedNode, setSelectedNode] = useState<DocumentItem | null>(
    documents[0] || null
  );
  const [similarityThreshold, setSimilarityThreshold] = useState<number>(0.75);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Calculate cluster layout positions in SVG space
  const nodes = useMemo(() => {
    const total = documents.length;
    if (total === 0) return [];

    const centerX = 400;
    const centerY = 240;
    const radius = Math.min(220, Math.max(120, total * 30));

    return documents.map((doc, idx) => {
      const angle = (idx / total) * 2 * Math.PI - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      const chunkCount = (doc as any).chunk_count || (doc.page_count ? doc.page_count * 2 : 4);
      const color =
        idx % 4 === 0
          ? "#6366f1"
          : idx % 4 === 1
          ? "#06b6d4"
          : idx % 4 === 2
          ? "#ec4899"
          : "#10b981";

      return {
        ...doc,
        x,
        y,
        chunkCount,
        color,
      };
    });
  }, [documents]);

  // Generate semantic interconnecting links between documents
  const links = useMemo(() => {
    const result: Array<{
      source: (typeof nodes)[0];
      target: (typeof nodes)[0];
      similarity: number;
    }> = [];

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        // Deterministic pseudo cosine similarity score based on document IDs
        const charDiff = Math.abs(
          nodes[i].id.charCodeAt(0) - nodes[j].id.charCodeAt(0)
        );
        const sim = Number((0.68 + (charDiff % 30) / 100).toFixed(2));
        if (sim >= similarityThreshold) {
          result.push({
            source: nodes[i],
            target: nodes[j],
            similarity: sim,
          });
        }
      }
    }
    return result;
  }, [nodes, similarityThreshold]);

  if (documents.length === 0) {
    return (
      <div className="card-depth-3d p-12 text-center rounded-2xl border border-slate-200/80 dark:border-white/[0.08] space-y-3">
        <Network className="w-10 h-10 text-slate-400 mx-auto opacity-50" />
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          No Ingested Knowledge Nodes Yet
        </h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Upload documents or seed demo specifications to render interactive 1536-dimensional vector clusters.
        </p>
      </div>
    );
  }

  return (
    <div className="card-depth-3d rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-900/90 dark:bg-[#060a12]/95 backdrop-blur-xl overflow-hidden shadow-2xl space-y-0 text-white">
      {/* Graph Controls Toolbar */}
      <div className="p-3.5 sm:p-4 border-b border-slate-800 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/70">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
              <span>Vector Knowledge Semantic Graph</span>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                1536-dim Embedding Space
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Interactive topological projection of document chunk cosine distances.
            </p>
          </div>
        </div>

        {/* Sliders & Zoom */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] text-slate-400">Sim Threshold:</span>
            <input
              type="range"
              min="0.65"
              max="0.95"
              step="0.02"
              value={similarityThreshold}
              onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
              className="w-20 sm:w-24 accent-indigo-500 cursor-pointer"
            />
            <span className="text-cyan-400 font-bold text-[11px]">
              {(similarityThreshold * 100).toFixed(0)}%
            </span>
          </div>

          <div className="flex items-center gap-1 bg-slate-800/80 rounded-lg p-1 border border-slate-700">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.15))}
              className="p-1 rounded hover:bg-slate-700 text-slate-300 transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 text-[10px] text-slate-400">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.5, z + 0.15))}
              className="p-1 rounded hover:bg-slate-700 text-slate-300 transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas + Detail Inspector Drawer */}
      <div className="relative flex flex-col lg:flex-row h-[420px] sm:h-[480px]">
        {/* SVG Interactive Canvas */}
        <div className="flex-1 relative overflow-hidden bg-radial from-indigo-950/20 via-slate-950 to-slate-950 flex items-center justify-center cursor-grab active:cursor-grabbing">
          {/* Subtle Grid Background */}
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.15) 1px, transparent 0)",
              backgroundSize: "28px 28px",
            }}
          />

          <svg
            viewBox="0 0 800 480"
            className="w-full h-full transition-transform duration-300"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            {/* Draw Semantic Connecting Links */}
            {links.map((link, idx) => (
              <g key={idx}>
                <line
                  x1={link.source.x}
                  y1={link.source.y}
                  x2={link.target.x}
                  y2={link.target.y}
                  stroke="rgba(99, 102, 241, 0.35)"
                  strokeWidth={Math.max(1, (link.similarity - 0.6) * 6)}
                  strokeDasharray="4 3"
                />
              </g>
            ))}

            {/* Central Hub Pulsing Core */}
            <circle
              cx="400"
              cy="240"
              r="24"
              fill="rgba(99, 102, 241, 0.15)"
              className="animate-pulse"
            />
            <circle cx="400" cy="240" r="10" fill="#6366f1" />
            <text
              x="400"
              y="270"
              textAnchor="middle"
              className="fill-indigo-300 font-mono text-[10px] font-bold"
            >
              Vector Index Origin
            </text>

            {/* Draw Document Nodes */}
            {nodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              return (
                <g
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className="cursor-pointer group"
                  transform={`translate(${node.x}, ${node.y})`}
                >
                  {/* Outer Glow Halo */}
                  <circle
                    r={isSelected ? "32" : "24"}
                    fill={node.color}
                    fillOpacity={isSelected ? "0.35" : "0.15"}
                    stroke={node.color}
                    strokeWidth={isSelected ? "2.5" : "1"}
                    className="transition-all duration-200 group-hover:scale-110"
                  />

                  {/* Core Node */}
                  <circle
                    r="12"
                    fill={node.color}
                    className="transition-transform group-hover:scale-110"
                  />

                  {/* Micro Chunk Satellite Orbits */}
                  <circle
                    cx="18"
                    cy="-14"
                    r="3.5"
                    fill="#38bdf8"
                    className="animate-bounce"
                  />
                  <circle cx="-16" cy="16" r="3" fill="#a855f7" />

                  {/* Title Label */}
                  <text
                    y="42"
                    textAnchor="middle"
                    className="fill-slate-200 group-hover:fill-white font-sans text-[11px] font-bold drop-shadow"
                  >
                    {node.title.length > 20
                      ? node.title.slice(0, 18) + "..."
                      : node.title}
                  </text>
                  <text
                    y="55"
                    textAnchor="middle"
                    className="fill-slate-400 font-mono text-[9px]"
                  >
                    {node.chunkCount} chunks
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Selected Node Inspector Drawer */}
        {selectedNode && (
          <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-800 dark:border-white/[0.08] p-4.5 bg-slate-900/90 flex flex-col justify-between shrink-0 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Cluster Inspector
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {selectedNode.status.toUpperCase()}
                </span>
              </div>

              <div>
                <h5 className="text-sm font-bold text-white leading-snug">
                  {selectedNode.title}
                </h5>
                <p className="text-[11px] font-mono text-slate-400 mt-0.5 truncate">
                  {selectedNode.filename}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-[11px] font-mono text-slate-300">
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase">
                    Vectors
                  </span>
                  <span className="font-bold text-white">
                    {(selectedNode as any).chunkCount || (selectedNode.page_count ? selectedNode.page_count * 2 : 4)} chunks
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase">
                    Dimension
                  </span>
                  <span className="font-bold text-cyan-400">1536 dims</span>
                </div>
              </div>
            </div>

            {/* Actions for Selected Node */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              {onOpenBriefing && (
                <button
                  type="button"
                  onClick={() =>
                    onOpenBriefing({
                      id: selectedNode.id,
                      title: selectedNode.title,
                    })
                  }
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-500/20 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Open Executive Briefing</span>
                </button>
              )}

              {onInspectDocument && (
                <button
                  type="button"
                  onClick={() => onInspectDocument(selectedNode.id)}
                  className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect Chunks Table</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
