"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useMusicEngine } from "@/hooks/useMusicEngine";
import { WaveformVisualizer } from "@/components/player/WaveformVisualizer";
import { TransportControls } from "@/components/player/TransportControls";
import { NowPlaying } from "@/components/player/NowPlaying";
import { Timeline } from "@/components/player/Timeline";
import { MobileCommitList } from "@/components/player/MobileCommitList";
import { InstrumentLegend } from "@/components/player/InstrumentLegend";
import { AuthButton } from "@/components/shared/AuthButton";
import type { Commit } from "@/types";

function formatDateRange(from: string | null, to: string | null): string {
  if (from && to) {
    const f = new Date(from).toLocaleDateString();
    const t = new Date(to).toLocaleDateString();
    return `${f} — ${t}`;
  }
  if (from) return `Since ${new Date(from).toLocaleDateString()}`;
  return "All time";
}

export default function SharePage() {
  const searchParams = useSearchParams();
  const repo = searchParams.get("repo");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const tempoParam = searchParams.get("tempo");
  const volumeParam = searchParams.get("volume");

  const [commits, setCommits] = useState<Commit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tempo = tempoParam ? parseFloat(tempoParam) : 1.0;
  const volume = volumeParam ? parseFloat(volumeParam) : 0.8;

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
    getWaveformData,
  } = useMusicEngine();

  useEffect(() => {
    setTempo(Math.min(Math.max(tempo, 0.3), 5.0));
    setVolume(Math.min(Math.max(volume, 0), 1));
  }, [tempo, volume, setTempo, setVolume]);

  useEffect(() => {
    if (!repo) {
      setIsLoading(false);
      setError("Missing repo parameter");
      return;
    }

    const repoVal = repo;
    let cancelled = false;
    async function fetchCommits() {
      try {
        const params = new URLSearchParams({ repo: repoVal });
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        const res = await fetch(`/api/share?${params.toString()}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || "Failed to load soundtrack");
          setCommits([]);
          return;
        }
        setCommits(data.commits ?? []);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load soundtrack");
          setCommits([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    fetchCommits();
    return () => { cancelled = true; };
  }, [repo, from, to]);

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

  const activeLanguages = useMemo(
    () => Array.from(new Set(commits.map((c) => c.primaryLanguage))),
    [commits],
  );

  const fullName = repo ?? "";

  if (!repo) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-sm text-text-faint font-mono">Invalid share link</p>
        <Link href="/" className="text-accent hover:underline font-mono">
          Go home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground md:pb-0 pb-14">
      <header className="mx-auto max-w-4xl px-4 pt-4 pb-3 md:pt-6 md:pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            className="min-h-11 min-w-11 md:min-h-0 md:min-w-0 flex items-center justify-center text-text-faint hover:text-text-secondary transition-colors shrink-0"
            aria-label="Back to home"
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
                ? "Loading..."
                : `${commits.length} commits · ${formatDateRange(from, to)}`}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pb-8">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-text-faint font-mono">Loading soundtrack...</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center">
            <p className="text-sm text-red-400 font-mono">{error}</p>
            <Link href="/" className="mt-3 inline-block text-sm text-accent hover:underline font-mono">
              Go home
            </Link>
          </div>
        )}

        {audioError && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 mb-4 text-center">
            <p className="text-sm text-red-400 font-mono">{audioError}</p>
          </div>
        )}

        {!isLoading && !error && commits.length > 0 && (
          <div className="flex flex-col gap-4 md:gap-6">
            <div className="rounded-xl bg-surface border border-border-subtle overflow-hidden">
              <WaveformVisualizer
                getWaveformData={getWaveformData}
                isPlaying={isPlaying}
                currentLanguage={currentCommit?.primaryLanguage}
              />
            </div>

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
                initialTempo={tempo}
                initialVolume={volume}
              />
            </div>

            <div className="hidden lg:block">
              <NowPlaying currentCommit={currentCommit} />
            </div>

            <div className="hidden md:block">
              <Timeline
                commits={commits}
                currentCommitId={currentCommit?.id ?? null}
                onSeek={handleSeek}
              />
            </div>

            <div className="hidden md:block lg:hidden">
              <NowPlaying currentCommit={currentCommit} />
            </div>

            <div className="block md:hidden">
              <MobileCommitList
                commits={commits}
                currentCommitId={currentCommit?.id ?? null}
                onSeek={handleSeek}
              />
            </div>

            <InstrumentLegend activeLanguages={activeLanguages} />

            {/* Sign up to create your own CTA */}
            <div className="rounded-xl border border-accent/20 bg-accent/5 p-6 text-center">
              <p className="text-sm text-text-faint font-mono mb-4">
                Sign up to create your own
              </p>
              <AuthButton className="min-h-11 px-6" />
            </div>
          </div>
        )}
      </main>

      {commits.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-20 md:hidden">
          <NowPlaying currentCommit={currentCommit} compact />
        </div>
      )}
    </div>
  );
}
