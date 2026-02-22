import { describe, expect, it } from "vitest";
import { djb2Hash, hashToColor, hashToRange, hashToRhythmPattern } from "./hash";

describe("djb2Hash", () => {
  it("produces a consistent hash for the same input", () => {
    expect(djb2Hash("octocat")).toBe(djb2Hash("octocat"));
  });

  it("produces different hashes for different inputs", () => {
    expect(djb2Hash("alice")).not.toBe(djb2Hash("bob"));
  });

  it("returns a non-negative 32-bit integer", () => {
    const hash = djb2Hash("test");
    expect(hash).toBeGreaterThanOrEqual(0);
    expect(hash).toBeLessThanOrEqual(0xffffffff);
  });

  it("handles empty string", () => {
    const hash = djb2Hash("");
    expect(hash).toBe(5381);
  });
});

describe("hashToRange", () => {
  it("returns a value within the specified range", () => {
    const value = hashToRange("octocat", -0.8, 0.8);
    expect(value).toBeGreaterThanOrEqual(-0.8);
    expect(value).toBeLessThanOrEqual(0.8);
  });

  it("is deterministic", () => {
    expect(hashToRange("alice", 0, 1)).toBe(hashToRange("alice", 0, 1));
  });

  it("produces different values for different inputs", () => {
    expect(hashToRange("alice", 0, 1)).not.toBe(hashToRange("bob", 0, 1));
  });

  it("respects min/max boundaries for various inputs", () => {
    const logins = ["a", "bb", "ccc", "dddd", "eeeee", "ffffff"];
    for (const login of logins) {
      const value = hashToRange(login, -1, 1);
      expect(value).toBeGreaterThanOrEqual(-1);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});

describe("hashToColor", () => {
  it("returns a valid hex color string", () => {
    const color = hashToColor("octocat");
    expect(color).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("is deterministic", () => {
    expect(hashToColor("alice")).toBe(hashToColor("alice"));
  });

  it("produces different colors for different inputs", () => {
    expect(hashToColor("alice")).not.toBe(hashToColor("bob"));
  });
});

describe("hashToRhythmPattern", () => {
  it("returns an array of 3-6 elements", () => {
    const pattern = hashToRhythmPattern("octocat");
    expect(pattern.length).toBeGreaterThanOrEqual(3);
    expect(pattern.length).toBeLessThanOrEqual(6);
  });

  it("contains only valid duration values (0.5, 1, 1.5)", () => {
    const pattern = hashToRhythmPattern("octocat");
    for (const dur of pattern) {
      expect([0.5, 1, 1.5]).toContain(dur);
    }
  });

  it("is deterministic", () => {
    expect(hashToRhythmPattern("alice")).toEqual(hashToRhythmPattern("alice"));
  });

  it("produces different patterns for different inputs", () => {
    const p1 = hashToRhythmPattern("alice");
    const p2 = hashToRhythmPattern("bob");
    // They could theoretically be equal, but in practice with different hashes they won't be
    const same = p1.length === p2.length && p1.every((v, i) => v === p2[i]);
    expect(same).toBe(false);
  });

  it("produces valid patterns for various inputs", () => {
    const logins = ["a", "bb", "ccc", "dddd", "eeeee", "ffffff", "g1234567"];
    for (const login of logins) {
      const pattern = hashToRhythmPattern(login);
      expect(pattern.length).toBeGreaterThanOrEqual(3);
      expect(pattern.length).toBeLessThanOrEqual(6);
      for (const dur of pattern) {
        expect([0.5, 1, 1.5]).toContain(dur);
      }
    }
  });
});
