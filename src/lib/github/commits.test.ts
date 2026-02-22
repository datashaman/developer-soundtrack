import { describe, it, expect, vi } from "vitest";
import { fetchCommits, type FetchCommitsOptions } from "./commits";

vi.mock("./ci-status", () => ({
  fetchCIStatus: vi.fn().mockResolvedValue("unknown"),
}));

function createMockOctokit(options?: {
  listCommitsData?: Array<{
    sha: string;
    commit: {
      author: { date: string; name: string };
      message: string;
    };
    author: { login: string } | null;
  }>;
  getCommitData?: {
    stats: { additions: number; deletions: number; total: number };
    files: Array<{
      filename: string;
      additions: number;
      deletions: number;
      changes: number;
    }>;
  };
  rateLimitRemaining?: string;
}) {
  const listCommits = vi.fn().mockResolvedValue({
    data: options?.listCommitsData ?? [],
    headers: {
      "x-ratelimit-remaining": options?.rateLimitRemaining ?? "4999",
    },
  });

  const getCommit = vi.fn().mockResolvedValue({
    data: options?.getCommitData ?? {
      stats: { additions: 10, deletions: 5, total: 15 },
      files: [{ filename: "src/index.ts", additions: 10, deletions: 5, changes: 15 }],
    },
  });

  return {
    rest: {
      repos: {
        listCommits,
        getCommit,
      },
    },
    _mocks: { listCommits, getCommit },
  };
}

function makeCommitItem(overrides?: Partial<{
  sha: string;
  date: string;
  login: string;
  name: string;
  message: string;
}>) {
  return {
    sha: overrides?.sha ?? "abc123",
    commit: {
      author: {
        date: overrides?.date ?? "2025-01-15T10:00:00Z",
        name: overrides?.name ?? "Alice",
      },
      message: overrides?.message ?? "feat: add feature",
    },
    author: overrides?.login !== undefined
      ? (overrides.login === null ? null : { login: overrides.login })
      : { login: "alice" },
  };
}

describe("fetchCommits", () => {
  const baseOptions: FetchCommitsOptions = {
    owner: "testowner",
    repo: "testrepo",
  };

  it("calls listCommits with correct parameters", async () => {
    const mock = createMockOctokit({ listCommitsData: [] });
    await fetchCommits(mock as unknown as Parameters<typeof fetchCommits>[0], {
      ...baseOptions,
      since: "2025-01-01T00:00:00Z",
      until: "2025-01-31T23:59:59Z",
      page: 2,
      perPage: 50,
    });

    expect(mock._mocks.listCommits).toHaveBeenCalledWith({
      owner: "testowner",
      repo: "testrepo",
      since: "2025-01-01T00:00:00Z",
      until: "2025-01-31T23:59:59Z",
      page: 2,
      per_page: 50,
    });
  });

  it("uses default page and perPage values", async () => {
    const mock = createMockOctokit({ listCommitsData: [] });
    await fetchCommits(mock as unknown as Parameters<typeof fetchCommits>[0], baseOptions);

    expect(mock._mocks.listCommits).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        per_page: 100,
      }),
    );
  });

  it("fetches commit details for each commit", async () => {
    const mock = createMockOctokit({
      listCommitsData: [
        makeCommitItem({ sha: "sha1" }),
        makeCommitItem({ sha: "sha2" }),
      ],
    });

    await fetchCommits(mock as unknown as Parameters<typeof fetchCommits>[0], baseOptions);

    expect(mock._mocks.getCommit).toHaveBeenCalledTimes(2);
    expect(mock._mocks.getCommit).toHaveBeenCalledWith({
      owner: "testowner",
      repo: "testrepo",
      ref: "sha1",
    });
    expect(mock._mocks.getCommit).toHaveBeenCalledWith({
      owner: "testowner",
      repo: "testrepo",
      ref: "sha2",
    });
  });

  it("processes a commit with correct fields", async () => {
    const mock = createMockOctokit({
      listCommitsData: [
        makeCommitItem({
          sha: "abc123",
          date: "2025-01-15T10:00:00Z",
          login: "alice",
          message: "feat: add login page",
        }),
      ],
      getCommitData: {
        stats: { additions: 50, deletions: 10, total: 60 },
        files: [
          { filename: "src/app/login.tsx", additions: 40, deletions: 5, changes: 45 },
          { filename: "src/styles/login.css", additions: 10, deletions: 5, changes: 15 },
        ],
      },
    });

    const result = await fetchCommits(
      mock as unknown as Parameters<typeof fetchCommits>[0],
      baseOptions,
    );

    expect(result.commits).toHaveLength(1);
    const commit = result.commits[0];

    expect(commit.id).toBe("abc123");
    expect(commit.repoId).toBe("testowner/testrepo");
    expect(commit.timestamp).toBe("2025-01-15T10:00:00Z");
    expect(commit.author).toBe("alice");
    expect(commit.message).toBe("feat: add login page");
    expect(commit.stats).toEqual({
      additions: 50,
      deletions: 10,
      filesChanged: 2,
    });
    expect(commit.primaryLanguage).toBe("TypeScript");
    expect(commit.languages).toEqual({
      TypeScript: 45,
      CSS: 15,
    });
    expect(commit.ciStatus).toBe("unknown");
  });

  it("computes musical parameters for each commit", async () => {
    const mock = createMockOctokit({
      listCommitsData: [makeCommitItem()],
      getCommitData: {
        stats: { additions: 50, deletions: 10, total: 60 },
        files: [
          { filename: "src/main.ts", additions: 50, deletions: 10, changes: 60 },
        ],
      },
    });

    const result = await fetchCommits(
      mock as unknown as Parameters<typeof fetchCommits>[0],
      baseOptions,
    );

    const params = result.commits[0].musicalParams;
    expect(params.instrument).toBeDefined();
    expect(params.note).toBeDefined();
    expect(params.duration).toBeGreaterThan(0);
    expect(params.velocity).toBeGreaterThan(0);
    expect(params.octave).toBeGreaterThanOrEqual(3);
    expect(params.scale).toBeDefined();
    expect(params.effects).toBeDefined();
  });

  it("detects primary language from changed files", async () => {
    const mock = createMockOctokit({
      listCommitsData: [makeCommitItem()],
      getCommitData: {
        stats: { additions: 100, deletions: 0, total: 100 },
        files: [
          { filename: "main.py", additions: 60, deletions: 0, changes: 60 },
          { filename: "util.js", additions: 40, deletions: 0, changes: 40 },
        ],
      },
    });

    const result = await fetchCommits(
      mock as unknown as Parameters<typeof fetchCommits>[0],
      baseOptions,
    );

    expect(result.commits[0].primaryLanguage).toBe("Python");
    expect(result.commits[0].languages).toEqual({
      Python: 60,
      JavaScript: 40,
    });
  });

  it("uses commit.author.name when author.login is null", async () => {
    const mock = createMockOctokit({
      listCommitsData: [
        makeCommitItem({ login: null as unknown as string, name: "Bob Builder" }),
      ],
    });

    const result = await fetchCommits(
      mock as unknown as Parameters<typeof fetchCommits>[0],
      baseOptions,
    );

    expect(result.commits[0].author).toBe("Bob Builder");
  });

  it("returns hasMore=true when response length equals perPage", async () => {
    const items = Array.from({ length: 100 }, (_, i) =>
      makeCommitItem({ sha: `sha${i}` }),
    );

    const mock = createMockOctokit({
      listCommitsData: items,
    });

    const result = await fetchCommits(
      mock as unknown as Parameters<typeof fetchCommits>[0],
      { ...baseOptions, perPage: 100 },
    );

    expect(result.hasMore).toBe(true);
  });

  it("returns hasMore=false when response length is less than perPage", async () => {
    const mock = createMockOctokit({
      listCommitsData: [makeCommitItem()],
    });

    const result = await fetchCommits(
      mock as unknown as Parameters<typeof fetchCommits>[0],
      { ...baseOptions, perPage: 100 },
    );

    expect(result.hasMore).toBe(false);
  });

  it("returns hasMore=false for empty results", async () => {
    const mock = createMockOctokit({ listCommitsData: [] });

    const result = await fetchCommits(
      mock as unknown as Parameters<typeof fetchCommits>[0],
      baseOptions,
    );

    expect(result.commits).toHaveLength(0);
    expect(result.hasMore).toBe(false);
  });

  it("parses rate limit header", async () => {
    const mock = createMockOctokit({
      listCommitsData: [],
      rateLimitRemaining: "4200",
    });

    const result = await fetchCommits(
      mock as unknown as Parameters<typeof fetchCommits>[0],
      baseOptions,
    );

    expect(result.rateLimitRemaining).toBe(4200);
  });

  it("returns null rateLimitRemaining when header is missing", async () => {
    const mock = createMockOctokit({ listCommitsData: [] });
    // Override to remove the header
    mock._mocks.listCommits.mockResolvedValue({
      data: [],
      headers: {},
    });

    const result = await fetchCommits(
      mock as unknown as Parameters<typeof fetchCommits>[0],
      baseOptions,
    );

    expect(result.rateLimitRemaining).toBeNull();
  });

  it("handles commits with no files", async () => {
    const mock = createMockOctokit({
      listCommitsData: [makeCommitItem()],
      getCommitData: {
        stats: { additions: 0, deletions: 0, total: 0 },
        files: [],
      },
    });

    const result = await fetchCommits(
      mock as unknown as Parameters<typeof fetchCommits>[0],
      baseOptions,
    );

    expect(result.commits[0].stats.filesChanged).toBe(0);
    expect(result.commits[0].primaryLanguage).toBe("Other");
    expect(result.commits[0].languages).toEqual({});
  });

  it("handles commits with missing stats", async () => {
    const mock = createMockOctokit({
      listCommitsData: [makeCommitItem()],
    });
    mock._mocks.getCommit.mockResolvedValue({
      data: {
        stats: undefined,
        files: undefined,
      },
    });

    const result = await fetchCommits(
      mock as unknown as Parameters<typeof fetchCommits>[0],
      baseOptions,
    );

    expect(result.commits[0].stats).toEqual({
      additions: 0,
      deletions: 0,
      filesChanged: 0,
    });
  });

  it("processes multiple commits in order", async () => {
    const mock = createMockOctokit({
      listCommitsData: [
        makeCommitItem({ sha: "first", message: "first commit" }),
        makeCommitItem({ sha: "second", message: "second commit" }),
        makeCommitItem({ sha: "third", message: "third commit" }),
      ],
    });

    const result = await fetchCommits(
      mock as unknown as Parameters<typeof fetchCommits>[0],
      baseOptions,
    );

    expect(result.commits).toHaveLength(3);
    expect(result.commits[0].id).toBe("first");
    expect(result.commits[1].id).toBe("second");
    expect(result.commits[2].id).toBe("third");
  });

  it("handles merge commits correctly", async () => {
    const mock = createMockOctokit({
      listCommitsData: [
        makeCommitItem({ message: "Merge pull request #42 from feature-branch" }),
      ],
    });

    const result = await fetchCommits(
      mock as unknown as Parameters<typeof fetchCommits>[0],
      baseOptions,
    );

    expect(result.commits[0].message).toBe(
      "Merge pull request #42 from feature-branch",
    );
    // Merge commits should get delay effect
    expect(result.commits[0].musicalParams.effects.delay).toBe(0.4);
  });

  it("integrates CI status from fetchCIStatus", async () => {
    const { fetchCIStatus } = await import("./ci-status");
    const mockFetchCIStatus = vi.mocked(fetchCIStatus);
    mockFetchCIStatus.mockResolvedValueOnce("pass");

    const mock = createMockOctokit({
      listCommitsData: [makeCommitItem({ sha: "ci-sha" })],
    });

    const result = await fetchCommits(
      mock as unknown as Parameters<typeof fetchCommits>[0],
      baseOptions,
    );

    expect(mockFetchCIStatus).toHaveBeenCalledWith(
      expect.anything(),
      "testowner",
      "testrepo",
      "ci-sha",
    );
    expect(result.commits[0].ciStatus).toBe("pass");
  });
});
