"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { exportToWav } from "@/lib/music/export";
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

  const { commits, isLoading, error, hasMore, total, rateLimitRemaining, loadMore, retry } = useCommits({
    repo: fullName,
    from: from ?? undefined,
    to: to ?? undefined,
  });

  // Sample commits for large repos (every Nth commit)
  const [sampleEvery, setSampleEvery] = useState<1 | 2 | 5 | 10>(1);
  const displayCommits = useMemo(() => {
    if (sampleEvery === 1) return commits;
    return commits.filter((_, i) => i % sampleEvery === 0);
  }, [commits, sampleEvery]);

  const {
    isPlaying,
    currentCommit,
    currentIndex,
    audioError,
    play,
    pause,
    resume,
    stop,
    seekTo,
    setTempo,
    setVolume,
    setEnabledLanguages,
    getWaveformData,
    getTempo,
    getVolume,
  } = useMusicEngine();

  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

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
    commitsRef.current = displayCommits;
  }, [displayCommits]);

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

  // Reset sampling when commits change significantly
  useEffect(() => {
    if (commits.length <= 200 && sampleEvery !== 1) {
      setSampleEvery(1);
    }
  }, [commits.length, sampleEvery]);

  // Stop playback when sample rate changes (commit list changes)
  const sampleEveryRef = useRef(sampleEvery);
  useEffect(() => {
    if (sampleEveryRef.current !== sampleEvery) {
      sampleEveryRef.current = sampleEvery;
      stop();
      hasStartedRef.current = false;
    }
  }, [sampleEvery, stop]);

  const handleShare = useCallback(async () => {
    if (displayCommits.length === 0) return;
    const params = new URLSearchParams();
    params.set("repo", fullName);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (range) params.set("range", range);
    params.set("tempo", String(getTempo()));
    params.set("volume", String(getVolume()));
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/share?${params.toString()}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // fallback: open in new tab so user can copy manually
      window.open(url, "_blank");
    }
  }, [displayCommits.length, fullName, from, to, range, getTempo, getVolume]);

  const handleExport = useCallback(async () => {
    if (displayCommits.length === 0) return;
    setExportError(null);
    setExportProgress(0);
    try {
      const filename = `soundtrack-${fullName.replace("/", "-")}-${new Date().toISOString().slice(0, 10)}.wav`;
      await exportToWav(
        displayCommits,
        { tempo: getTempo(), volume: getVolume() },
        filename,
        (p) => setExportProgress(p)
      );
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExportProgress(null);
    }
  }, [displayCommits, fullName, getTempo, getVolume]);

  // Compute unique active languages for instrument legend
  const activeLanguages = Array.from(new Set(displayCommits.map((c) => c.primaryLanguage)));

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
                ? total != null && total > 0
                  ? `Loading ${total.toLocaleString()} commits...`
                  : "Loading commits..."
                : `${displayCommits.length}${sampleEvery > 1 ? ` of ${commits.length}` : ""} commits · ${formatDateRange(from, to, range)}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {displayCommits.length > 0 && (
            <>
              <button
                onClick={handleShare}
                className="min-h-11 px-3 rounded-lg bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20 hover:border-accent/50 font-mono text-sm transition-colors flex items-center gap-2"
                aria-label="Share link"
              >
                {shareCopied ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                    </svg>
                    Share
                  </>
                )}
              </button>
              <button
                onClick={handleExport}
              disabled={exportProgress !== null}
              className="min-h-11 px-3 rounded-lg bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20 hover:border-accent/50 font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              aria-label="Export to WAV"
            >
              {exportProgress !== null ? (
                <>
                  <span className="inline-block h-4 w-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <span>{exportProgress < 1 ? "Rendering..." : "Downloading..."}</span>
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Export WAV
                </>
              )}
            </button>
            </>
          )}
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
            <p className="text-sm text-text-faint font-mono">
              {total != null && total > 0
                ? `Loading ${total.toLocaleString()} commits...`
                : "Loading commits..."}
            </p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center">
            <p className="text-sm text-red-400 font-mono">{error}</p>
            <button
              onClick={retry}
              className="mt-3 text-sm text-accent hover:text-accent-hover font-mono underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Rate limit warning */}
        {rateLimitRemaining !== null && rateLimitRemaining < 100 && (
          <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 mb-4 text-center">
            <p className="text-sm text-yellow-400 font-mono">
              GitHub API rate limit is low: {rateLimitRemaining} calls remaining.
              Data may be served from cache.
            </p>
          </div>
        )}

        {/* Export error */}
        {exportError && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 mb-4 text-center">
            <p className="text-sm text-red-400 font-mono">{exportError}</p>
          </div>
        )}

        {/* Audio error */}
        {audioError && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 mb-4 text-center">
            <p className="text-sm text-red-400 font-mono">{audioError}</p>
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
            {/* Sample option for large repos */}
            {commits.length > 200 && (
              <div className="rounded-xl bg-surface border border-border-subtle p-3 flex flex-wrap items-center gap-3">
                <span className="text-xs text-text-faint font-mono">Sample commits:</span>
                <select
                  value={sampleEvery}
                  onChange={(e) => setSampleEvery(Number(e.target.value) as 1 | 2 | 5 | 10)}
                  className="bg-background border border-border-subtle rounded px-2 py-1.5 text-sm font-mono text-foreground"
                  aria-label="Sample every Nth commit"
                >
                  <option value={1}>All ({commits.length})</option>
                  <option value={2}>Every 2nd (~{Math.ceil(commits.length / 2)})</option>
                  <option value={5}>Every 5th (~{Math.ceil(commits.length / 5)})</option>
                  <option value={10}>Every 10th (~{Math.ceil(commits.length / 10)})</option>
                </select>
              </div>
            )}

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
                totalCommits={displayCommits.length}
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
                commits={displayCommits}
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
                commits={displayCommits}
                currentCommitId={currentCommit?.id ?? null}
                onSeek={handleSeek}
              />
            </div>

            {/* Instrument Legend */}
            <InstrumentLegend activeLanguages={activeLanguages} />

            {/* Load more for large repos */}
            {hasMore && (
              <div className="flex justify-center py-4">
                <button
                  onClick={loadMore}
                  disabled={isLoading}
                  className="min-h-11 px-4 rounded-lg bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20 hover:border-accent/50 font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? "Loading..." : `Load more (${commits.length}${total != null ? ` of ${total.toLocaleString()}` : ""} loaded)`}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Mobile: Compact now-playing bottom bar (fixed) */}
      {displayCommits.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-20 md:hidden">
          <NowPlaying currentCommit={currentCommit} compact />
        </div>
      )}
    </div>
  );
}
