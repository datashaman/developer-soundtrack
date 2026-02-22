import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Commit } from "@/types";

// Mock tone before importing the engine
vi.mock("tone", () => {
  function MockVolume() {
    this.chain = vi.fn();
    this.dispose = vi.fn();
    this.volume = { value: 0 };
  }
  function MockAnalyser() {
    this.getValue = vi.fn(() => new Float32Array(0));
    this.dispose = vi.fn();
  }
  function MockPanner() {
    this.pan = { value: 0 };
    this.dispose = vi.fn();
  }
  function MockReverb() {
    this.wet = { value: 0 };
    this.dispose = vi.fn();
  }
  function MockFeedbackDelay() {
    this.wet = { value: 0 };
    this.dispose = vi.fn();
  }
  function MockSynth() {
    this.chain = vi.fn();
    this.triggerAttackRelease = vi.fn();
    this.dispose = vi.fn();
  }

  return {
    start: vi.fn(),
    now: vi.fn(() => 0),
    getDestination: vi.fn(() => ({})),
    Volume: MockVolume,
    Analyser: MockAnalyser,
    Panner: MockPanner,
    Reverb: MockReverb,
    FeedbackDelay: MockFeedbackDelay,
    Synth: MockSynth,
    AMSynth: MockSynth,
    FMSynth: MockSynth,
    MonoSynth: MockSynth,
    MetalSynth: MockSynth,
    NoiseSynth: MockSynth,
    PluckSynth: MockSynth,
  };
});

import { MusicEngine } from "./engine";

function makeCommit(overrides: Partial<Commit> = {}): Commit {
  return {
    id: "abc123",
    repoId: "repo1",
    timestamp: "2024-06-15T14:30:00Z",
    author: "testuser",
    message: "fix: resolve bug",
    stats: { additions: 50, deletions: 10, filesChanged: 3 },
    primaryLanguage: "TypeScript",
    languages: { TypeScript: 50 },
    ciStatus: "pass",
    musicalParams: {
      instrument: "FMSynth",
      note: "C3",
      duration: 0.48,
      velocity: 0.3,
      octave: 3,
      scale: "major",
      pan: 0,
      effects: { reverb: 0.2, delay: 0 },
    },
    ...overrides,
  };
}

function makeCommits(count: number): Commit[] {
  return Array.from({ length: count }, (_, i) =>
    makeCommit({ id: `commit-${i}`, message: `commit ${i}` })
  );
}

describe("MusicEngine — Sequential Playback", () => {
  let engine: MusicEngine;

  beforeEach(async () => {
    vi.useFakeTimers();
    engine = MusicEngine.getInstance();
    await engine.initialize();
  });

  afterEach(() => {
    engine.dispose();
    vi.useRealTimers();
  });

  describe("play()", () => {
    it("begins sequential playback from the start", () => {
      const commits = makeCommits(3);
      const notePlaySpy = vi.fn();
      engine.onNotePlay = notePlaySpy;

      engine.play(commits);

      expect(engine.playing).toBe(true);
      expect(engine.paused).toBe(false);
      // First note fires immediately
      expect(notePlaySpy).toHaveBeenCalledWith(commits[0], 0);
    });

    it("plays from a custom start index", () => {
      const commits = makeCommits(5);
      const notePlaySpy = vi.fn();
      engine.onNotePlay = notePlaySpy;

      engine.play(commits, 2);

      expect(notePlaySpy).toHaveBeenCalledWith(commits[2], 2);
    });

    it("clamps start index to valid range", () => {
      const commits = makeCommits(3);
      const notePlaySpy = vi.fn();
      engine.onNotePlay = notePlaySpy;

      engine.play(commits, 10);

      // Should clamp to last valid index (2)
      expect(notePlaySpy).toHaveBeenCalledWith(commits[2], 2);
    });

    it("clamps negative start index to 0", () => {
      const commits = makeCommits(3);
      const notePlaySpy = vi.fn();
      engine.onNotePlay = notePlaySpy;

      engine.play(commits, -5);

      expect(notePlaySpy).toHaveBeenCalledWith(commits[0], 0);
    });

    it("advances to next commit after tempo interval", () => {
      const commits = makeCommits(3);
      const notePlaySpy = vi.fn();
      engine.onNotePlay = notePlaySpy;

      engine.play(commits);

      expect(notePlaySpy).toHaveBeenCalledTimes(1);

      // Advance by default tempo (1.0s)
      vi.advanceTimersByTime(1000);

      expect(notePlaySpy).toHaveBeenCalledTimes(2);
      expect(notePlaySpy).toHaveBeenCalledWith(commits[1], 1);
    });

    it("plays all commits sequentially", () => {
      const commits = makeCommits(3);
      const notePlaySpy = vi.fn();
      const completeSpy = vi.fn();
      engine.onNotePlay = notePlaySpy;
      engine.onPlaybackComplete = completeSpy;

      engine.play(commits);

      // Note 0 played immediately
      expect(notePlaySpy).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1000); // Note 1
      expect(notePlaySpy).toHaveBeenCalledTimes(2);

      vi.advanceTimersByTime(1000); // Note 2
      expect(notePlaySpy).toHaveBeenCalledTimes(3);

      // Complete fires after last note's tempo interval
      expect(completeSpy).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1000);
      expect(completeSpy).toHaveBeenCalledTimes(1);
      expect(engine.playing).toBe(false);
    });

    it("fires onError callback when playCommit throws", () => {
      // Dispose and get a fresh uninitialized engine to force errors
      engine.dispose();
      engine = MusicEngine.getInstance();
      // Don't initialize — playCommit will throw

      const errorSpy = vi.fn();
      engine.onError = errorSpy;

      const commits = makeCommits(1);
      engine.play(commits);

      expect(errorSpy).toHaveBeenCalled();
      expect(errorSpy.mock.calls[0][0]).toBeInstanceOf(Error);
    });
  });

  describe("pause() and resume()", () => {
    it("pauses playback at current position", () => {
      const commits = makeCommits(5);
      const notePlaySpy = vi.fn();
      engine.onNotePlay = notePlaySpy;

      engine.play(commits);
      vi.advanceTimersByTime(1000); // Note 1
      expect(notePlaySpy).toHaveBeenCalledTimes(2);

      engine.pause();
      expect(engine.playing).toBe(true);
      expect(engine.paused).toBe(true);

      // More time passes but no more notes play
      vi.advanceTimersByTime(5000);
      expect(notePlaySpy).toHaveBeenCalledTimes(2);
    });

    it("resume continues from paused position", () => {
      const commits = makeCommits(5);
      const notePlaySpy = vi.fn();
      engine.onNotePlay = notePlaySpy;

      engine.play(commits);
      vi.advanceTimersByTime(1000); // Note 1
      expect(notePlaySpy).toHaveBeenCalledTimes(2);

      engine.pause();
      vi.advanceTimersByTime(5000);

      engine.resume();
      expect(engine.paused).toBe(false);

      // Next note plays immediately on resume
      expect(notePlaySpy).toHaveBeenCalledTimes(3);
      expect(notePlaySpy).toHaveBeenCalledWith(commits[2], 2);
    });

    it("pause is a no-op when not playing", () => {
      engine.pause();
      expect(engine.playing).toBe(false);
      expect(engine.paused).toBe(false);
    });

    it("resume is a no-op when not paused", () => {
      const commits = makeCommits(3);
      engine.play(commits);
      engine.resume(); // Not paused, should be no-op
      expect(engine.paused).toBe(false);
    });
  });

  describe("stop()", () => {
    it("halts playback and resets to beginning", () => {
      const commits = makeCommits(5);
      const notePlaySpy = vi.fn();
      engine.onNotePlay = notePlaySpy;

      engine.play(commits);
      vi.advanceTimersByTime(2000); // Play notes 0, 1, 2

      engine.stop();

      expect(engine.playing).toBe(false);
      expect(engine.paused).toBe(false);
      expect(engine.currentIndex).toBe(0);

      // No more notes should play
      vi.advanceTimersByTime(5000);
      expect(notePlaySpy).toHaveBeenCalledTimes(3);
    });

    it("stop after pause resets state", () => {
      const commits = makeCommits(3);
      engine.play(commits);
      engine.pause();
      engine.stop();

      expect(engine.playing).toBe(false);
      expect(engine.paused).toBe(false);
      expect(engine.currentIndex).toBe(0);
    });
  });

  describe("seekTo()", () => {
    it("jumps to a specific commit index", () => {
      const commits = makeCommits(5);
      const notePlaySpy = vi.fn();
      engine.onNotePlay = notePlaySpy;

      engine.play(commits);
      notePlaySpy.mockClear();

      engine.seekTo(3);

      // The note at index 3 should play immediately (reschedule)
      expect(notePlaySpy).toHaveBeenCalledWith(commits[3], 3);
    });

    it("clamps to valid range", () => {
      const commits = makeCommits(3);
      const notePlaySpy = vi.fn();
      engine.onNotePlay = notePlaySpy;

      engine.play(commits);
      notePlaySpy.mockClear();

      // seekTo(100) clamps to 2, scheduleNext plays index 2 and increments to 3
      engine.seekTo(100);
      expect(notePlaySpy).toHaveBeenCalledWith(commits[2], 2);

      // seekTo(-5) clamps to 0, scheduleNext plays index 0 and increments to 1
      notePlaySpy.mockClear();
      engine.seekTo(-5);
      expect(notePlaySpy).toHaveBeenCalledWith(commits[0], 0);
    });

    it("does nothing when no commits are loaded", () => {
      engine.seekTo(5);
      expect(engine.currentIndex).toBe(0);
    });

    it("does not restart scheduling when paused", () => {
      const commits = makeCommits(5);
      const notePlaySpy = vi.fn();
      engine.onNotePlay = notePlaySpy;

      engine.play(commits);
      engine.pause();
      notePlaySpy.mockClear();

      engine.seekTo(3);

      // Should NOT play immediately when paused
      expect(notePlaySpy).not.toHaveBeenCalled();

      // After resume, it should play from new position
      engine.resume();
      expect(notePlaySpy).toHaveBeenCalledWith(commits[3], 3);
    });
  });

  describe("setTempo()", () => {
    it("adjusts playback speed", () => {
      const commits = makeCommits(5);
      const notePlaySpy = vi.fn();
      engine.onNotePlay = notePlaySpy;

      engine.setTempo(0.5);
      engine.play(commits);

      expect(notePlaySpy).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(500); // 0.5s
      expect(notePlaySpy).toHaveBeenCalledTimes(2);

      vi.advanceTimersByTime(500);
      expect(notePlaySpy).toHaveBeenCalledTimes(3);
    });

    it("clamps tempo to minimum 0.3s", () => {
      engine.setTempo(0.1);
      expect(engine.tempo).toBe(0.3);
    });

    it("clamps tempo to maximum 5.0s", () => {
      engine.setTempo(10.0);
      expect(engine.tempo).toBe(5.0);
    });

    it("can change tempo during playback", () => {
      const commits = makeCommits(5);
      const notePlaySpy = vi.fn();
      engine.onNotePlay = notePlaySpy;

      engine.play(commits); // plays note 0
      expect(notePlaySpy).toHaveBeenCalledTimes(1);

      // Default tempo is 1.0s, advance 1s to get note 1
      vi.advanceTimersByTime(1000);
      expect(notePlaySpy).toHaveBeenCalledTimes(2);

      // Change to 2.0s — next timer is already set at 1.0s
      engine.setTempo(2.0);

      // After 1.0s the old timer fires (note 2), but the NEXT timer will be 2.0s
      vi.advanceTimersByTime(1000);
      expect(notePlaySpy).toHaveBeenCalledTimes(3);

      // Now the timer is set at 2.0s
      vi.advanceTimersByTime(1000);
      expect(notePlaySpy).toHaveBeenCalledTimes(3); // Not yet
      vi.advanceTimersByTime(1000);
      expect(notePlaySpy).toHaveBeenCalledTimes(4);
    });
  });

  describe("onPlaybackComplete", () => {
    it("fires when all commits have played", () => {
      const commits = makeCommits(2);
      const completeSpy = vi.fn();
      engine.onPlaybackComplete = completeSpy;

      engine.play(commits);
      vi.advanceTimersByTime(1000); // Note 1
      vi.advanceTimersByTime(1000); // Complete fires

      expect(completeSpy).toHaveBeenCalledTimes(1);
    });

    it("sets playing to false when complete", () => {
      const commits = makeCommits(1);
      engine.play(commits);
      vi.advanceTimersByTime(1000);

      expect(engine.playing).toBe(false);
    });
  });

  describe("onNotePlay", () => {
    it("fires with correct commit and index for each note", () => {
      const commits = makeCommits(3);
      const notePlaySpy = vi.fn();
      engine.onNotePlay = notePlaySpy;

      engine.play(commits);

      expect(notePlaySpy).toHaveBeenCalledWith(commits[0], 0);

      vi.advanceTimersByTime(1000);
      expect(notePlaySpy).toHaveBeenCalledWith(commits[1], 1);

      vi.advanceTimersByTime(1000);
      expect(notePlaySpy).toHaveBeenCalledWith(commits[2], 2);
    });
  });

  describe("state accessors", () => {
    it("currentCommit returns the commit at current index", () => {
      const commits = makeCommits(3);
      engine.play(commits);

      // After playing index 0, currentIndex is 1 (pre-incremented for next schedule)
      // But currentCommit should reflect the next-to-play
      expect(engine.currentCommit).toBeTruthy();
    });

    it("currentCommit returns null when no commits loaded", () => {
      expect(engine.currentCommit).toBeNull();
    });

    it("commitCount returns number of loaded commits", () => {
      const commits = makeCommits(5);
      engine.play(commits);
      expect(engine.commitCount).toBe(5);
    });

    it("tempo returns current tempo setting", () => {
      expect(engine.tempo).toBe(1.0); // default
      engine.setTempo(2.5);
      expect(engine.tempo).toBe(2.5);
    });
  });

  describe("dispose()", () => {
    it("clears playback state and callbacks", () => {
      const commits = makeCommits(3);
      engine.onNotePlay = vi.fn();
      engine.onPlaybackComplete = vi.fn();
      engine.onError = vi.fn();

      engine.play(commits);
      engine.dispose();

      expect(engine.playing).toBe(false);
      expect(engine.paused).toBe(false);
      expect(engine.commitCount).toBe(0);
      expect(engine.onNotePlay).toBeNull();
      expect(engine.onPlaybackComplete).toBeNull();
      expect(engine.onError).toBeNull();
    });
  });
});
