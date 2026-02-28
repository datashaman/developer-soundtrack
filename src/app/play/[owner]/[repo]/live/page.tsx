"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLiveCommits } from "@/hooks/useLiveCommits";
import { useMusicEngine } from "@/hooks/useMusicEngine";
import { WaveformVisualizer } from "@/components/player/WaveformVisualizer";
import { NowPlaying } from "@/components/player/NowPlaying";
import { Timeline } from "@/components/player/Timeline";
import { MobileCommitList } from "@/components/player/MobileCommitList";
import { InstrumentLegend } from "@/components/player/InstrumentLegend";
import type { Commit } from "@/types";

export default function LivePlayerPage() {
  const params = useParams<{ owner: string; repo: string }>();
  const owner = params.owner;
  const repo = params.repo;
  const fullName = `${owner}/${repo}`;

  const { latestCommit, isConnected, error } = useLiveCommits(fullName);

  const {
    isPlaying,
    currentCommit,
    play,
    setVolume,
    getWaveformData,
  } = useMusicEngine();

  // Accumulate live commits — adjust state during render (React recommended pattern)
  const [liveCommits, setLiveCommits] = useState<Commit[]>([]);
  const [prevLatestId, setPrevLatestId] = useState<string | null>(null);

  if (latestCommit && latestCommit.id !== prevLatestId) {
    setPrevLatestId(latestCommit.id);
    if (!liveCommits.some((c) => c.id === latestCommit.id)) {
      setLiveCommits([...liveCommits, latestCommit]);
    }
  }

  // Play each new commit immediately when received
  const playedIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!latestCommit) return;
    if (playedIdRef.current === latestCommit.id) return;
    playedIdRef.current = latestCommit.id;
    play([latestCommit], 0);
  }, [latestCommit, play]);

  const handleSeek = useCallback(
    (index: number) => {
      if (index < 0 || index >= liveCommits.length) return;
      play([liveCommits[index]], 0);
    },
    [liveCommits, play],
  );

  // Compute unique active languages for instrument legend
  const activeLanguages = Array.from(
    new Set(liveCommits.map((c) => c.primaryLanguage)),
  );

  return (
    <div className="min-h-screen bg-background text-foreground md:pb-0 pb-14">
      {/* Header bar */}
      <header className="mx-auto max-w-4xl px-4 pt-4 pb-3 md:pt-6 md:pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/play/${owner}/${repo}`}
            className="min-h-11 min-w-11 md:min-h-0 md:min-w-0 flex items-center justify-center text-text-faint hover:text-text-secondary transition-colors shrink-0"
            aria-label="Back to player"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" />
            </svg>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base md:text-lg font-bold tracking-tight text-accent font-mono truncate">
                {fullName}
              </h1>
              {/* Pulsing dot indicator for live mode */}
              <span className="relative flex h-2.5 w-2.5 shrink-0" data-testid="live-indicator">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent" />
              </span>
              <span className="text-xs font-mono text-accent uppercase tracking-wider">
                Live
              </span>
            </div>
            <p className="text-xs text-text-faint font-mono">
              {liveCommits.length} commits received
              {!isConnected && error ? " · Reconnecting..." : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Volume control */}
          <div className="flex items-center gap-1.5">
            <svg
              width="16"
              height="16"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="text-text-faint"
            >
              <path
                fillRule="evenodd"
                d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z"
                clipRule="evenodd"
              />
            </svg>
            <input
              type="range"
              min="0"
              max="100"
              defaultValue="80"
              className="w-16 md:w-20 accent-accent"
              aria-label="Volume"
              onChange={(e) => setVolume(Number(e.target.value) / 100)}
            />
          </div>
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
        {/* Connection error */}
        {error && (
          <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 mb-4 text-center">
            <p className="text-sm text-yellow-400 font-mono">{error}</p>
          </div>
        )}

        {/* Waveform Visualizer — always shown */}
        <div className="rounded-xl bg-surface border border-border-subtle overflow-hidden mb-4 md:mb-6">
          <WaveformVisualizer
            getWaveformData={getWaveformData}
            isPlaying={isPlaying}
            currentLanguage={currentCommit?.primaryLanguage}
          />
        </div>

        {/* Waiting for commits idle state */}
        {liveCommits.length === 0 && isConnected && (
          <div className="flex flex-col items-center justify-center py-16 gap-4" data-testid="waiting-state">
            {/* Pulsing circle animation */}
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-2 border-accent/30 animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-4 w-4 rounded-full bg-accent/60 animate-ping" />
              </div>
            </div>
            <p className="text-sm text-text-faint font-mono">
              Waiting for commits...
            </p>
            <p className="text-xs text-text-dim font-mono">
              Push to <span className="text-accent">{fullName}</span> to hear it
              live
            </p>
          </div>
        )}

        {/* Connecting state */}
        {!isConnected && !error && liveCommits.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-text-faint font-mono">
              Connecting to live stream...
            </p>
          </div>
        )}

        {/* Player content — shown when we have commits */}
        {liveCommits.length > 0 && (
          <div className="flex flex-col gap-4 md:gap-6">
            {/* Desktop: Now Playing above Timeline */}
            <div className="hidden lg:block">
              <NowPlaying currentCommit={currentCommit} />
            </div>

            {/* Horizontal Timeline — hidden on mobile, shown on md+ */}
            <div className="hidden md:block">
              <Timeline
                commits={liveCommits}
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
                commits={liveCommits}
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
      {liveCommits.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-20 md:hidden">
          <NowPlaying currentCommit={currentCommit} compact />
        </div>
      )}
    </div>
  );
}
