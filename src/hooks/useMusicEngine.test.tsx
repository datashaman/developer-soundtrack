// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { Commit } from "@/types";

// --- Tone.js mock (follows existing pattern from engine.test.ts) ---
vi.mock("tone", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function MockVolume(this: any) {
    this.volume = { value: 0 };
    this.chain = vi.fn();
    this.dispose = vi.fn();
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function MockAnalyser(this: any) {
    this.getValue = vi.fn(() => new Float32Array(2048));
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

  function makeMockSynth() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return function MockSynthCtor(this: any) {
      this.chain = vi.fn();
      this.connect = vi.fn();
      this.triggerAttackRelease = vi.fn();
      this.dispose = vi.fn();
      this.envelope = { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.5 };
    };
  }

  return {
    start: vi.fn().mockResolvedValue(undefined),
    now: vi.fn(() => 0),
    getDestination: vi.fn(() => ({})),
    Volume: MockVolume,
    Analyser: MockAnalyser,
    Panner: MockPanner,
    Reverb: MockReverb,
    FeedbackDelay: MockFeedbackDelay,
    Synth: makeMockSynth(),
    AMSynth: makeMockSynth(),
    FMSynth: makeMockSynth(),
    MonoSynth: makeMockSynth(),
    MetalSynth: makeMockSynth(),
    NoiseSynth: makeMockSynth(),
    PluckSynth: makeMockSynth(),
  };
});

// Must import after mocking
import { useMusicEngine } from "./useMusicEngine";
import { MusicEngine } from "@/lib/music/engine";

function makeCommit(overrides: Partial<Commit> = {}): Commit {
  return {
    id: "abc123",
    repoId: "repo1",
    timestamp: "2025-03-15T14:30:00Z",
    author: "dev",
    message: "fix bug",
    stats: { additions: 50, deletions: 10, filesChanged: 3 },
    primaryLanguage: "TypeScript",
    languages: { TypeScript: 50 },
    ciStatus: "pass",
    musicalParams: {
      instrument: "FMSynth",
      note: "D3",
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

describe("useMusicEngine", () => {
  beforeEach(() => {
    // Ensure a fresh singleton for each test
    const engine = MusicEngine.getInstance();
    engine.dispose();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns initial state", () => {
    const { result } = renderHook(() => useMusicEngine());
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.currentCommit).toBeNull();
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.progress).toBe(0);
  });

  it("exposes all control methods", () => {
    const { result } = renderHook(() => useMusicEngine());
    expect(typeof result.current.play).toBe("function");
    expect(typeof result.current.pause).toBe("function");
    expect(typeof result.current.resume).toBe("function");
    expect(typeof result.current.stop).toBe("function");
    expect(typeof result.current.seekTo).toBe("function");
    expect(typeof result.current.setTempo).toBe("function");
    expect(typeof result.current.setVolume).toBe("function");
    expect(typeof result.current.getWaveformData).toBe("function");
    expect(typeof result.current.getFFTData).toBe("function");
  });

  it("play() initializes the engine and sets isPlaying", async () => {
    const commits = [makeCommit(), makeCommit({ id: "def456" })];
    const { result } = renderHook(() => useMusicEngine());

    await act(async () => {
      await result.current.play(commits);
    });

    expect(result.current.isPlaying).toBe(true);
  });

  it("pause() sets isPlaying to false", async () => {
    const commits = [makeCommit(), makeCommit({ id: "def456" })];
    const { result } = renderHook(() => useMusicEngine());

    await act(async () => {
      await result.current.play(commits);
    });

    act(() => {
      result.current.pause();
    });

    expect(result.current.isPlaying).toBe(false);
  });

  it("resume() sets isPlaying back to true", async () => {
    const commits = [makeCommit(), makeCommit({ id: "def456" })];
    const { result } = renderHook(() => useMusicEngine());

    await act(async () => {
      await result.current.play(commits);
    });

    act(() => {
      result.current.pause();
    });

    await act(async () => {
      await result.current.resume();
    });

    expect(result.current.isPlaying).toBe(true);
  });

  it("stop() resets state", async () => {
    const commits = [makeCommit(), makeCommit({ id: "def456" })];
    const { result } = renderHook(() => useMusicEngine());

    await act(async () => {
      await result.current.play(commits);
    });

    act(() => {
      result.current.stop();
    });

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.currentCommit).toBeNull();
  });

  it("seekTo() updates currentIndex", async () => {
    const commits = [
      makeCommit({ id: "a" }),
      makeCommit({ id: "b" }),
      makeCommit({ id: "c" }),
    ];
    const { result } = renderHook(() => useMusicEngine());

    await act(async () => {
      await result.current.play(commits);
    });

    act(() => {
      result.current.seekTo(2);
    });

    expect(result.current.currentIndex).toBe(2);
  });

  it("setTempo() delegates to engine without error", () => {
    const { result } = renderHook(() => useMusicEngine());
    act(() => {
      result.current.setTempo(2.0);
    });
    // No error thrown — success
  });

  it("setVolume() delegates to engine without error", async () => {
    const { result } = renderHook(() => useMusicEngine());

    // Initialize first so masterVolume exists
    await act(async () => {
      await result.current.play([makeCommit()]);
    });

    act(() => {
      result.current.setVolume(0.5);
    });
    // No error thrown — success
  });

  it("getWaveformData() returns Float32Array", async () => {
    const { result } = renderHook(() => useMusicEngine());

    await act(async () => {
      await result.current.play([makeCommit()]);
    });

    const data = result.current.getWaveformData();
    expect(data).toBeInstanceOf(Float32Array);
  });

  it("getFFTData() returns Float32Array", async () => {
    const { result } = renderHook(() => useMusicEngine());

    await act(async () => {
      await result.current.play([makeCommit()]);
    });

    const data = result.current.getFFTData();
    expect(data).toBeInstanceOf(Float32Array);
  });

  it("onNotePlay callback updates currentCommit and currentIndex", async () => {
    const commits = [
      makeCommit({ id: "a", message: "first" }),
      makeCommit({ id: "b", message: "second" }),
    ];
    const { result } = renderHook(() => useMusicEngine());

    await act(async () => {
      await result.current.play(commits);
    });

    // After play(), the engine fires onNotePlay synchronously for the first commit
    expect(result.current.currentCommit?.id).toBe("a");
    expect(result.current.currentIndex).toBe(0);
  });

  it("progress is calculated correctly", async () => {
    const commits = [
      makeCommit({ id: "a" }),
      makeCommit({ id: "b" }),
      makeCommit({ id: "c" }),
    ];
    const { result } = renderHook(() => useMusicEngine());

    await act(async () => {
      await result.current.play(commits);
    });

    // First commit (index 0), so progress = 0 / (3-1) = 0
    expect(result.current.progress).toBe(0);
  });

  it("cleans up callbacks on unmount", () => {
    const { unmount } = renderHook(() => useMusicEngine());
    const engine = MusicEngine.getInstance();

    unmount();

    expect(engine.onNotePlay).toBeNull();
    expect(engine.onPlaybackComplete).toBeNull();
    expect(engine.onError).toBeNull();
  });

  it("handles initialization only once across multiple play calls", async () => {
    const Tone = await import("tone");
    const { result } = renderHook(() => useMusicEngine());

    await act(async () => {
      await result.current.play([makeCommit({ id: "a" })]);
    });

    vi.mocked(Tone.start).mockClear();

    await act(async () => {
      await result.current.play([makeCommit({ id: "b" })]);
    });

    // Tone.start should not be called again since engine is already initialized
    expect(Tone.start).not.toHaveBeenCalled();
  });
});
