// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import { renderHook, cleanup, act } from "@testing-library/react";
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

// Mock Pusher channel and connection
type BindCallback = (...args: unknown[]) => void;

interface MockChannel {
  bind: ReturnType<typeof vi.fn>;
  unbind_all: ReturnType<typeof vi.fn>;
  _handlers: Map<string, BindCallback[]>;
  _emit: (event: string, data?: unknown) => void;
}

interface MockConnection {
  bind: ReturnType<typeof vi.fn>;
  unbind: ReturnType<typeof vi.fn>;
  _handlers: Map<string, BindCallback[]>;
  _emit: (event: string, data?: unknown) => void;
}

let mockChannel: MockChannel;
let mockConnection: MockConnection;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockSubscribe: Mock<(...args: any[]) => any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockUnsubscribe: Mock<(...args: any[]) => any>;

function createMockChannel(): MockChannel {
  const handlers = new Map<string, BindCallback[]>();
  return {
    bind: vi.fn().mockImplementation((event: string, cb: BindCallback) => {
      const list = handlers.get(event) ?? [];
      list.push(cb);
      handlers.set(event, list);
    }),
    unbind_all: vi.fn(),
    _handlers: handlers,
    _emit(event: string, data?: unknown) {
      const list = this._handlers.get(event) ?? [];
      for (const cb of list) {
        cb(data);
      }
    },
  };
}

function createMockConnection(): MockConnection {
  const handlers = new Map<string, BindCallback[]>();
  return {
    bind: vi.fn().mockImplementation((event: string, cb: BindCallback) => {
      const list = handlers.get(event) ?? [];
      list.push(cb);
      handlers.set(event, list);
    }),
    unbind: vi.fn(),
    _handlers: handlers,
    _emit(event: string, data?: unknown) {
      const list = this._handlers.get(event) ?? [];
      for (const cb of list) {
        cb(data);
      }
    },
  };
}

vi.mock("@/lib/pusher/client", () => ({
  getPusherClient: () => {
    return {
      subscribe: (...args: unknown[]) => mockSubscribe(...args),
      unsubscribe: (...args: unknown[]) => mockUnsubscribe(...args),
      get connection() {
        return mockConnection;
      },
    };
  },
}));

describe("useLiveCommits", () => {
  beforeEach(() => {
    mockChannel = createMockChannel();
    mockConnection = createMockConnection();
    mockSubscribe = vi.fn().mockReturnValue(mockChannel);
    mockUnsubscribe = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it("returns initial state with null repo", () => {
    const { result } = renderHook(() => useLiveCommits(null));

    expect(result.current.latestCommit).toBeNull();
    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("does not subscribe to Pusher when repo is null", () => {
    renderHook(() => useLiveCommits(null));
    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it("subscribes to the correct Pusher channel", () => {
    renderHook(() => useLiveCommits("owner/repo"));
    expect(mockSubscribe).toHaveBeenCalledWith("repo-owner-repo");
  });

  it("sets isConnected to true on subscription_succeeded", () => {
    const { result } = renderHook(() => useLiveCommits("owner/repo"));

    expect(result.current.isConnected).toBe(false);

    act(() => {
      mockChannel._emit("pusher:subscription_succeeded");
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("sets latestCommit when commits event is received", () => {
    const { result } = renderHook(() => useLiveCommits("owner/repo"));
    const commit = makeCommit({ id: "commit-1" });

    act(() => {
      mockChannel._emit("commits", [commit]);
    });

    expect(result.current.latestCommit).toEqual(commit);
  });

  it("sets latestCommit to last commit when multiple commits arrive", () => {
    const { result } = renderHook(() => useLiveCommits("owner/repo"));
    const commit1 = makeCommit({ id: "commit-1" });
    const commit2 = makeCommit({ id: "commit-2" });

    act(() => {
      mockChannel._emit("commits", [commit1, commit2]);
    });

    expect(result.current.latestCommit?.id).toBe("commit-2");
  });

  it("ignores empty commits array", () => {
    const { result } = renderHook(() => useLiveCommits("owner/repo"));

    act(() => {
      mockChannel._emit("commits", []);
    });

    expect(result.current.latestCommit).toBeNull();
  });

  it("sets error on subscription_error", () => {
    const { result } = renderHook(() => useLiveCommits("owner/repo"));

    act(() => {
      mockChannel._emit("pusher:subscription_error");
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBe("Failed to subscribe to live updates.");
  });

  it("sets error on connection error", () => {
    const { result } = renderHook(() => useLiveCommits("owner/repo"));

    act(() => {
      mockChannel._emit("pusher:subscription_succeeded");
    });
    expect(result.current.isConnected).toBe(true);

    act(() => {
      mockConnection._emit("error");
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBe("Connection lost. Reconnecting...");
  });

  it("sets error on disconnected event", () => {
    const { result } = renderHook(() => useLiveCommits("owner/repo"));

    act(() => {
      mockChannel._emit("pusher:subscription_succeeded");
    });
    expect(result.current.isConnected).toBe(true);

    act(() => {
      mockConnection._emit("disconnected");
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBe("Connection lost. Reconnecting...");
  });

  it("clears error when connection is restored", () => {
    const { result } = renderHook(() => useLiveCommits("owner/repo"));

    act(() => {
      mockConnection._emit("error");
    });
    expect(result.current.error).toBe("Connection lost. Reconnecting...");

    act(() => {
      mockConnection._emit("connected");
    });
    expect(result.current.isConnected).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("unsubscribes from Pusher on unmount", () => {
    const { unmount } = renderHook(() => useLiveCommits("owner/repo"));

    unmount();

    expect(mockChannel.unbind_all).toHaveBeenCalled();
    expect(mockUnsubscribe).toHaveBeenCalledWith("repo-owner-repo");
  });

  it("unsubscribes old channel and subscribes new one when repo changes", () => {
    const oldChannel = mockChannel;
    const { rerender } = renderHook(
      (props: { repo: string }) => useLiveCommits(props.repo),
      { initialProps: { repo: "owner/repo1" } },
    );

    expect(mockSubscribe).toHaveBeenCalledWith("repo-owner-repo1");

    // Create a new channel for the new repo
    const newChannel = createMockChannel();
    mockSubscribe.mockReturnValue(newChannel);

    rerender({ repo: "owner/repo2" });

    expect(oldChannel.unbind_all).toHaveBeenCalled();
    expect(mockUnsubscribe).toHaveBeenCalledWith("repo-owner-repo1");
    expect(mockSubscribe).toHaveBeenCalledWith("repo-owner-repo2");
  });

  it("cleans up when repo changes to null", () => {
    const { result, rerender } = renderHook(
      (props: { repo: string | null }) => useLiveCommits(props.repo),
      { initialProps: { repo: "owner/repo" as string | null } },
    );

    act(() => {
      mockChannel._emit("pusher:subscription_succeeded");
    });
    expect(result.current.isConnected).toBe(true);

    rerender({ repo: null });

    expect(mockChannel.unbind_all).toHaveBeenCalled();
    expect(mockUnsubscribe).toHaveBeenCalledWith("repo-owner-repo");
    expect(result.current.isConnected).toBe(false);
    expect(result.current.latestCommit).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
