"use client";

import type { Commit } from "@/types";
import { LanguageIcon } from "@/components/shared/LanguageIcon";
import { CIBadge } from "@/components/shared/CIBadge";
import { DiffStats } from "@/components/shared/DiffStats";

interface NowPlayingProps {
  currentCommit: Commit | null;
  /** Compact mode for mobile bottom bar */
  compact?: boolean;
}

export function NowPlaying({ currentCommit, compact = false }: NowPlayingProps) {
  if (!currentCommit) {
    if (compact) return null;
    return (
      <div className="rounded-xl bg-surface border border-border-subtle p-5">
        <p className="text-sm text-text-ghost text-center font-mono">
          Press play to start the soundtrack
        </p>
      </div>
    );
  }

  if (compact) {
    return (
      <div
        key={currentCommit.id}
        className="bg-background border-t border-border-subtle px-4 py-2 animate-[nowPlayingIn_0.3s_ease-out]"
      >
        <style>{`
          @keyframes nowPlayingIn {
            from { opacity: 0.4; transform: translateY(4px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-progress-bg text-xs font-mono font-bold text-accent">
            {currentCommit.author.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-mono text-text-primary truncate">
              <span className="font-semibold">{currentCommit.author}</span>
              <span className="text-text-faint mx-1.5">&middot;</span>
              <span className="text-text-muted">{currentCommit.message}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <LanguageIcon language={currentCommit.primaryLanguage} size={8} />
            <CIBadge status={currentCommit.ciStatus} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      key={currentCommit.id}
      className="rounded-xl bg-surface border border-border-subtle p-5 animate-[nowPlayingIn_0.3s_ease-out]"
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
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-progress-bg text-sm font-mono font-bold text-accent">
            {currentCommit.author.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-mono font-semibold text-text-primary">
              {currentCommit.author}
            </p>
            <p className="text-sm text-text-muted line-clamp-2">
              {currentCommit.message}
            </p>
          </div>
        </div>

        {/* Language, diff stats, CI status */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          <LanguageIcon language={currentCommit.primaryLanguage} showLabel />

          <DiffStats
            additions={currentCommit.stats.additions}
            deletions={currentCommit.stats.deletions}
          />

          <CIBadge status={currentCommit.ciStatus} />
        </div>

        {/* Musical info */}
        <div className="text-xs font-mono text-text-faint">
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
