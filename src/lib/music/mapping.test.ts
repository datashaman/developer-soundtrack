import { describe, expect, it } from "vitest";
import type { CIStatus, Commit } from "@/types";
import {
  commitToMusicalParams,
  mapCIStatusToScale,
  mapDiffToDuration,
  mapDiffToPitch,
  mapFilesToOctave,
  mapFilesToVelocity,
  mapTimeToEffects,
} from "./mapping";

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

describe("mapDiffToPitch", () => {
  it("returns 0 for zero additions", () => {
    expect(mapDiffToPitch(0)).toBe(0);
  });

  it("returns 0 for small additions (< 30)", () => {
    expect(mapDiffToPitch(15)).toBe(0);
    expect(mapDiffToPitch(29)).toBe(0);
  });

  it("returns correct index for moderate additions", () => {
    expect(mapDiffToPitch(30)).toBe(1);
    expect(mapDiffToPitch(60)).toBe(2);
    expect(mapDiffToPitch(90)).toBe(3);
  });

  it("clamps at 13 for massive diffs", () => {
    expect(mapDiffToPitch(500)).toBe(13);
    expect(mapDiffToPitch(10000)).toBe(13);
  });

  it("clamps at 0 for negative values", () => {
    expect(mapDiffToPitch(-10)).toBe(0);
  });
});

describe("mapDiffToDuration", () => {
  it("returns minimum 0.15 for zero additions", () => {
    expect(mapDiffToDuration(0)).toBeCloseTo(0.15);
  });

  it("returns correct duration for moderate additions", () => {
    expect(mapDiffToDuration(150)).toBeCloseTo(1.15);
  });

  it("clamps at 2.5 for massive diffs", () => {
    expect(mapDiffToDuration(1000)).toBeCloseTo(2.5);
    expect(mapDiffToDuration(10000)).toBeCloseTo(2.5);
  });

  it("returns minimum for negative values", () => {
    expect(mapDiffToDuration(-50)).toBeCloseTo(0.15);
  });
});

describe("mapFilesToVelocity", () => {
  it("returns minimum 0.3 for zero files", () => {
    expect(mapFilesToVelocity(0)).toBeCloseTo(0.3);
  });

  it("returns 0.3 for few files", () => {
    expect(mapFilesToVelocity(1)).toBeCloseTo(0.3);
    expect(mapFilesToVelocity(3)).toBeCloseTo(0.3);
  });

  it("returns correct velocity for moderate files", () => {
    expect(mapFilesToVelocity(5)).toBeCloseTo(0.5);
    expect(mapFilesToVelocity(7)).toBeCloseTo(0.7);
  });

  it("clamps at 1.0 for many files", () => {
    expect(mapFilesToVelocity(10)).toBeCloseTo(1.0);
    expect(mapFilesToVelocity(50)).toBeCloseTo(1.0);
  });
});

describe("mapFilesToOctave", () => {
  it("returns octave 3 for few files (0-4)", () => {
    expect(mapFilesToOctave(0)).toBe(3);
    expect(mapFilesToOctave(1)).toBe(3);
    expect(mapFilesToOctave(4)).toBe(3);
  });

  it("returns octave 4 for 5-8 files", () => {
    expect(mapFilesToOctave(5)).toBe(4);
    expect(mapFilesToOctave(8)).toBe(4);
  });

  it("returns octave 5 for more than 8 files", () => {
    expect(mapFilesToOctave(9)).toBe(5);
    expect(mapFilesToOctave(50)).toBe(5);
  });
});

describe("mapCIStatusToScale", () => {
  it("maps pass to major", () => {
    expect(mapCIStatusToScale("pass")).toBe("major");
  });

  it("maps fail to minor", () => {
    expect(mapCIStatusToScale("fail")).toBe("minor");
  });

  it("maps pending to dorian", () => {
    expect(mapCIStatusToScale("pending")).toBe("dorian");
  });

  it("maps unknown to dorian", () => {
    expect(mapCIStatusToScale("unknown")).toBe("dorian");
  });
});

describe("mapTimeToEffects", () => {
  it("returns low reverb for daytime commits", () => {
    const effects = mapTimeToEffects("2024-06-15T14:30:00Z", "fix: bug");
    expect(effects.reverb).toBeCloseTo(0.2);
  });

  it("returns high reverb for late night commits (after 10pm)", () => {
    const effects = mapTimeToEffects("2024-06-15T23:30:00Z", "fix: bug");
    expect(effects.reverb).toBeCloseTo(0.6);
  });

  it("returns high reverb for early morning commits (before 6am)", () => {
    const effects = mapTimeToEffects("2024-06-15T03:00:00Z", "fix: bug");
    expect(effects.reverb).toBeCloseTo(0.6);
  });

  it("returns no delay for non-merge commits", () => {
    const effects = mapTimeToEffects("2024-06-15T14:30:00Z", "fix: resolve bug");
    expect(effects.delay).toBeCloseTo(0.0);
  });

  it("returns delay 0.4 for merge commits", () => {
    const effects = mapTimeToEffects(
      "2024-06-15T14:30:00Z",
      "Merge pull request #42 from feature-branch"
    );
    expect(effects.delay).toBeCloseTo(0.4);
  });

  it("handles merge commit case insensitively", () => {
    const effects = mapTimeToEffects("2024-06-15T14:30:00Z", "merge branch 'main'");
    expect(effects.delay).toBeCloseTo(0.4);
  });

  it("combines late night and merge effects", () => {
    const effects = mapTimeToEffects(
      "2024-06-15T01:00:00Z",
      "Merge branch 'feature'"
    );
    expect(effects.reverb).toBeCloseTo(0.6);
    expect(effects.delay).toBeCloseTo(0.4);
  });

  it("returns low reverb at exactly 6am", () => {
    const effects = mapTimeToEffects("2024-06-15T06:00:00Z", "fix: bug");
    expect(effects.reverb).toBeCloseTo(0.2);
  });

  it("returns high reverb at exactly 10pm", () => {
    const effects = mapTimeToEffects("2024-06-15T22:00:00Z", "fix: bug");
    expect(effects.reverb).toBeCloseTo(0.6);
  });
});

describe("commitToMusicalParams", () => {
  it("produces correct params for a basic commit", () => {
    const commit = makeCommit({
      stats: { additions: 50, deletions: 10, filesChanged: 3 },
      ciStatus: "pass",
      primaryLanguage: "TypeScript",
      timestamp: "2024-06-15T14:30:00Z",
      message: "fix: resolve bug",
    });

    const params = commitToMusicalParams(commit);

    expect(params.instrument).toBe("FMSynth");
    expect(params.scale).toBe("major");
    expect(params.duration).toBeCloseTo(0.483, 2);
    expect(params.velocity).toBeCloseTo(0.3);
    expect(params.octave).toBe(3);
    expect(params.effects.reverb).toBeCloseTo(0.2);
    expect(params.effects.delay).toBeCloseTo(0.0);
    expect(params.note).toBe("D3");
  });

  it("is deterministic — same commit always produces same params", () => {
    const commit = makeCommit();
    const params1 = commitToMusicalParams(commit);
    const params2 = commitToMusicalParams(commit);
    expect(params1).toEqual(params2);
  });

  it("handles zero additions", () => {
    const commit = makeCommit({
      stats: { additions: 0, deletions: 5, filesChanged: 1 },
    });
    const params = commitToMusicalParams(commit);
    expect(params.duration).toBeCloseTo(0.15);
    expect(params.note).toBe("C3");
  });

  it("handles massive diffs", () => {
    const commit = makeCommit({
      stats: { additions: 5000, deletions: 200, filesChanged: 50 },
    });
    const params = commitToMusicalParams(commit);
    expect(params.duration).toBeCloseTo(2.5);
    expect(params.velocity).toBeCloseTo(1.0);
    expect(params.octave).toBe(5);
  });

  it("uses correct instrument for Python", () => {
    const commit = makeCommit({ primaryLanguage: "Python" });
    const params = commitToMusicalParams(commit);
    expect(params.instrument).toBe("AMSynth");
  });

  it("uses correct instrument for unknown language", () => {
    const commit = makeCommit({ primaryLanguage: "Brainfuck" });
    const params = commitToMusicalParams(commit);
    expect(params.instrument).toBe("Synth");
  });

  it("maps CI failure to minor scale", () => {
    const commit = makeCommit({ ciStatus: "fail" });
    const params = commitToMusicalParams(commit);
    expect(params.scale).toBe("minor");
  });

  it("maps CI pending to dorian scale", () => {
    const commit = makeCommit({ ciStatus: "pending" });
    const params = commitToMusicalParams(commit);
    expect(params.scale).toBe("dorian");
  });

  it("applies merge commit delay", () => {
    const commit = makeCommit({ message: "Merge pull request #42" });
    const params = commitToMusicalParams(commit);
    expect(params.effects.delay).toBeCloseTo(0.4);
  });

  it("applies late night reverb", () => {
    const commit = makeCommit({ timestamp: "2024-06-15T02:00:00Z" });
    const params = commitToMusicalParams(commit);
    expect(params.effects.reverb).toBeCloseTo(0.6);
  });

  it("sets pan to 0 (author motifs handled separately)", () => {
    const commit = makeCommit();
    const params = commitToMusicalParams(commit);
    expect(params.pan).toBe(0);
  });
});
