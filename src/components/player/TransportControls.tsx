"use client";

import { useState, useCallback, useRef } from "react";

interface TransportControlsProps {
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /** Current commit index */
  currentIndex: number;
  /** Total number of commits */
  totalCommits: number;
  /** Called when play is pressed (should gate Tone.start() on first click) */
  onPlay: () => void;
  /** Called when pause is pressed */
  onPause: () => void;
  /** Called when stop is pressed */
  onStop: () => void;
  /** Called when seeking to a specific commit index */
  onSeek: (index: number) => void;
  /** Called when tempo changes */
  onTempoChange: (secondsBetweenNotes: number) => void;
  /** Called when volume changes */
  onVolumeChange: (level: number) => void;
  /** Initial tempo in seconds between notes (default 1.0) */
  initialTempo?: number;
  /** Initial volume 0-1 (default 0.8) */
  initialVolume?: number;
}

export function TransportControls({
  isPlaying,
  currentIndex,
  totalCommits,
  onPlay,
  onPause,
  onStop,
  onSeek,
  onTempoChange,
  onVolumeChange,
  initialTempo = 1.0,
  initialVolume = 0.8,
}: TransportControlsProps) {
  const [tempo, setTempo] = useState(initialTempo);
  const [volume, setVolume] = useState(initialVolume);
  const [isMuted, setIsMuted] = useState(false);
  const volumeBeforeMuteRef = useRef(initialVolume);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const progress = totalCommits > 1 ? currentIndex / (totalCommits - 1) : 0;

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      onPause();
    } else {
      onPlay();
    }
  }, [isPlaying, onPlay, onPause]);

  const handleStop = useCallback(() => {
    onStop();
  }, [onStop]);

  const handleSkipBack = useCallback(() => {
    if (currentIndex > 0) {
      onSeek(currentIndex - 1);
    }
  }, [currentIndex, onSeek]);

  const handleSkipForward = useCallback(() => {
    if (currentIndex < totalCommits - 1) {
      onSeek(currentIndex + 1);
    }
  }, [currentIndex, totalCommits, onSeek]);

  const handleTempoChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value);
      setTempo(value);
      onTempoChange(value);
    },
    [onTempoChange]
  );

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value);
      setVolume(value);
      setIsMuted(value === 0);
      onVolumeChange(value);
    },
    [onVolumeChange]
  );

  const handleMuteToggle = useCallback(() => {
    if (isMuted) {
      const restored = volumeBeforeMuteRef.current;
      setVolume(restored);
      setIsMuted(false);
      onVolumeChange(restored);
    } else {
      volumeBeforeMuteRef.current = volume;
      setVolume(0);
      setIsMuted(true);
      onVolumeChange(0);
    }
  }, [isMuted, volume, onVolumeChange]);

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const bar = progressBarRef.current;
      if (!bar || totalCommits === 0) return;
      const rect = bar.getBoundingClientRect();
      const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const index = Math.round(fraction * (totalCommits - 1));
      onSeek(index);
    },
    [totalCommits, onSeek]
  );

  return (
    <div className="flex flex-col gap-3 w-full px-4 py-3">
      {/* Progress bar */}
      <div
        ref={progressBarRef}
        role="progressbar"
        aria-valuenow={currentIndex}
        aria-valuemin={0}
        aria-valuemax={totalCommits > 0 ? totalCommits - 1 : 0}
        aria-label="Playback progress"
        className="w-full h-2 bg-white/10 rounded-full cursor-pointer relative"
        onClick={handleProgressClick}
      >
        <div
          className="h-full bg-[#00ffc8] rounded-full transition-all duration-150"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Controls — stacks on mobile, single row on md+ */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
        {/* Playback buttons */}
        <div className="flex items-center justify-center gap-1 md:justify-start md:gap-2">
          {/* Skip back */}
          <button
            onClick={handleSkipBack}
            disabled={currentIndex <= 0}
            aria-label="Skip backward"
            className="min-h-11 min-w-11 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors md:min-h-0 md:min-w-0 md:p-2"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3 2h2v12H3V2zm10 0L6 8l7 6V2z" />
            </svg>
          </button>

          {/* Play / Pause */}
          <button
            onClick={handlePlayPause}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="min-h-11 min-w-11 flex items-center justify-center rounded-full bg-[#00ffc8] text-[#0a0a0e] hover:bg-[#00e6b4] transition-colors md:p-3"
          >
            {isPlaying ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <rect x="4" y="3" width="4" height="14" rx="1" />
                <rect x="12" y="3" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 3l12 7-12 7V3z" />
              </svg>
            )}
          </button>

          {/* Stop */}
          <button
            onClick={handleStop}
            aria-label="Stop"
            className="min-h-11 min-w-11 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors md:min-h-0 md:min-w-0 md:p-2"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="3" y="3" width="10" height="10" rx="1" />
            </svg>
          </button>

          {/* Skip forward */}
          <button
            onClick={handleSkipForward}
            disabled={currentIndex >= totalCommits - 1}
            aria-label="Skip forward"
            className="min-h-11 min-w-11 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors md:min-h-0 md:min-w-0 md:p-2"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3 2l7 6-7 6V2zm8 0h2v12h-2V2z" />
            </svg>
          </button>

          {/* Commit counter */}
          <span className="text-xs text-white/50 ml-2 font-mono">
            {totalCommits > 0
              ? `${currentIndex + 1} / ${totalCommits}`
              : "0 / 0"}
          </span>
        </div>

        {/* Tempo + Volume — side by side */}
        <div className="flex items-center justify-center gap-4 md:gap-2">
          {/* Tempo control */}
          <div className="flex items-center gap-2">
            <label htmlFor="tempo-slider" className="text-xs text-white/50">
              Tempo
            </label>
            <input
              id="tempo-slider"
              type="range"
              min="0.3"
              max="5.0"
              step="0.1"
              value={tempo}
              onChange={handleTempoChange}
              aria-label="Tempo"
              className="w-20 h-1 accent-[#00ffc8] cursor-pointer"
            />
            <span className="text-xs text-white/70 font-mono w-10 text-right">
              {tempo.toFixed(1)}s
            </span>
          </div>

          {/* Volume control */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleMuteToggle}
              aria-label={isMuted ? "Unmute" : "Mute"}
              className="min-h-11 min-w-11 flex items-center justify-center text-white/70 hover:text-white transition-colors md:min-h-0 md:min-w-0 md:p-1"
            >
              {isMuted || volume === 0 ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 2L4 6H1v4h3l4 4V2z" />
                  <path d="M12.5 4.5l-5 7" stroke="currentColor" strokeWidth="1.5" fill="none" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 2L4 6H1v4h3l4 4V2z" />
                  <path d="M11 5.5c.8.8.8 2.2 0 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                  <path d="M13 3.5c1.6 1.6 1.6 4.4 0 6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                </svg>
              )}
            </button>
            <input
              id="volume-slider"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              aria-label="Volume"
              className="w-20 h-1 accent-[#00ffc8] cursor-pointer"
            />
            <span className="text-xs text-white/70 font-mono w-10 text-right">
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
