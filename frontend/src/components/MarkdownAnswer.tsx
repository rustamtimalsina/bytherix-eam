"use client";

import React, { useState } from "react";
import { Check, Copy, ChevronDown, ChevronRight, Brain } from "lucide-react";

interface MarkdownAnswerProps {
  content: string;
  isStreaming?: boolean;
  onCitationClick?: (sourceTag: string) => void;
}

// Simple fast syntax highlighter regex rules
function highlightSyntax(code: string): React.ReactNode[] {
  const lines = code.split("\n");

  const KEYWORDS = new Set([
    "def", "class", "return", "import", "from", "as", "if", "elif", "else",
    "for", "while", "try", "except", "finally", "with", "yield", "async", "await",
    "const", "let", "var", "function", "export", "default", "type", "interface",
    "true", "false", "null", "undefined", "None", "True", "False", "SELECT", "FROM",
    "WHERE", "INSERT", "UPDATE", "DELETE", "JOIN", "GROUP", "BY", "ORDER"
  ]);

  return lines.map((line, lineIdx) => {
    // Check for comment
    const isPythonOrBashComment = line.trim().startsWith("#");
    const isJsComment = line.trim().startsWith("//");

    if (isPythonOrBashComment || isJsComment) {
      return (
        <div key={lineIdx} className="table-row">
          <span className="table-cell select-none pr-4 text-right text-[10px] text-slate-500/60 font-mono">
            {lineIdx + 1}
          </span>
          <span className="table-cell text-slate-400 dark:text-slate-500 italic">
            {line}
          </span>
        </div>
      );
    }

    // Tokenize line by strings and words
    const tokens = line.split(/("[^"]*"|'[^']*'|`[^`]*`|\s+|[(),.:;{}[\],])/g);

    return (
      <div key={lineIdx} className="table-row">
        <span className="table-cell select-none pr-4 text-right text-[10px] text-slate-500/60 font-mono">
          {lineIdx + 1}
        </span>
        <span className="table-cell">
          {tokens.map((tok, tokIdx) => {
            if (!tok) return null;
            if (
              (tok.startsWith('"') && tok.endsWith('"')) ||
              (tok.startsWith("'") && tok.endsWith("'")) ||
              (tok.startsWith("`") && tok.endsWith("`"))
            ) {
              return (
                <span key={tokIdx} className="text-emerald-600 dark:text-emerald-400">
                  {tok}
                </span>
              );
            }
            if (KEYWORDS.has(tok)) {
              return (
                <span key={tokIdx} className="text-purple-600 dark:text-purple-400 font-bold">
                  {tok}
                </span>
              );
            }
            if (/^\d+(\.\d+)?$/.test(tok)) {
              return (
                <span key={tokIdx} className="text-amber-600 dark:text-amber-400 font-mono">
                  {tok}
                </span>
              );
            }
            return <span key={tokIdx}>{tok}</span>;
          })}
        </span>
      </div>
    );
  });
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayLang = language.trim() || "code";

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-900 text-slate-100 shadow-md">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-950/80 border-b border-white/10 text-xs font-mono">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider ml-1">
            {displayLang}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-mono text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-bold">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Body */}
      <div className="p-3.5 overflow-x-auto text-[11.5px] font-mono leading-relaxed select-text">
        <div className="table w-full">
          {highlightSyntax(code)}
        </div>
      </div>
    </div>
  );
}

function ThinkingBlock({ thinkingText }: { thinkingText: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="my-2.5 rounded-xl border border-indigo-200/80 dark:border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-950/20 overflow-hidden transition-all">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3.5 py-2 text-left text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100/50 dark:hover:bg-indigo-900/30 transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <Brain className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
          <span>Thought Process & Retrieval Reasoning</span>
        </span>
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 text-indigo-500" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-indigo-500" />
        )}
      </button>

      {isOpen && (
        <div className="px-3.5 py-2.5 border-t border-indigo-200/60 dark:border-indigo-500/20 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed space-y-1.5 whitespace-pre-wrap font-mono bg-white/40 dark:bg-black/20">
          {thinkingText}
        </div>
      )}
    </div>
  );
}

export function MarkdownAnswer({ content, isStreaming, onCitationClick }: MarkdownAnswerProps) {
  if (!content) return null;

  // Extract <think>...</think> if present
  let processedContent = content;
  let thinkingContent: string | null = null;

  const thinkMatch = processedContent.match(/<think>([\s\S]*?)<\/think>/);
  if (thinkMatch) {
    thinkingContent = thinkMatch[1].trim();
    processedContent = processedContent.replace(/<think>[\s\S]*?<\/think>/, "").trim();
  }

  // Parse fenced code blocks: ```lang ... ```
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  const blocks: Array<{ type: "text" | "code"; content: string; language?: string }> = [];

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(processedContent)) !== null) {
    const textBefore = processedContent.slice(lastIndex, match.index);
    if (textBefore) {
      blocks.push({ type: "text", content: textBefore });
    }
    blocks.push({
      type: "code",
      language: match[1] || "text",
      content: match[2].trimEnd(),
    });
    lastIndex = match.index + match[0].length;
  }

  const remainingText = processedContent.slice(lastIndex);
  if (remainingText) {
    blocks.push({ type: "text", content: remainingText });
  }

  const renderInlineStyles = (line: string, keyPrefix: string): React.ReactNode => {
    // 1. Source citations [Source: ...]
    const citationParts = line.split(/(\[Source:[^\]]+\])/g);

    return citationParts.map((sub, sIdx) => {
      if (sub.startsWith("[Source:") && sub.endsWith("]")) {
        const sourceLabel = sub.slice(1, -1);
        return (
          <button
            type="button"
            key={`${keyPrefix}-cite-${sIdx}`}
            onClick={() => onCitationClick && onCitationClick(sourceLabel)}
            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 mx-1 hover:bg-indigo-500/20 transition-colors cursor-pointer"
            title="Click to inspect citation in slide-over drawer"
          >
            {sourceLabel}
          </button>
        );
      }

      // 2. Bold text **text**
      const boldParts = sub.split(/(\*\*[^*]+\*\*)/g);
      return boldParts.map((bPart, bIdx) => {
        if (bPart.startsWith("**") && bPart.endsWith("**")) {
          return (
            <strong key={`${keyPrefix}-b-${sIdx}-${bIdx}`} className="font-bold text-slate-900 dark:text-white">
              {bPart.slice(2, -2)}
            </strong>
          );
        }

        // 3. Inline code `code`
        const codeParts = bPart.split(/(`[^`]+`)/g);
        return codeParts.map((cPart, cIdx) => {
          if (cPart.startsWith("`") && cPart.endsWith("`")) {
            return (
              <code
                key={`${keyPrefix}-c-${sIdx}-${bIdx}-${cIdx}`}
                className="px-1.5 py-0.5 mx-0.5 rounded font-mono text-[11px] bg-slate-100 dark:bg-white/[0.08] text-indigo-600 dark:text-indigo-400 border border-slate-200/80 dark:border-white/10"
              >
                {cPart.slice(1, -1)}
              </code>
            );
          }
          return <span key={`${keyPrefix}-t-${sIdx}-${bIdx}-${cIdx}`}>{cPart}</span>;
        });
      });
    });
  };

  const renderTextParagraphs = (rawText: string, blockIdx: number) => {
    const lines = rawText.split("\n");

    return lines.map((line, lIdx) => {
      const trimmed = line.trim();
      const key = `b${blockIdx}-l${lIdx}`;

      if (!trimmed) {
        return <div key={key} className="h-2" />;
      }

      // Headers
      if (trimmed.startsWith("### ")) {
        return (
          <h4 key={key} className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-3 mb-1.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" />
            {renderInlineStyles(trimmed.slice(4), key)}
          </h4>
        );
      }
      if (trimmed.startsWith("## ")) {
        return (
          <h3 key={key} className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-4 mb-2 pb-1 border-b border-slate-200/60 dark:border-white/10">
            {renderInlineStyles(trimmed.slice(3), key)}
          </h3>
        );
      }
      if (trimmed.startsWith("# ")) {
        return (
          <h2 key={key} className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-4 mb-2">
            {renderInlineStyles(trimmed.slice(2), key)}
          </h2>
        );
      }

      // Blockquote
      if (trimmed.startsWith("> ")) {
        return (
          <blockquote key={key} className="my-2 pl-3 border-l-2 border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20 py-1 text-slate-600 dark:text-slate-400 italic text-xs">
            {renderInlineStyles(trimmed.slice(2), key)}
          </blockquote>
        );
      }

      // Bullet lists
      const isBullet = trimmed.startsWith("•") || trimmed.startsWith("- ") || trimmed.startsWith("* ");
      if (isBullet) {
        const contentStr = trimmed.replace(/^[•\-\*]\s*/, "");
        return (
          <div key={key} className="flex items-start gap-2 ml-1 my-1">
            <span className="text-indigo-500 font-bold leading-5 select-none">•</span>
            <span className="leading-relaxed flex-1">{renderInlineStyles(contentStr, key)}</span>
          </div>
        );
      }

      // Numbered lists (1., 2., etc)
      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
      if (numMatch) {
        return (
          <div key={key} className="flex items-start gap-2 ml-1 my-1">
            <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-1 rounded select-none mt-0.5">
              {numMatch[1]}.
            </span>
            <span className="leading-relaxed flex-1">{renderInlineStyles(numMatch[2], key)}</span>
          </div>
        );
      }

      return (
        <p key={key} className="leading-relaxed my-0.5">
          {renderInlineStyles(line, key)}
        </p>
      );
    });
  };

  return (
    <div className="space-y-1 text-slate-800 dark:text-slate-200">
      {thinkingContent && <ThinkingBlock thinkingText={thinkingContent} />}

      {blocks.map((block, idx) => {
        if (block.type === "code") {
          return <CodeBlock key={idx} code={block.content} language={block.language || "code"} />;
        }
        return <React.Fragment key={idx}>{renderTextParagraphs(block.content, idx)}</React.Fragment>;
      })}

      {isStreaming && (
        <span className="inline-block w-1.5 h-3.5 ml-1 bg-indigo-500 animate-pulse rounded-sm align-middle" />
      )}
    </div>
  );
}
