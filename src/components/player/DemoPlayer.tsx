"use client";

import { useCallback, useRef } from "react";
import { signIn } from "next-auth/react";
import { SAMPLE_COMMITS } from "@/lib/data/sample-commits";
import { useMusicEngine } from "@/hooks/useMusicEngine";
import { WaveformVisualizer } from "./WaveformVisualizer";
import { TransportControls } from "./TransportControls";
import { NowPlaying } from "./NowPlaying";

/**
 * Simplified demo player for unauthenticated visitors.
 * Full playback experience (waveform, transport controls, now-playing)
 * without timeline, settings, or repo selector.
 * Includes a prominent CTA to sign in.
 */
export function DemoPlayer() {
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

  const handlePlay = useCallback(async () => {
    if (hasStartedRef.current) {
      resume();
    } else {
      hasStartedRef.current = true;
      await play(SAMPLE_COMMITS);
    }
  }, [play, resume]);

  const handleStop = useCallback(() => {
    stop();
    hasStartedRef.current = false;
  }, [stop]);

  const handleSeek = useCallback(
    (index: number) => {
      if (!hasStartedRef.current) {
        hasStartedRef.current = true;
        play(SAMPLE_COMMITS, index);
      } else {
        seekTo(index);
      }
    },
    [play, seekTo]
  );

  return (
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
          totalCommits={SAMPLE_COMMITS.length}
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

      {/* Sign In CTA */}
      <div className="rounded-xl bg-surface border border-accent/20 p-6 text-center">
        <p className="text-text-muted font-[family-name:var(--font-space-grotesk)] mb-4">
          Sign in to play your own repos
        </p>
        <button
          onClick={() => signIn("github")}
          className="inline-flex items-center gap-2 px-6 py-3 min-h-11 rounded-lg bg-accent hover:bg-accent-hover text-background font-semibold text-sm transition-colors font-[family-name:var(--font-space-grotesk)]"
        >
          <svg
            className="h-5 w-5"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              clipRule="evenodd"
            />
          </svg>
          Connect with GitHub
        </button>
      </div>
    </div>
  );
}
