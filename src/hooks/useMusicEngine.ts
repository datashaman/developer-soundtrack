"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Commit } from "@/types";
import { MusicEngine } from "@/lib/music/engine";

interface UseMusicEngineReturn {
  /** Whether the engine is currently playing */
  isPlaying: boolean;
  /** The commit currently being played (or last played) */
  currentCommit: Commit | null;
  /** Index of the current commit in the sequence */
  currentIndex: number;
  /** Playback progress from 0 to 1 */
  progress: number;
  /** Audio initialization or playback error message */
  audioError: string | null;

  /** Begin sequential playback of commits */
  play: (commits: Commit[], startIndex?: number) => Promise<void>;
  /** Pause playback at current position */
  pause: () => void;
  /** Resume playback from paused position */
  resume: () => void;
  /** Stop playback and reset to beginning */
  stop: () => void;
  /** Jump to a specific commit index */
  seekTo: (index: number) => void;
  /** Adjust tempo (seconds between notes, 0.3-5.0) */
  setTempo: (secondsBetweenNotes: number) => void;
  /** Set master volume (0-1) */
  setVolume: (level: number) => void;
  /** Set enabled languages — empty array means all enabled */
  setEnabledLanguages: (languages: string[]) => void;

  /** Get current waveform data for visualization */
  getWaveformData: () => Float32Array;
  /** Get current FFT data for visualization */
  getFFTData: () => Float32Array;
  /** Get current tempo (seconds between notes) */
  getTempo: () => number;
  /** Get current volume (0-1) */
  getVolume: () => number;
}

export function useMusicEngine(): UseMusicEngineReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentCommit, setCurrentCommit] = useState<Commit | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [commitCount, setCommitCount] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);
  const initializedRef = useRef(false);
  const engineRef = useRef<MusicEngine | null>(null);

  // Get engine singleton — stable across renders
  const getEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = MusicEngine.getInstance();
    }
    return engineRef.current;
  }, []);

  // Ensure Tone.js audio context is started (requires user gesture)
  const ensureInitialized = useCallback(async () => {
    const engine = getEngine();
    if (!initializedRef.current) {
      await engine.initialize();
      initializedRef.current = true;
    }
  }, [getEngine]);

  // Wire up callbacks on mount, clean up on unmount
  useEffect(() => {
    const engine = getEngine();

    engine.onNotePlay = (commit: Commit, index: number) => {
      setCurrentCommit(commit);
      setCurrentIndex(index);
    };

    engine.onPlaybackComplete = () => {
      setIsPlaying(false);
    };

    engine.onError = (error: Error) => {
      setAudioError(error.message);
      setIsPlaying(false);
    };

    return () => {
      engine.onNotePlay = null;
      engine.onPlaybackComplete = null;
      engine.onError = null;
    };
  }, [getEngine]);

  const progress =
    commitCount > 0 ? Math.min(currentIndex / (commitCount - 1), 1) : 0;

  const play = useCallback(
    async (commits: Commit[], startIndex?: number) => {
      try {
        setAudioError(null);
        await ensureInitialized();
        const engine = getEngine();
        setCommitCount(commits.length);
        setIsPlaying(true);
        setCurrentIndex(startIndex ?? 0);
        engine.play(commits, startIndex);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to initialize audio";
        setAudioError(
          message.includes("AudioContext") || message.includes("audio") || message.includes("Tone")
            ? "Your browser doesn't support Web Audio. Please try a modern browser like Chrome, Firefox, or Safari."
            : message
        );
        setIsPlaying(false);
      }
    },
    [ensureInitialized, getEngine]
  );

  const pause = useCallback(() => {
    getEngine().pause();
    setIsPlaying(false);
  }, [getEngine]);

  const resume = useCallback(async () => {
    await ensureInitialized();
    getEngine().resume();
    setIsPlaying(true);
  }, [ensureInitialized, getEngine]);

  const stop = useCallback(() => {
    getEngine().stop();
    setIsPlaying(false);
    setCurrentIndex(0);
    setCurrentCommit(null);
  }, [getEngine]);

  const seekTo = useCallback(
    (index: number) => {
      getEngine().seekTo(index);
      setCurrentIndex(index);
    },
    [getEngine]
  );

  const setTempo = useCallback(
    (secondsBetweenNotes: number) => {
      getEngine().setTempo(secondsBetweenNotes);
    },
    [getEngine]
  );

  const setVolume = useCallback(
    (level: number) => {
      getEngine().setVolume(level);
    },
    [getEngine]
  );

  const setEnabledLanguages = useCallback(
    (languages: string[]) => {
      getEngine().setEnabledLanguages(languages);
    },
    [getEngine]
  );

  const getWaveformData = useCallback(() => {
    return getEngine().getWaveformData();
  }, [getEngine]);

  const getFFTData = useCallback(() => {
    return getEngine().getFFTData();
  }, [getEngine]);

  const getTempo = useCallback(() => getEngine().tempo, [getEngine]);
  const getVolume = useCallback(() => getEngine().volume, [getEngine]);

  return {
    isPlaying,
    currentCommit,
    currentIndex,
    progress,
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
    getFFTData,
    getTempo,
    getVolume,
  };
}
