import { describe, expect, it } from "vitest";
import { generateAuthorMotif, hashToPanPosition } from "./motifs";

describe("hashToPanPosition", () => {
  it("returns a value in range [-0.8, 0.8]", () => {
    const pan = hashToPanPosition("octocat");
    expect(pan).toBeGreaterThanOrEqual(-0.8);
    expect(pan).toBeLessThanOrEqual(0.8);
  });

  it("is deterministic", () => {
    expect(hashToPanPosition("alice")).toBe(hashToPanPosition("alice"));
  });

  it("produces different positions for different logins", () => {
    expect(hashToPanPosition("alice")).not.toBe(hashToPanPosition("bob"));
  });

  it("stays in range for various logins", () => {
    const logins = ["a", "user123", "long-username-here", "x", "CamelCase", "UPPER"];
    for (const login of logins) {
      const pan = hashToPanPosition(login);
      expect(pan).toBeGreaterThanOrEqual(-0.8);
      expect(pan).toBeLessThanOrEqual(0.8);
    }
  });
});

describe("generateAuthorMotif", () => {
  it("returns an AuthorMotif with all required fields", () => {
    const motif = generateAuthorMotif("octocat");
    expect(motif).toHaveProperty("login", "octocat");
    expect(motif).toHaveProperty("panPosition");
    expect(motif).toHaveProperty("rhythmPattern");
    expect(motif).toHaveProperty("color");
  });

  it("is deterministic — same login always produces same motif", () => {
    const motif1 = generateAuthorMotif("alice");
    const motif2 = generateAuthorMotif("alice");
    expect(motif1).toEqual(motif2);
  });

  it("produces different motifs for different logins", () => {
    const motif1 = generateAuthorMotif("alice");
    const motif2 = generateAuthorMotif("bob");
    expect(motif1.panPosition).not.toBe(motif2.panPosition);
    expect(motif1.color).not.toBe(motif2.color);
  });

  it("pan position is within [-0.8, 0.8]", () => {
    const motif = generateAuthorMotif("octocat");
    expect(motif.panPosition).toBeGreaterThanOrEqual(-0.8);
    expect(motif.panPosition).toBeLessThanOrEqual(0.8);
  });

  it("rhythm pattern has valid values", () => {
    const motif = generateAuthorMotif("octocat");
    expect(motif.rhythmPattern.length).toBeGreaterThanOrEqual(3);
    expect(motif.rhythmPattern.length).toBeLessThanOrEqual(6);
    for (const dur of motif.rhythmPattern) {
      expect([0.5, 1, 1.5]).toContain(dur);
    }
  });

  it("color is a valid hex color", () => {
    const motif = generateAuthorMotif("octocat");
    expect(motif.color).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("preserves the login in the returned motif", () => {
    const motif = generateAuthorMotif("some-user");
    expect(motif.login).toBe("some-user");
  });
});
