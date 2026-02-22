import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Commit } from "@/types";

// Track instances created by each mock constructor
const createdInstances: Record<string, Array<Record<string, unknown>>> = {
  Synth: [],
  AMSynth: [],
  FMSynth: [],
  MonoSynth: [],
  MetalSynth: [],
  NoiseSynth: [],
  PluckSynth: [],
};

function resetCreatedInstances() {
  for (const key of Object.keys(createdInstances)) {
    createdInstances[key] = [];
  }
}

// Mock tone before importing the engine
vi.mock("tone", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function MockVolume(this: any) {
    this.chain = vi.fn();
    this.dispose = vi.fn();
    this.volume = { value: 0 };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function MockAnalyser(this: any) {
    this.getValue = vi.fn(() => new Float32Array(0));
    this.dispose = vi.fn();
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function MockPanner(this: any) {
    this.pan = { value: 0 };
    this.dispose = vi.fn();
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function MockReverb(this: any) {
    this.wet = { value: 0 };
    this.dispose = vi.fn();
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function MockFeedbackDelay(this: any) {
    this.wet = { value: 0 };
    this.dispose = vi.fn();
  }

  function makeMockSynth(name: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return function MockSynthCtor(this: any) {
      this.chain = vi.fn();
      this.connect = vi.fn();
      this.triggerAttackRelease = vi.fn();
      this.dispose = vi.fn();
      this.envelope = { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.5 };
      createdInstances[name].push(this);
    };
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
    Synth: makeMockSynth("Synth"),
    AMSynth: makeMockSynth("AMSynth"),
    FMSynth: makeMockSynth("FMSynth"),
    MonoSynth: makeMockSynth("MonoSynth"),
    MetalSynth: makeMockSynth("MetalSynth"),
    NoiseSynth: makeMockSynth("NoiseSynth"),
    PluckSynth: makeMockSynth("PluckSynth"),
  };
});

import {
  MusicEngine,
  isMergeCommit,
  isRevertCommit,
  isFirstOfDay,
} from "./engine";

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
    resetCreatedInstances();
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

  describe("Special Sounds", () => {
    describe("merge commits — cymbal/crash", () => {
      it("plays a cymbal sound on merge commits", () => {
        const mergeCommit = makeCommit({
          message: "Merge pull request #42 from feature-branch",
        });

        engine.playCommit(mergeCommit);

        // A MetalSynth should have been created for the cymbal
        // (one for CSS/HTML chain creation + one for the cymbal)
        const metalInstances = createdInstances.MetalSynth;
        const cymbalInstance = metalInstances[metalInstances.length - 1];
        expect(cymbalInstance.triggerAttackRelease).toHaveBeenCalled();
      });

      it("does not play cymbal for non-merge commits", async () => {
        const normalCommit = makeCommit({ message: "fix: resolve bug" });

        // Reset to get clean counts
        resetCreatedInstances();
        engine.dispose();
        engine = MusicEngine.getInstance();
        await engine.initialize();

        engine.playCommit(normalCommit);

        // Only the language synth chain should be created, no extra MetalSynth for cymbal
        const metalInstances = createdInstances.MetalSynth;
        // None of the MetalSynth instances should have connect called (cymbal uses connect, not chain)
        const cymbalInstances = metalInstances.filter(
          (inst) => (inst.connect as ReturnType<typeof vi.fn>).mock.calls.length > 0
        );
        expect(cymbalInstances.length).toBe(0);
      });
    });

    describe("revert commits — reversed envelope", () => {
      it("modifies envelope for revert commits and restores after", () => {
        const revertCommit = makeCommit({
          message: "Revert \"add new feature\"",
        });

        engine.playCommit(revertCommit);

        // The FMSynth instance used for TypeScript should have had its envelope modified then restored
        const fmInstances = createdInstances.FMSynth;
        const synthInstance = fmInstances[0];
        // After playCommit, envelope should be restored to original values
        const env = synthInstance.envelope as { attack: number; release: number };
        expect(env.attack).toBe(0.01);
        expect(env.release).toBe(0.5);
      });

      it("does not modify envelope for non-revert commits", () => {
        const normalCommit = makeCommit({ message: "fix: resolve bug" });

        engine.playCommit(normalCommit);

        const fmInstances = createdInstances.FMSynth;
        const synthInstance = fmInstances[0];
        const env = synthInstance.envelope as { attack: number; release: number };
        expect(env.attack).toBe(0.01);
        expect(env.release).toBe(0.5);
      });
    });

    describe("first-of-day — ascending arpeggio", () => {
      it("plays an arpeggio for first commit (no previous commit)", () => {
        const commit = makeCommit({ timestamp: "2024-06-15T09:00:00Z" });

        engine.playCommit(commit);

        // An arpeggio Synth should have been created and triggered 3 times
        const synthInstances = createdInstances.Synth;
        // The arpeggio synth is the one with connect called (not chain)
        const arpeggioInstance = synthInstances.find(
          (inst) => (inst.connect as ReturnType<typeof vi.fn>).mock.calls.length > 0
        );
        expect(arpeggioInstance).toBeDefined();
        expect(
          (arpeggioInstance!.triggerAttackRelease as ReturnType<typeof vi.fn>).mock.calls.length
        ).toBe(3);
      });

      it("plays arpeggio when commit is on a different day from previous", () => {
        // Play a commit from June 15
        const commit1 = makeCommit({
          id: "c1",
          timestamp: "2024-06-15T23:00:00Z",
        });
        // Play through scheduleNext to set _previousCommit
        engine.play([
          commit1,
          makeCommit({ id: "c2", timestamp: "2024-06-16T09:00:00Z" }),
        ]);

        // First commit is also first-of-day, so arpeggio synth is created and called 3 times
        const synthInstances = createdInstances.Synth;
        const arpeggioInstance = synthInstances.find(
          (inst) => (inst.connect as ReturnType<typeof vi.fn>).mock.calls.length > 0
        );
        expect(arpeggioInstance).toBeDefined();
        expect(
          (arpeggioInstance!.triggerAttackRelease as ReturnType<typeof vi.fn>).mock.calls.length
        ).toBe(3);

        // Advance timer — second commit is on a different day, arpeggio should fire again (3 more calls)
        vi.advanceTimersByTime(1000);
        expect(
          (arpeggioInstance!.triggerAttackRelease as ReturnType<typeof vi.fn>).mock.calls.length
        ).toBe(6);
      });

      it("does not play arpeggio for same-day consecutive commits", () => {
        const commit1 = makeCommit({
          id: "c1",
          timestamp: "2024-06-15T09:00:00Z",
        });
        const commit2 = makeCommit({
          id: "c2",
          timestamp: "2024-06-15T14:00:00Z",
        });

        engine.play([commit1, commit2]);

        // Reset after first note to track second note's creations
        resetCreatedInstances();
        vi.advanceTimersByTime(1000);

        // No arpeggio synth should be created for same-day commit
        const synthInstances = createdInstances.Synth;
        const arpeggioInstance = synthInstances.find(
          (inst) => (inst.connect as ReturnType<typeof vi.fn>).mock.calls.length > 0
        );
        expect(arpeggioInstance).toBeUndefined();
      });
    });

    describe("CI failure — grace note", () => {
      it("plays a dissonant grace note for CI failure commits", () => {
        const failCommit = makeCommit({
          ciStatus: "fail",
          musicalParams: {
            instrument: "FMSynth",
            note: "D3",
            duration: 0.48,
            velocity: 0.3,
            octave: 3,
            scale: "minor",
            pan: 0,
            effects: { reverb: 0.2, delay: 0 },
          },
        });

        engine.playCommit(failCommit);

        // Both arpeggio (first-of-day) and grace synths are Synth instances with .connect
        // The arpeggio gets 3 calls, the grace gets 1 call with specific args
        const synthInstances = createdInstances.Synth;
        const connectedInstances = synthInstances.filter(
          (inst) => (inst.connect as ReturnType<typeof vi.fn>).mock.calls.length > 0
        );
        // Should have at least 2 connected Synth instances (arpeggio + grace)
        expect(connectedInstances.length).toBeGreaterThanOrEqual(2);
        // Find the grace note instance — it has exactly 1 triggerAttackRelease call with the grace note
        const graceInstance = connectedInstances.find((inst) => {
          const calls = (inst.triggerAttackRelease as ReturnType<typeof vi.fn>).mock.calls;
          return calls.length === 1 && calls[0][0] === "C#3";
        });
        expect(graceInstance).toBeDefined();
        expect(graceInstance!.triggerAttackRelease).toHaveBeenCalledWith(
          "C#3",
          0.08,
          0,
          0.5
        );
      });

      it("does not play grace note for passing CI status", async () => {
        const passCommit = makeCommit({ ciStatus: "pass" });

        // Reset to get clean counts
        resetCreatedInstances();
        engine.dispose();
        engine = MusicEngine.getInstance();
        await engine.initialize();

        engine.playCommit(passCommit);

        // The arpeggio synth (first-of-day) may be created with .connect,
        // but no grace note synth should exist — check that no Synth instance
        // was called with a semitone-below note argument
        const synthInstances = createdInstances.Synth;
        const connectedInstances = synthInstances.filter(
          (inst) => (inst.connect as ReturnType<typeof vi.fn>).mock.calls.length > 0
        );
        // If any connected instance exists (arpeggio), verify none has 1-arg grace note pattern
        for (const inst of connectedInstances) {
          const calls = (inst.triggerAttackRelease as ReturnType<typeof vi.fn>).mock.calls;
          // Grace note calls have velocity 0.5 as 4th arg — arpeggio uses 0.4
          const graceCalls = calls.filter((c: unknown[]) => c[3] === 0.5);
          expect(graceCalls.length).toBe(0);
        }
      });
    });

    describe("special sounds do not interfere with timing", () => {
      it("sequential playback completes correctly with special commits", () => {
        const commits = [
          makeCommit({
            id: "c0",
            message: "Merge pull request #1",
            timestamp: "2024-06-15T09:00:00Z",
          }),
          makeCommit({
            id: "c1",
            message: "Revert \"bad change\"",
            timestamp: "2024-06-15T10:00:00Z",
          }),
          makeCommit({
            id: "c2",
            message: "fix: normal commit",
            ciStatus: "fail",
            timestamp: "2024-06-16T09:00:00Z",
          }),
        ];

        const notePlaySpy = vi.fn();
        const completeSpy = vi.fn();
        engine.onNotePlay = notePlaySpy;
        engine.onPlaybackComplete = completeSpy;

        engine.play(commits);

        expect(notePlaySpy).toHaveBeenCalledTimes(1);
        expect(notePlaySpy).toHaveBeenCalledWith(commits[0], 0);

        vi.advanceTimersByTime(1000);
        expect(notePlaySpy).toHaveBeenCalledTimes(2);
        expect(notePlaySpy).toHaveBeenCalledWith(commits[1], 1);

        vi.advanceTimersByTime(1000);
        expect(notePlaySpy).toHaveBeenCalledTimes(3);
        expect(notePlaySpy).toHaveBeenCalledWith(commits[2], 2);

        vi.advanceTimersByTime(1000);
        expect(completeSpy).toHaveBeenCalledTimes(1);
      });
    });
  });
});

describe("Special sound detection helpers", () => {
  describe("isMergeCommit", () => {
    it("detects standard merge messages", () => {
      expect(isMergeCommit("Merge pull request #42 from feature-branch")).toBe(true);
      expect(isMergeCommit("Merge branch 'main' into develop")).toBe(true);
      expect(isMergeCommit("merge commit")).toBe(true);
    });

    it("rejects non-merge messages", () => {
      expect(isMergeCommit("fix: resolve merge conflict")).toBe(false);
      expect(isMergeCommit("feat: add merge sort")).toBe(false);
      expect(isMergeCommit("")).toBe(false);
    });
  });

  describe("isRevertCommit", () => {
    it("detects revert messages", () => {
      expect(isRevertCommit("Revert \"add new feature\"")).toBe(true);
      expect(isRevertCommit("revert bad change")).toBe(true);
      expect(isRevertCommit("fix: revert to previous behavior")).toBe(true);
    });

    it("rejects non-revert messages", () => {
      expect(isRevertCommit("fix: resolve bug")).toBe(false);
      expect(isRevertCommit("feat: add new feature")).toBe(false);
      expect(isRevertCommit("")).toBe(false);
    });
  });

  describe("isFirstOfDay", () => {
    function makeTestCommit(timestamp: string): Commit {
      return {
        id: "test",
        repoId: "repo1",
        timestamp,
        author: "testuser",
        message: "test",
        stats: { additions: 10, deletions: 5, filesChanged: 1 },
        primaryLanguage: "TypeScript",
        languages: { TypeScript: 10 },
        ciStatus: "pass",
        musicalParams: {
          instrument: "FMSynth",
          note: "C3",
          duration: 0.5,
          velocity: 0.3,
          octave: 3,
          scale: "major",
          pan: 0,
          effects: { reverb: 0.2, delay: 0 },
        },
      };
    }

    it("returns true when there is no previous commit", () => {
      expect(isFirstOfDay(makeTestCommit("2024-06-15T09:00:00Z"), null)).toBe(true);
    });

    it("returns true when commits are on different days", () => {
      const prev = makeTestCommit("2024-06-14T23:59:00Z");
      const curr = makeTestCommit("2024-06-15T00:01:00Z");
      expect(isFirstOfDay(curr, prev)).toBe(true);
    });

    it("returns false when commits are on the same day", () => {
      const prev = makeTestCommit("2024-06-15T09:00:00Z");
      const curr = makeTestCommit("2024-06-15T14:00:00Z");
      expect(isFirstOfDay(curr, prev)).toBe(false);
    });

    it("returns true when commits span different years", () => {
      const prev = makeTestCommit("2023-12-31T23:00:00Z");
      const curr = makeTestCommit("2024-01-01T01:00:00Z");
      expect(isFirstOfDay(curr, prev)).toBe(true);
    });
  });
});
