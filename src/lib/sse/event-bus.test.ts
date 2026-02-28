import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Commit } from "@/types";

// Fresh event bus for each test
let sseEventBus: Awaited<typeof import("./event-bus")>["sseEventBus"];

function makeCommit(overrides: Partial<Commit> = {}): Commit {
  return {
    id: "abc123",
    repoId: "owner/repo",
    timestamp: "2026-01-15T10:00:00Z",
    author: "alice",
    message: "feat: add feature",
    stats: { additions: 10, deletions: 2, filesChanged: 3 },
    primaryLanguage: "TypeScript",
    languages: { TypeScript: 10 },
    ciStatus: "unknown",
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
    ...overrides,
  };
}

describe("SSEEventBus", () => {
  beforeEach(async () => {
    // Re-import to get a fresh singleton each test
    vi.resetModules();
    const mod = await import("./event-bus");
    sseEventBus = mod.sseEventBus;
  });

  describe("subscribe", () => {
    it("returns a unique client ID", () => {
      const id1 = sseEventBus.subscribe("owner/repo", () => true);
      const id2 = sseEventBus.subscribe("owner/repo", () => true);
      expect(id1).not.toBe(id2);
    });

    it("registers the client for the repo", () => {
      sseEventBus.subscribe("owner/repo", () => true);
      expect(sseEventBus.getClientCount("owner/repo")).toBe(1);
    });

    it("supports multiple clients per repo", () => {
      sseEventBus.subscribe("owner/repo", () => true);
      sseEventBus.subscribe("owner/repo", () => true);
      sseEventBus.subscribe("owner/repo", () => true);
      expect(sseEventBus.getClientCount("owner/repo")).toBe(3);
    });

    it("isolates clients by repo", () => {
      sseEventBus.subscribe("owner/repo-a", () => true);
      sseEventBus.subscribe("owner/repo-b", () => true);
      expect(sseEventBus.getClientCount("owner/repo-a")).toBe(1);
      expect(sseEventBus.getClientCount("owner/repo-b")).toBe(1);
    });
  });

  describe("unsubscribe", () => {
    it("removes a client by ID", () => {
      const id = sseEventBus.subscribe("owner/repo", () => true);
      sseEventBus.unsubscribe("owner/repo", id);
      expect(sseEventBus.getClientCount("owner/repo")).toBe(0);
    });

    it("only removes the specified client", () => {
      const id1 = sseEventBus.subscribe("owner/repo", () => true);
      sseEventBus.subscribe("owner/repo", () => true);
      sseEventBus.unsubscribe("owner/repo", id1);
      expect(sseEventBus.getClientCount("owner/repo")).toBe(1);
    });

    it("handles unsubscribing from non-existent repo", () => {
      expect(() => {
        sseEventBus.unsubscribe("no/repo", "999");
      }).not.toThrow();
    });

    it("handles unsubscribing non-existent client ID", () => {
      sseEventBus.subscribe("owner/repo", () => true);
      sseEventBus.unsubscribe("owner/repo", "nonexistent");
      expect(sseEventBus.getClientCount("owner/repo")).toBe(1);
    });
  });

  describe("broadcast", () => {
    it("delivers commits to all subscribed clients", () => {
      const commits = [makeCommit()];
      const cb1 = vi.fn(() => true);
      const cb2 = vi.fn(() => true);

      sseEventBus.subscribe("owner/repo", cb1);
      sseEventBus.subscribe("owner/repo", cb2);
      sseEventBus.broadcast("owner/repo", commits);

      expect(cb1).toHaveBeenCalledWith(commits);
      expect(cb2).toHaveBeenCalledWith(commits);
    });

    it("does not deliver to clients on other repos", () => {
      const commits = [makeCommit()];
      const cb = vi.fn(() => true);

      sseEventBus.subscribe("owner/other", cb);
      sseEventBus.broadcast("owner/repo", commits);

      expect(cb).not.toHaveBeenCalled();
    });

    it("removes clients that return false (disconnected)", () => {
      const disconnected = vi.fn(() => false);
      const connected = vi.fn(() => true);

      sseEventBus.subscribe("owner/repo", disconnected);
      sseEventBus.subscribe("owner/repo", connected);
      sseEventBus.broadcast("owner/repo", [makeCommit()]);

      expect(sseEventBus.getClientCount("owner/repo")).toBe(1);
    });

    it("cleans up repo entry when all clients disconnect", () => {
      sseEventBus.subscribe("owner/repo", () => false);
      sseEventBus.broadcast("owner/repo", [makeCommit()]);

      expect(sseEventBus.getClientCount("owner/repo")).toBe(0);
    });

    it("handles broadcast to repo with no subscribers", () => {
      expect(() => {
        sseEventBus.broadcast("no/subscribers", [makeCommit()]);
      }).not.toThrow();
    });

    it("delivers multiple commits at once", () => {
      const commits = [
        makeCommit({ id: "1" }),
        makeCommit({ id: "2" }),
        makeCommit({ id: "3" }),
      ];
      const cb = vi.fn(() => true);

      sseEventBus.subscribe("owner/repo", cb);
      sseEventBus.broadcast("owner/repo", commits);

      expect(cb).toHaveBeenCalledWith(commits);
      expect(cb).toHaveBeenCalledTimes(1);
    });
  });

  describe("getClientCount", () => {
    it("returns 0 for unknown repo", () => {
      expect(sseEventBus.getClientCount("unknown/repo")).toBe(0);
    });

    it("returns correct count after subscribe/unsubscribe", () => {
      const id = sseEventBus.subscribe("owner/repo", () => true);
      expect(sseEventBus.getClientCount("owner/repo")).toBe(1);
      sseEventBus.unsubscribe("owner/repo", id);
      expect(sseEventBus.getClientCount("owner/repo")).toBe(0);
    });
  });

  describe("getTotalClientCount", () => {
    it("returns 0 when no clients connected", () => {
      expect(sseEventBus.getTotalClientCount()).toBe(0);
    });

    it("counts clients across all repos", () => {
      sseEventBus.subscribe("owner/repo-a", () => true);
      sseEventBus.subscribe("owner/repo-a", () => true);
      sseEventBus.subscribe("owner/repo-b", () => true);

      expect(sseEventBus.getTotalClientCount()).toBe(3);
    });
  });
});
