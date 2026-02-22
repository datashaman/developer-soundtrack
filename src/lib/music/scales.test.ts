import { describe, it, expect } from "vitest";
import { SCALES, getNoteName } from "./scales";

describe("SCALES", () => {
  it("defines major scale intervals correctly", () => {
    expect(SCALES.major).toEqual([0, 2, 4, 5, 7, 9, 11]);
  });

  it("defines minor scale intervals correctly", () => {
    expect(SCALES.minor).toEqual([0, 2, 3, 5, 7, 8, 10]);
  });

  it("defines dorian mode intervals correctly", () => {
    expect(SCALES.dorian).toEqual([0, 2, 3, 5, 7, 9, 10]);
  });
});

describe("getNoteName", () => {
  describe("major scale", () => {
    it("returns root note at index 0", () => {
      expect(getNoteName("C", "major", 0, 4)).toBe("C4");
    });

    it("returns correct notes for C major scale", () => {
      const expected = ["C4", "D4", "E4", "F4", "G4", "A4", "B4"];
      for (let i = 0; i < 7; i++) {
        expect(getNoteName("C", "major", i, 4)).toBe(expected[i]);
      }
    });

    it("wraps to next octave at index 7", () => {
      expect(getNoteName("C", "major", 7, 4)).toBe("C5");
    });

    it("handles non-C root notes", () => {
      expect(getNoteName("G", "major", 0, 3)).toBe("G3");
      expect(getNoteName("G", "major", 1, 3)).toBe("A3");
      expect(getNoteName("G", "major", 2, 3)).toBe("B3");
      expect(getNoteName("G", "major", 3, 3)).toBe("C4");
    });
  });

  describe("minor scale", () => {
    it("returns correct notes for A minor scale", () => {
      const expected = ["A4", "B4", "C5", "D5", "E5", "F5", "G5"];
      for (let i = 0; i < 7; i++) {
        expect(getNoteName("A", "minor", i, 4)).toBe(expected[i]);
      }
    });

    it("returns correct notes for C minor scale", () => {
      expect(getNoteName("C", "minor", 0, 4)).toBe("C4");
      expect(getNoteName("C", "minor", 1, 4)).toBe("D4");
      expect(getNoteName("C", "minor", 2, 4)).toBe("D#4");
      expect(getNoteName("C", "minor", 3, 4)).toBe("F4");
    });
  });

  describe("dorian scale", () => {
    it("returns correct notes for D dorian scale", () => {
      const expected = ["D4", "E4", "F4", "G4", "A4", "B4", "C5"];
      for (let i = 0; i < 7; i++) {
        expect(getNoteName("D", "dorian", i, 4)).toBe(expected[i]);
      }
    });
  });

  describe("edge cases", () => {
    it("throws on invalid root note", () => {
      expect(() => getNoteName("X", "major", 0, 4)).toThrow(
        "Invalid root note: X"
      );
    });

    it("handles sharps as root notes", () => {
      expect(getNoteName("F#", "major", 0, 4)).toBe("F#4");
      expect(getNoteName("C#", "minor", 0, 3)).toBe("C#3");
    });

    it("handles negative scale indices via wrapping", () => {
      // -1 should wrap to the last note of the scale (index 6)
      expect(getNoteName("C", "major", -1, 4)).toBe("B3");
    });

    it("handles large scale indices spanning multiple octaves", () => {
      // Index 14 = 2 full scales (14 = 7*2), so back to root 2 octaves up
      expect(getNoteName("C", "major", 14, 3)).toBe("C5");
    });
  });
});
