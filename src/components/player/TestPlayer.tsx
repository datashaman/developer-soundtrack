"use client";

import { useCallback, useRef } from "react";
import { SAMPLE_COMMITS } from "@/lib/data/sample-commits";
import { useMusicEngine } from "@/hooks/useMusicEngine";
import { WaveformVisualizer } from "./WaveformVisualizer";
import { TransportControls } from "./TransportControls";

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

/** CI status display config */
const CI_STATUS_DISPLAY: Record<string, { label: string; color: string }> = {
  pass: { label: "Passed", color: "#22c55e" },
  fail: { label: "Failed", color: "#ef4444" },
  pending: { label: "Pending", color: "#eab308" },
  unknown: { label: "Unknown", color: "#6b7280" },
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

  const ci = currentCommit
    ? CI_STATUS_DISPLAY[currentCommit.ciStatus]
    : null;

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
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5">
        {currentCommit ? (
          <div className="flex flex-col gap-3">
            {/* Author + message */}
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-mono font-bold text-[#00ffc8]">
                {currentCommit.author.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-mono font-semibold text-white/90">
                  {currentCommit.author}
                </p>
                <p className="text-sm text-white/60 truncate">
                  {currentCommit.message}
                </p>
              </div>
            </div>

            {/* Language, diff stats, CI status */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
              {/* Language */}
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor:
                      LANGUAGE_COLORS[currentCommit.primaryLanguage] ??
                      LANGUAGE_COLORS.Other,
                  }}
                />
                <span className="text-white/70">
                  {currentCommit.primaryLanguage}
                </span>
              </span>

              {/* Diff stats */}
              <span>
                <span className="text-green-400">
                  +{currentCommit.stats.additions}
                </span>{" "}
                <span className="text-red-400">
                  &minus;{currentCommit.stats.deletions}
                </span>
              </span>

              {/* CI status */}
              {ci && (
                <span className="flex items-center gap-1">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: ci.color }}
                  />
                  <span style={{ color: ci.color }}>{ci.label}</span>
                </span>
              )}
            </div>

            {/* Musical info */}
            <div className="text-xs font-mono text-white/40">
              {currentCommit.musicalParams.instrument} &rarr;{" "}
              {currentCommit.musicalParams.note}{" "}
              {currentCommit.musicalParams.scale},{" "}
              {currentCommit.musicalParams.duration.toFixed(2)}s, pan:{" "}
              {currentCommit.musicalParams.pan.toFixed(1)}
            </div>
          </div>
        ) : (
          <p className="text-sm text-white/30 text-center font-mono">
            Press play to start the soundtrack
          </p>
        )}
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
