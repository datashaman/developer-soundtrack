"use client";

import type { Commit } from "@/types";
import { LanguageIcon } from "@/components/shared/LanguageIcon";
import { CIBadge } from "@/components/shared/CIBadge";
import { DiffStats } from "@/components/shared/DiffStats";

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
          <LanguageIcon language={currentCommit.primaryLanguage} showLabel />

          <DiffStats
            additions={currentCommit.stats.additions}
            deletions={currentCommit.stats.deletions}
          />

          <CIBadge status={currentCommit.ciStatus} />
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
