// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import type { Commit } from "@/types";
import { useLiveCommits } from "./useLiveCommits";

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

// Mock EventSource
type EventSourceListener = (event: MessageEvent) => void;

interface MockEventSource {
  url: string;
  close: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  onerror: ((event: Event) => void) | null;
  _listeners: Map<string, EventSourceListener[]>;
  _emit: (eventName: string, data?: string) => void;
  _triggerError: () => void;
}

let mockEventSourceInstances: MockEventSource[] = [];

function MockEventSourceConstructor(this: MockEventSource, url: string) {
  const listeners = new Map<string, EventSourceListener[]>();
  this.url = url;
  this.close = vi.fn();
  this.addEventListener = vi.fn().mockImplementation((event: string, handler: EventSourceListener) => {
    const existing = listeners.get(event) ?? [];
    existing.push(handler);
    listeners.set(event, existing);
  });
  this.onerror = null;
  this._listeners = listeners;
  this._emit = function (eventName: string, data?: string) {
    const handlers = this._listeners.get(eventName) ?? [];
    const event = { data: data ?? "" } as MessageEvent;
    for (const handler of handlers) {
      handler(event);
    }
  };
  this._triggerError = function () {
    if (this.onerror) {
      this.onerror(new Event("error"));
    }
  };
  mockEventSourceInstances.push(this);
}

describe("useLiveCommits", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockEventSourceInstances = [];
    (globalThis as Record<string, unknown>).EventSource = MockEventSourceConstructor;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete (globalThis as Record<string, unknown>).EventSource;
    cleanup();
  });

  it("returns initial state with null repo", () => {
    const { result } = renderHook(() => useLiveCommits(null));

    expect(result.current.latestCommit).toBeNull();
    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("does not create EventSource when repo is null", () => {
    renderHook(() => useLiveCommits(null));

    expect(mockEventSourceInstances).toHaveLength(0);
  });

  it("creates EventSource with correct URL when repo is provided", () => {
    renderHook(() => useLiveCommits("owner/repo"));

    expect(mockEventSourceInstances).toHaveLength(1);
    expect(mockEventSourceInstances[0].url).toBe("/api/live?repo=owner%2Frepo");
  });

  it("sets isConnected to true on connected event", () => {
    const { result } = renderHook(() => useLiveCommits("owner/repo"));

    expect(result.current.isConnected).toBe(false);

    act(() => {
      mockEventSourceInstances[0]._emit("connected", JSON.stringify({ repo: "owner/repo" }));
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("sets latestCommit when commits event is received", () => {
    const { result } = renderHook(() => useLiveCommits("owner/repo"));
    const commit = makeCommit({ id: "commit-1" });

    act(() => {
      mockEventSourceInstances[0]._emit("commits", JSON.stringify([commit]));
    });

    expect(result.current.latestCommit).toEqual(commit);
  });

  it("sets latestCommit to last commit when multiple commits arrive", () => {
    const { result } = renderHook(() => useLiveCommits("owner/repo"));
    const commit1 = makeCommit({ id: "commit-1" });
    const commit2 = makeCommit({ id: "commit-2" });

    act(() => {
      mockEventSourceInstances[0]._emit("commits", JSON.stringify([commit1, commit2]));
    });

    expect(result.current.latestCommit?.id).toBe("commit-2");
  });

  it("ignores empty commits array", () => {
    const { result } = renderHook(() => useLiveCommits("owner/repo"));

    act(() => {
      mockEventSourceInstances[0]._emit("commits", JSON.stringify([]));
    });

    expect(result.current.latestCommit).toBeNull();
  });

  it("ignores malformed commit data", () => {
    const { result } = renderHook(() => useLiveCommits("owner/repo"));

    act(() => {
      mockEventSourceInstances[0]._emit("commits", "not valid json{{{");
    });

    expect(result.current.latestCommit).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("handles connection error and sets error state", () => {
    const { result } = renderHook(() => useLiveCommits("owner/repo"));

    act(() => {
      mockEventSourceInstances[0]._emit("connected");
    });

    expect(result.current.isConnected).toBe(true);

    act(() => {
      mockEventSourceInstances[0]._triggerError();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBe("Connection lost. Reconnecting...");
    expect(mockEventSourceInstances[0].close).toHaveBeenCalled();
  });

  it("auto-reconnects after disconnect", () => {
    renderHook(() => useLiveCommits("owner/repo"));

    expect(mockEventSourceInstances).toHaveLength(1);

    act(() => {
      mockEventSourceInstances[0]._triggerError();
    });

    // Not yet reconnected
    expect(mockEventSourceInstances).toHaveLength(1);

    // Advance past reconnect delay (3 seconds)
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Should have created a new EventSource
    expect(mockEventSourceInstances).toHaveLength(2);
    expect(mockEventSourceInstances[1].url).toBe("/api/live?repo=owner%2Frepo");
  });

  it("clears error on successful reconnect", () => {
    const { result } = renderHook(() => useLiveCommits("owner/repo"));

    act(() => {
      mockEventSourceInstances[0]._triggerError();
    });

    expect(result.current.error).toBe("Connection lost. Reconnecting...");

    // Reconnect
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Receive connected event on new connection
    act(() => {
      mockEventSourceInstances[1]._emit("connected");
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("closes EventSource on unmount", () => {
    const { unmount } = renderHook(() => useLiveCommits("owner/repo"));

    const es = mockEventSourceInstances[0];
    expect(es.close).not.toHaveBeenCalled();

    unmount();

    expect(es.close).toHaveBeenCalled();
  });

  it("cancels reconnect timer on unmount", () => {
    const { unmount } = renderHook(() => useLiveCommits("owner/repo"));

    act(() => {
      mockEventSourceInstances[0]._triggerError();
    });

    unmount();

    // Advance time — should NOT create a new EventSource since we unmounted
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Only the original instance, no reconnect
    expect(mockEventSourceInstances).toHaveLength(1);
  });

  it("closes old EventSource and creates new one when repo changes", () => {
    const { rerender } = renderHook(
      (props: { repo: string }) => useLiveCommits(props.repo),
      { initialProps: { repo: "owner/repo1" } },
    );

    expect(mockEventSourceInstances).toHaveLength(1);
    const firstES = mockEventSourceInstances[0];

    rerender({ repo: "owner/repo2" });

    expect(firstES.close).toHaveBeenCalled();
    expect(mockEventSourceInstances).toHaveLength(2);
    expect(mockEventSourceInstances[1].url).toBe("/api/live?repo=owner%2Frepo2");
  });

  it("cleans up when repo changes to null", () => {
    const { result, rerender } = renderHook(
      (props: { repo: string | null }) => useLiveCommits(props.repo),
      { initialProps: { repo: "owner/repo" as string | null } },
    );

    act(() => {
      mockEventSourceInstances[0]._emit("connected");
    });

    expect(result.current.isConnected).toBe(true);

    rerender({ repo: null });

    expect(mockEventSourceInstances[0].close).toHaveBeenCalled();
    expect(result.current.isConnected).toBe(false);
    expect(result.current.latestCommit).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("does not update state after unmount during reconnect", () => {
    const { unmount } = renderHook(() => useLiveCommits("owner/repo"));

    // Trigger error to start reconnect timer
    act(() => {
      mockEventSourceInstances[0]._triggerError();
    });

    // Unmount before reconnect fires
    unmount();

    // Advance timer — should not throw or create new EventSource
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(mockEventSourceInstances).toHaveLength(1);
  });
});
