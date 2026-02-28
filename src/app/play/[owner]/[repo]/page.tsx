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
import { InstrumentLegend } from "@/components/player/InstrumentLegend";
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
    getWaveformData,
  } = useMusicEngine();

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
    <div className="min-h-screen bg-[#0a0a0e] text-white">
      {/* Header bar */}
      <header className="mx-auto max-w-4xl px-4 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            className="text-white/40 hover:text-white/70 transition-colors shrink-0"
            aria-label="Back to dashboard"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" />
            </svg>
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight text-[#00ffc8] font-mono truncate">
              {fullName}
            </h1>
            <p className="text-xs text-white/40 font-mono">
              {isLoading
                ? "Loading commits..."
                : `${commits.length} commits · ${formatDateRange(from, to, range)}`}
            </p>
          </div>
        </div>
        <Link
          href="/settings"
          className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors shrink-0"
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
      </header>

      <main className="mx-auto max-w-4xl px-4 pb-8">
        {/* Loading state */}
        {isLoading && commits.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="h-8 w-8 border-2 border-[#00ffc8] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-white/40 font-mono">Loading commits...</p>
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
            <svg width="48" height="48" viewBox="0 0 48 48" className="text-white/20">
              <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" fill="none" />
              <path d="M16 24h16M24 16v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <p className="text-sm text-white/40 font-mono">No commits found in this time range</p>
            <Link
              href="/"
              className="text-sm text-[#00ffc8] hover:underline font-mono"
            >
              Back to dashboard
            </Link>
          </div>
        )}

        {/* Player content */}
        {commits.length > 0 && (
          <div className="flex flex-col gap-6">
            {/* Waveform Visualizer */}
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
              <WaveformVisualizer
                getWaveformData={getWaveformData}
                isPlaying={isPlaying}
                currentLanguage={currentCommit?.primaryLanguage}
              />
            </div>

            {/* Transport Controls */}
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06]">
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

            {/* Now Playing Card */}
            <NowPlaying currentCommit={currentCommit} />

            {/* Timeline */}
            <Timeline
              commits={commits}
              currentCommitId={currentCommit?.id ?? null}
              onSeek={handleSeek}
            />

            {/* Instrument Legend */}
            <InstrumentLegend activeLanguages={activeLanguages} />
          </div>
        )}
      </main>
    </div>
  );
}
