"use client";

import type { Commit } from "@/types";
import { LanguageIcon } from "@/components/shared/LanguageIcon";
import { DiffStats } from "@/components/shared/DiffStats";

interface MobileCommitListProps {
  commits: Commit[];
  currentCommitId: string | null;
  onSeek: (index: number) => void;
}

/**
 * Vertical scrolling commit list for mobile (<768px).
 * Replaces the horizontal Timeline on small screens.
 */
export function MobileCommitList({
  commits,
  currentCommitId,
  onSeek,
}: MobileCommitListProps) {
  if (commits.length === 0) return null;

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-white/[0.06]">
        <h2 className="text-xs font-mono font-semibold text-white/50 uppercase tracking-wider">
          Commits ({commits.length})
        </h2>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {commits.map((commit, idx) => {
          const isActive = commit.id === currentCommitId;
          return (
            <button
              key={commit.id}
              onClick={() => onSeek(idx)}
              className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/[0.04] transition-colors border-b border-white/[0.03] last:border-b-0 min-h-11 ${
                isActive ? "bg-white/[0.06]" : ""
              }`}
            >
              <span
                className={`text-xs font-mono w-5 text-right shrink-0 ${
                  isActive ? "text-[#00ffc8]" : "text-white/30"
                }`}
              >
                {idx + 1}
              </span>
              <LanguageIcon language={commit.primaryLanguage} size={8} />
              <div className="min-w-0 flex-1">
                <p
                  className={`text-xs font-mono truncate ${
                    isActive ? "text-white" : "text-white/60"
                  }`}
                >
                  {commit.message}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <DiffStats
                  additions={commit.stats.additions}
                  deletions={commit.stats.deletions}
                />
                <span className="text-xs font-mono text-white/20">
                  {commit.author}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
