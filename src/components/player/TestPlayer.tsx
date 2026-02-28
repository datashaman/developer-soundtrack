"use client";

import { useCallback, useRef } from "react";
import { SAMPLE_COMMITS } from "@/lib/data/sample-commits";
import { useMusicEngine } from "@/hooks/useMusicEngine";
import { WaveformVisualizer } from "./WaveformVisualizer";
import { TransportControls } from "./TransportControls";
import { NowPlaying } from "./NowPlaying";

/** Language color map for the commit info display */
const LANGUAGE_COLORS: Record<string, string> = {
  Python: "#3572A5",
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Rust: "#dea584",
  Go: "#00ADD8",
  Java: "#b07219",
  C: "#555555",
  "C++": "#f34b7d",
  Ruby: "#701516",
  CSS: "#563d7c",
  HTML: "#e34c26",
  Shell: "#89e051",
  Markdown: "#083fa1",
  Other: "#00ffc8",
};

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
                className={`w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-white/[0.04] transition-colors border-b border-white/[0.03] last:border-b-0 ${
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
                <span
                  className="inline-block h-2 w-2 rounded-full shrink-0"
                  style={{
                    backgroundColor:
                      LANGUAGE_COLORS[commit.primaryLanguage] ??
                      LANGUAGE_COLORS.Other,
                  }}
                />
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
