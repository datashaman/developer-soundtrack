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
    <div className="rounded-xl bg-surface border border-border-subtle overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border-subtle">
        <h2 className="text-xs font-mono font-semibold text-text-muted uppercase tracking-wider">
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
              className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-list-hover transition-colors border-b border-list-border last:border-b-0 min-h-11 ${
                isActive ? "bg-surface-active" : ""
              }`}
            >
              <span
                className={`text-xs font-mono w-5 text-right shrink-0 ${
                  isActive ? "text-accent" : "text-text-ghost"
                }`}
              >
                {idx + 1}
              </span>
              <LanguageIcon language={commit.primaryLanguage} size={8} />
              <div className="min-w-0 flex-1">
                <p
                  className={`text-xs font-mono truncate ${
                    isActive ? "text-foreground" : "text-text-muted"
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
                <span className="text-xs font-mono text-text-dim">
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
