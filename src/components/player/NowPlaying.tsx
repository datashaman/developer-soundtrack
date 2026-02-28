"use client";

import type { Commit, CIStatus } from "@/types";

/** Language color map */
const LANGUAGE_COLORS: Record<string, string> = {
  Python: "#3572A5",
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Rust: "#dea584",
  Go: "#00ADD8",
  Java: "#b07219",
  C: "#555555",
  "C++": "#f34b7d",
  Ruby: "#701516",
  CSS: "#563d7c",
  HTML: "#e34c26",
  Shell: "#89e051",
  Markdown: "#083fa1",
  Other: "#00ffc8",
};

/** CI status display configuration */
const CI_DISPLAY: Record<
  CIStatus,
  { label: string; color: string; icon: "check" | "x" | "clock" | "question" }
> = {
  pass: { label: "Passed", color: "#22c55e", icon: "check" },
  fail: { label: "Failed", color: "#ef4444", icon: "x" },
  pending: { label: "Pending", color: "#eab308", icon: "clock" },
  unknown: { label: "Unknown", color: "#6b7280", icon: "question" },
};

function CIIcon({ type, color }: { type: "check" | "x" | "clock" | "question"; color: string }) {
  switch (type) {
    case "check":
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M3.5 7L6 9.5L10.5 4.5"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "x":
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M4 4L10 10M10 4L4 10"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "clock":
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="5" stroke={color} strokeWidth="1.2" />
          <path d="M7 4.5V7L8.5 8.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case "question":
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="5" stroke={color} strokeWidth="1.2" />
          <path
            d="M5.5 5.5C5.5 4.67 6.17 4 7 4C7.83 4 8.5 4.67 8.5 5.5C8.5 6.33 7 6.5 7 7.5"
            stroke={color}
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <circle cx="7" cy="9.5" r="0.5" fill={color} />
        </svg>
      );
  }
}

interface NowPlayingProps {
  currentCommit: Commit | null;
}

export function NowPlaying({ currentCommit }: NowPlayingProps) {
  if (!currentCommit) {
    return (
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5">
        <p className="text-sm text-white/30 text-center font-mono">
          Press play to start the soundtrack
        </p>
      </div>
    );
  }

  const ci = CI_DISPLAY[currentCommit.ciStatus];
  const langColor = LANGUAGE_COLORS[currentCommit.primaryLanguage] ?? LANGUAGE_COLORS.Other;

  return (
    <div
      key={currentCommit.id}
      className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 animate-[nowPlayingIn_0.3s_ease-out]"
    >
      <style>{`
        @keyframes nowPlayingIn {
          from { opacity: 0.4; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="flex flex-col gap-3">
        {/* Author + message */}
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-mono font-bold text-[#00ffc8]">
            {currentCommit.author.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-mono font-semibold text-white/90">
              {currentCommit.author}
            </p>
            <p className="text-sm text-white/60 line-clamp-2">
              {currentCommit.message}
            </p>
          </div>
        </div>

        {/* Language, diff stats, CI status */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          {/* Language icon + name */}
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: langColor }}
            />
            <span className="text-white/70">{currentCommit.primaryLanguage}</span>
          </span>

          {/* Diff stats */}
          <span>
            <span className="text-green-400">+{currentCommit.stats.additions}</span>{" "}
            <span className="text-red-400">&minus;{currentCommit.stats.deletions}</span>
          </span>

          {/* CI status badge */}
          <span className="flex items-center gap-1">
            <CIIcon type={ci.icon} color={ci.color} />
            <span style={{ color: ci.color }}>{ci.label}</span>
          </span>
        </div>

        {/* Musical info */}
        <div className="text-xs font-mono text-white/40">
          {currentCommit.musicalParams.instrument} &rarr;{" "}
          {currentCommit.musicalParams.note}{" "}
          {currentCommit.musicalParams.scale},{" "}
          {currentCommit.musicalParams.duration.toFixed(2)}s, pan:{" "}
          {currentCommit.musicalParams.pan.toFixed(1)}
        </div>
      </div>
    </div>
  );
}
