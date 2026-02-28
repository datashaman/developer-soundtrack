// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup, waitFor } from "@testing-library/react";
import type { Commit } from "@/types";
import { useCommits } from "./useCommits";

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

function mockFetchSuccess(data: {
  commits: Commit[];
  total: number;
  page: number;
  hasMore: boolean;
}) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

function mockFetchError(status: number, error: string) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({ error }),
  });
}

describe("useCommits", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
    vi.restoreAllMocks();
    cleanup();
  });

  it("returns initial state with no repo", () => {
    const { result } = renderHook(() =>
      useCommits({ repo: null }),
    );

    expect(result.current.commits).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.hasMore).toBe(false);
    expect(result.current.total).toBeNull();
    expect(typeof result.current.loadMore).toBe("function");
  });

  it("does not fetch when repo is null", () => {
    const fetchMock = mockFetchSuccess({
      commits: [],
      total: 0,
      page: 1,
      hasMore: false,
    });
    globalThis.fetch = fetchMock;

    renderHook(() => useCommits({ repo: null }));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetches commits when repo is provided", async () => {
    const commits = [makeCommit({ id: "a" }), makeCommit({ id: "b" })];
    globalThis.fetch = mockFetchSuccess({
      commits,
      total: 2,
      page: 1,
      hasMore: false,
    });

    const { result } = renderHook(() =>
      useCommits({ repo: "owner/repo" }),
    );

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.commits).toEqual(commits);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.total).toBe(2);
    expect(result.current.error).toBeNull();
  });

  it("passes query params to fetch URL", async () => {
    const fetchMock = mockFetchSuccess({
      commits: [],
      total: 0,
      page: 1,
      hasMore: false,
    });
    globalThis.fetch = fetchMock;

    renderHook(() =>
      useCommits({
        repo: "owner/repo",
        from: "2025-01-01T00:00:00Z",
        to: "2025-03-01T00:00:00Z",
        limit: 50,
      }),
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("repo=owner%2Frepo");
    expect(url).toContain("from=2025-01-01T00%3A00%3A00Z");
    expect(url).toContain("to=2025-03-01T00%3A00%3A00Z");
    expect(url).toContain("limit=50");
    expect(url).toContain("page=1");
  });

  it("does not include from/to params when not provided", async () => {
    const fetchMock = mockFetchSuccess({
      commits: [],
      total: 0,
      page: 1,
      hasMore: false,
    });
    globalThis.fetch = fetchMock;

    renderHook(() => useCommits({ repo: "owner/repo" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).not.toContain("from=");
    expect(url).not.toContain("to=");
  });

  it("handles fetch errors gracefully", async () => {
    globalThis.fetch = mockFetchError(500, "Internal server error");

    const { result } = renderHook(() =>
      useCommits({ repo: "owner/repo" }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Internal server error");
    expect(result.current.commits).toEqual([]);
  });

  it("handles network errors gracefully", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network failure"));

    const { result } = renderHook(() =>
      useCommits({ repo: "owner/repo" }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Network failure");
    expect(result.current.commits).toEqual([]);
  });

  it("handles non-JSON error responses", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.reject(new Error("Invalid JSON")),
    });

    const { result } = renderHook(() =>
      useCommits({ repo: "owner/repo" }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Request failed with status 502");
  });

  it("loadMore appends commits from the next page", async () => {
    const page1Commits = [makeCommit({ id: "a" }), makeCommit({ id: "b" })];
    const page2Commits = [makeCommit({ id: "c" })];

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            commits: page1Commits,
            total: 3,
            page: 1,
            hasMore: true,
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            commits: page2Commits,
            total: 3,
            page: 2,
            hasMore: false,
          }),
      });
    globalThis.fetch = fetchMock;

    const { result } = renderHook(() =>
      useCommits({ repo: "owner/repo" }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.commits).toEqual(page1Commits);
    expect(result.current.hasMore).toBe(true);

    await act(async () => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.commits).toEqual([...page1Commits, ...page2Commits]);
    expect(result.current.hasMore).toBe(false);
  });

  it("loadMore does nothing when hasMore is false", async () => {
    const fetchMock = mockFetchSuccess({
      commits: [makeCommit()],
      total: 1,
      page: 1,
      hasMore: false,
    });
    globalThis.fetch = fetchMock;

    const { result } = renderHook(() =>
      useCommits({ repo: "owner/repo" }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    fetchMock.mockClear();

    act(() => {
      result.current.loadMore();
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("loadMore does nothing while loading", async () => {
    let resolveFirst: (value: unknown) => void;
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
    );
    globalThis.fetch = fetchMock;

    const { result } = renderHook(() =>
      useCommits({ repo: "owner/repo" }),
    );

    // Still loading first page
    expect(result.current.isLoading).toBe(true);

    act(() => {
      result.current.loadMore();
    });

    // Only the initial fetch, no extra call from loadMore
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Clean up: resolve the pending promise
    await act(async () => {
      resolveFirst!({
        ok: true,
        json: () =>
          Promise.resolve({
            commits: [],
            total: 0,
            page: 1,
            hasMore: false,
          }),
      });
    });
  });

  it("refetches when repo changes", async () => {
    const commits1 = [makeCommit({ id: "a" })];
    const commits2 = [makeCommit({ id: "b" })];

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            commits: commits1,
            total: 1,
            page: 1,
            hasMore: false,
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            commits: commits2,
            total: 1,
            page: 1,
            hasMore: false,
          }),
      });
    globalThis.fetch = fetchMock;

    const { result, rerender } = renderHook(
      (props: { repo: string }) => useCommits({ repo: props.repo }),
      { initialProps: { repo: "owner/repo1" } },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.commits).toEqual(commits1);

    rerender({ repo: "owner/repo2" });

    await waitFor(() => {
      expect(result.current.commits).toEqual(commits2);
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("refetches when date range changes", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            commits: [makeCommit({ id: "a" })],
            total: 1,
            page: 1,
            hasMore: false,
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            commits: [makeCommit({ id: "b" })],
            total: 1,
            page: 1,
            hasMore: false,
          }),
      });
    globalThis.fetch = fetchMock;

    const { result, rerender } = renderHook(
      (props: { from?: string }) =>
        useCommits({ repo: "owner/repo", from: props.from }),
      { initialProps: { from: "2025-01-01T00:00:00Z" } },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    rerender({ from: "2025-02-01T00:00:00Z" });

    await waitFor(() => {
      expect(result.current.commits[0].id).toBe("b");
    });
  });

  it("resets commits when repo changes to null", async () => {
    const fetchMock = mockFetchSuccess({
      commits: [makeCommit()],
      total: 1,
      page: 1,
      hasMore: false,
    });
    globalThis.fetch = fetchMock;

    const { result, rerender } = renderHook(
      (props: { repo: string | null }) => useCommits({ repo: props.repo }),
      { initialProps: { repo: "owner/repo" as string | null } },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.commits).toHaveLength(1);

    rerender({ repo: null });

    expect(result.current.commits).toEqual([]);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.total).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("replaces commits (not appends) on param change refetch", async () => {
    const commits1 = [makeCommit({ id: "a" }), makeCommit({ id: "b" })];
    const commits2 = [makeCommit({ id: "c" })];

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            commits: commits1,
            total: 2,
            page: 1,
            hasMore: false,
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            commits: commits2,
            total: 1,
            page: 1,
            hasMore: false,
          }),
      });
    globalThis.fetch = fetchMock;

    const { result, rerender } = renderHook(
      (props: { repo: string }) => useCommits({ repo: props.repo }),
      { initialProps: { repo: "owner/repo1" } },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.commits).toHaveLength(2);

    rerender({ repo: "owner/repo2" });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should be only the new commits, not appended to old ones
    expect(result.current.commits).toEqual(commits2);
    expect(result.current.commits).toHaveLength(1);
  });

  it("uses default limit of 100", async () => {
    const fetchMock = mockFetchSuccess({
      commits: [],
      total: 0,
      page: 1,
      hasMore: false,
    });
    globalThis.fetch = fetchMock;

    renderHook(() => useCommits({ repo: "owner/repo" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("limit=100");
  });
});
