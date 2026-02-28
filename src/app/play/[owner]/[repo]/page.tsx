"use client";

import { useCallback, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCommits } from "@/hooks/useCommits";
import { useMusicEngine } from "@/hooks/useMusicEngine";
import { WaveformVisualizer } from "@/components/player/WaveformVisualizer";
import { TransportControls } from "@/components/player/TransportControls";
import { NowPlaying } from "@/components/player/NowPlaying";
import { Timeline } from "@/components/player/Timeline";
import { MobileCommitList } from "@/components/player/MobileCommitList";
import { InstrumentLegend } from "@/components/player/InstrumentLegend";
import { LiveModeToggle } from "@/components/player/LiveModeToggle";
import type { Commit } from "@/types";

function formatDateRange(from: string | null, to: string | null, range: string | null): string {
  if (range === "today") return "Today";
  if (range === "week") return "This week";
  if (range === "sprint") return "This sprint";
  if (from && to) {
    const f = new Date(from).toLocaleDateString();
    const t = new Date(to).toLocaleDateString();
    return `${f} — ${t}`;
  }
  if (from) return `Since ${new Date(from).toLocaleDateString()}`;
  return "All time";
}

export default function PlayerPage() {
  const params = useParams<{ owner: string; repo: string }>();
  const searchParams = useSearchParams();
  const owner = params.owner;
  const repo = params.repo;
  const fullName = `${owner}/${repo}`;

  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const range = searchParams.get("range");

  const { commits, isLoading, error } = useCommits({
    repo: fullName,
    from: from ?? undefined,
    to: to ?? undefined,
  });

  const {
    isPlaying,
    currentCommit,
    currentIndex,
    play,
    pause,
    resume,
    stop,
    seekTo,
    setTempo,
    setVolume,
    setEnabledLanguages,
    getWaveformData,
  } = useMusicEngine();

  // Load enabled languages from user settings
  useEffect(() => {
    let cancelled = false;
    async function loadSettings() {
      try {
        const response = await fetch("/api/settings");
        if (!response.ok || cancelled) return;
        const data = await response.json();
        if (!cancelled) {
          setEnabledLanguages(data.settings?.enabledLanguages ?? []);
        }
      } catch {
        // Use defaults (all enabled)
      }
    }
    loadSettings();
    return () => { cancelled = true; };
  }, [setEnabledLanguages]);

  const hasStartedRef = useRef(false);
  const commitsRef = useRef<Commit[]>([]);
  useEffect(() => {
    commitsRef.current = commits;
  }, [commits]);

  const handlePlay = useCallback(async () => {
    if (commitsRef.current.length === 0) return;
    if (hasStartedRef.current) {
      resume();
    } else {
      hasStartedRef.current = true;
      await play(commitsRef.current);
    }
  }, [play, resume]);

  const handleStop = useCallback(() => {
    stop();
    hasStartedRef.current = false;
  }, [stop]);

  const handleSeek = useCallback(
    (index: number) => {
      if (commitsRef.current.length === 0) return;
      if (!hasStartedRef.current) {
        hasStartedRef.current = true;
        play(commitsRef.current, index);
      } else {
        seekTo(index);
      }
    },
    [play, seekTo],
  );

  // Compute unique active languages for instrument legend
  const activeLanguages = Array.from(new Set(commits.map((c) => c.primaryLanguage)));

  return (
    <div className="min-h-screen bg-background text-foreground md:pb-0 pb-14">
      {/* Header bar */}
      <header className="mx-auto max-w-4xl px-4 pt-4 pb-3 md:pt-6 md:pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            className="min-h-11 min-w-11 md:min-h-0 md:min-w-0 flex items-center justify-center text-text-faint hover:text-text-secondary transition-colors shrink-0"
            aria-label="Back to dashboard"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" />
            </svg>
          </Link>
          <div className="min-w-0">
            <h1 className="text-base md:text-lg font-bold tracking-tight text-accent font-mono truncate">
              {fullName}
            </h1>
            <p className="text-xs text-text-faint font-mono">
              {isLoading
                ? "Loading commits..."
                : `${commits.length} commits · ${formatDateRange(from, to, range)}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <LiveModeToggle owner={owner} repo={repo} />
          <Link
            href="/settings"
            className="min-h-11 min-w-11 md:min-h-0 md:min-w-0 md:p-2 flex items-center justify-center rounded-lg text-text-faint hover:text-foreground hover:bg-progress-bg transition-colors shrink-0"
            aria-label="Settings"
          >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
              clipRule="evenodd"
            />
            </svg>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pb-8">
        {/* Loading state */}
        {isLoading && commits.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-text-faint font-mono">Loading commits...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center">
            <p className="text-sm text-red-400 font-mono">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && commits.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <svg width="48" height="48" viewBox="0 0 48 48" className="text-text-dim">
              <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" fill="none" />
              <path d="M16 24h16M24 16v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <p className="text-sm text-text-faint font-mono">No commits found in this time range</p>
            <Link
              href="/"
              className="text-sm text-accent hover:underline font-mono"
            >
              Back to dashboard
            </Link>
          </div>
        )}

        {/* Player content */}
        {commits.length > 0 && (
          <div className="flex flex-col gap-4 md:gap-6">
            {/* Waveform Visualizer */}
            <div className="rounded-xl bg-surface border border-border-subtle overflow-hidden">
              <WaveformVisualizer
                getWaveformData={getWaveformData}
                isPlaying={isPlaying}
                currentLanguage={currentCommit?.primaryLanguage}
              />
            </div>

            {/* Transport Controls */}
            <div className="rounded-xl bg-surface border border-border-subtle">
              <TransportControls
                isPlaying={isPlaying}
                currentIndex={currentIndex}
                totalCommits={commits.length}
                onPlay={handlePlay}
                onPause={pause}
                onStop={handleStop}
                onSeek={handleSeek}
                onTempoChange={setTempo}
                onVolumeChange={setVolume}
              />
            </div>

            {/* Desktop: Now Playing above Timeline */}
            <div className="hidden lg:block">
              <NowPlaying currentCommit={currentCommit} />
            </div>

            {/* Horizontal Timeline — hidden on mobile, shown on md+ */}
            <div className="hidden md:block">
              <Timeline
                commits={commits}
                currentCommitId={currentCommit?.id ?? null}
                onSeek={handleSeek}
              />
            </div>

            {/* Tablet (md to lg): Now Playing stacks below Timeline */}
            <div className="hidden md:block lg:hidden">
              <NowPlaying currentCommit={currentCommit} />
            </div>

            {/* Mobile: Vertical scrolling commit list replaces Timeline */}
            <div className="block md:hidden">
              <MobileCommitList
                commits={commits}
                currentCommitId={currentCommit?.id ?? null}
                onSeek={handleSeek}
              />
            </div>

            {/* Instrument Legend */}
            <InstrumentLegend activeLanguages={activeLanguages} />
          </div>
        )}
      </main>

      {/* Mobile: Compact now-playing bottom bar (fixed) */}
      {commits.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-20 md:hidden">
          <NowPlaying currentCommit={currentCommit} compact />
        </div>
      )}
    </div>
  );
}
