"use client";

import { useCallback, useRef } from "react";
import { SAMPLE_COMMITS } from "@/lib/data/sample-commits";
import { useMusicEngine } from "@/hooks/useMusicEngine";
import { WaveformVisualizer } from "./WaveformVisualizer";
import { TransportControls } from "./TransportControls";
import { NowPlaying } from "./NowPlaying";
import { Timeline } from "./Timeline";
import { LanguageIcon } from "@/components/shared/LanguageIcon";

export function TestPlayer() {
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
          totalCommits={SAMPLE_COMMITS.length}
          onPlay={handlePlay}
          onPause={pause}
          onStop={handleStop}
          onSeek={handleSeek}
          onTempoChange={setTempo}
          onVolumeChange={setVolume}
        />
      </div>

      {/* Current Commit Info */}
      <NowPlaying currentCommit={currentCommit} />

      {/* Timeline — hidden on small mobile, shown on sm+ */}
      <div className="hidden sm:block">
        <Timeline
          commits={SAMPLE_COMMITS}
          currentCommitId={currentCommit?.id ?? null}
          onSeek={handleSeek}
        />
      </div>

      {/* Commit list */}
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-white/[0.06]">
          <h2 className="text-xs font-mono font-semibold text-white/50 uppercase tracking-wider">
            Sample Commits ({SAMPLE_COMMITS.length})
          </h2>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {SAMPLE_COMMITS.map((commit, idx) => {
            const isActive = currentCommit?.id === commit.id;
            return (
              <button
                key={commit.id}
                onClick={() => handleSeek(idx)}
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
                <span
                  className={`text-xs font-mono truncate ${
                    isActive ? "text-white" : "text-white/60"
                  }`}
                >
                  {commit.message}
                </span>
                <span className="ml-auto text-xs font-mono text-white/20 shrink-0">
                  {commit.author}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
