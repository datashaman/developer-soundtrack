import { describe, it, expect, vi, beforeEach } from "vitest";
import { isCacheStale } from "./cache";

// Mock DB modules
vi.mock("../db/commits", () => ({
  getCommitsByRepo: vi.fn().mockResolvedValue({ commits: [], total: 0 }),
  createCommits: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../db/repos", () => ({
  getRepoByFullName: vi.fn().mockResolvedValue(null),
  createRepo: vi.fn().mockResolvedValue({ id: "owner/repo", full_name: "owner/repo" }),
  updateRepo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./commits", () => ({
  fetchCommits: vi.fn().mockResolvedValue({
    commits: [],
    hasMore: false,
    rateLimitRemaining: 4999,
  }),
}));

import { getCommitsByRepo, createCommits } from "../db/commits";
import { getRepoByFullName, createRepo, updateRepo } from "../db/repos";
import { fetchCommits } from "./commits";
import { getCachedCommits } from "./cache";
import type { Commit } from "@/types";

function makeCommit(overrides: Partial<Commit> = {}): Commit {
  return {
    id: "sha123",
    repoId: "owner/repo",
    timestamp: "2025-03-10T10:00:00Z",
    author: "alice",
    message: "feat: add login",
    stats: { additions: 50, deletions: 10, filesChanged: 3 },
    primaryLanguage: "TypeScript",
    languages: { TypeScript: 120 },
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

const mockOctokit = {} as Parameters<typeof getCachedCommits>[0];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("isCacheStale", () => {
  it("returns true when lastFetchedAt is null", () => {
    expect(isCacheStale(null)).toBe(true);
  });

  it("returns false for recent fetch with no to param", () => {
    const recent = new Date(Date.now() - 60_000).toISOString(); // 1 minute ago
    expect(isCacheStale(recent)).toBe(false);
  });

  it("returns true for old fetch with no to param", () => {
    const old = new Date(Date.now() - 10 * 60_000).toISOString(); // 10 minutes ago
    expect(isCacheStale(old)).toBe(true);
  });

  it("returns false for historical data regardless of fetch time", () => {
    const old = new Date(Date.now() - 10 * 60_000).toISOString(); // 10 min ago fetch
    const historicalTo = new Date(Date.now() - 48 * 60 * 60_000).toISOString(); // 48 hours ago
    expect(isCacheStale(old, historicalTo)).toBe(false);
  });

  it("returns true for recent data range with old fetch", () => {
    const old = new Date(Date.now() - 10 * 60_000).toISOString(); // 10 min ago
    const recentTo = new Date().toISOString(); // now
    expect(isCacheStale(old, recentTo)).toBe(true);
  });

  it("returns false for recent data range with fresh fetch", () => {
    const fresh = new Date(Date.now() - 60_000).toISOString(); // 1 min ago
    const recentTo = new Date().toISOString();
    expect(isCacheStale(fresh, recentTo)).toBe(false);
  });

  it("treats exactly 5 minutes as stale", () => {
    const exactly5min = new Date(Date.now() - 5 * 60_000 - 1).toISOString();
    expect(isCacheStale(exactly5min)).toBe(true);
  });

  it("treats just under 5 minutes as fresh", () => {
    const justUnder5 = new Date(Date.now() - 5 * 60_000 + 1000).toISOString();
    expect(isCacheStale(justUnder5)).toBe(false);
  });
});

describe("getCachedCommits", () => {
  it("returns cached data when cache is fresh", async () => {
    const commits = [makeCommit()];
    vi.mocked(getRepoByFullName).mockResolvedValue({
      id: "owner/repo",
      full_name: "owner/repo",
      description: null,
      default_branch: "main",
      language: "TypeScript",
      webhook_id: null,
      webhook_secret: null,
      last_fetched_at: new Date(Date.now() - 60_000).toISOString(), // 1 min ago
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    });
    vi.mocked(getCommitsByRepo).mockResolvedValue({ commits, total: 1 });

    const result = await getCachedCommits(mockOctokit, {
      repo: "owner/repo",
    });

    expect(result.fromCache).toBe(true);
    expect(result.commits).toEqual(commits);
    expect(result.total).toBe(1);
    expect(fetchCommits).not.toHaveBeenCalled();
  });

  it("fetches from GitHub when no repo in DB", async () => {
    vi.mocked(getRepoByFullName).mockResolvedValue(undefined);
    const commits = [makeCommit()];
    vi.mocked(fetchCommits).mockResolvedValue({
      commits,
      hasMore: false,
      rateLimitRemaining: 4999,
    });
    vi.mocked(getCommitsByRepo).mockResolvedValue({ commits, total: 1 });

    const result = await getCachedCommits(mockOctokit, {
      repo: "owner/repo",
    });

    expect(result.fromCache).toBe(false);
    expect(fetchCommits).toHaveBeenCalledWith(mockOctokit, expect.objectContaining({
      owner: "owner",
      repo: "repo",
    }));
    expect(createRepo).toHaveBeenCalledWith({ id: "owner/repo", fullName: "owner/repo" });
    expect(createCommits).toHaveBeenCalledWith(commits);
    expect(updateRepo).toHaveBeenCalledWith("owner/repo", {
      lastFetchedAt: expect.any(String),
    });
  });

  it("fetches from GitHub when cache is stale", async () => {
    vi.mocked(getRepoByFullName).mockResolvedValue({
      id: "owner/repo",
      full_name: "owner/repo",
      description: null,
      default_branch: "main",
      language: null,
      webhook_id: null,
      webhook_secret: null,
      last_fetched_at: new Date(Date.now() - 10 * 60_000).toISOString(), // 10 min ago
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    });
    vi.mocked(fetchCommits).mockResolvedValue({
      commits: [makeCommit()],
      hasMore: false,
      rateLimitRemaining: 4999,
    });
    vi.mocked(getCommitsByRepo).mockResolvedValue({
      commits: [makeCommit()],
      total: 1,
    });

    const result = await getCachedCommits(mockOctokit, {
      repo: "owner/repo",
    });

    expect(result.fromCache).toBe(false);
    expect(fetchCommits).toHaveBeenCalled();
    // Should not create repo since it already exists
    expect(createRepo).not.toHaveBeenCalled();
    expect(updateRepo).toHaveBeenCalledWith("owner/repo", {
      lastFetchedAt: expect.any(String),
    });
  });

  it("returns cached data for historical queries even with old fetch time", async () => {
    vi.mocked(getRepoByFullName).mockResolvedValue({
      id: "owner/repo",
      full_name: "owner/repo",
      description: null,
      default_branch: "main",
      language: null,
      webhook_id: null,
      webhook_secret: null,
      last_fetched_at: new Date(Date.now() - 60 * 60_000).toISOString(), // 1 hour ago
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    });
    const commits = [makeCommit()];
    vi.mocked(getCommitsByRepo).mockResolvedValue({ commits, total: 1 });

    const result = await getCachedCommits(mockOctokit, {
      repo: "owner/repo",
      to: new Date(Date.now() - 48 * 60 * 60_000).toISOString(), // 48 hours ago
    });

    expect(result.fromCache).toBe(true);
    expect(fetchCommits).not.toHaveBeenCalled();
  });

  it("paginates GitHub fetch to get all commits", async () => {
    vi.mocked(getRepoByFullName).mockResolvedValue(undefined);
    const page1Commits = Array.from({ length: 100 }, (_, i) =>
      makeCommit({ id: `sha-page1-${i}` }),
    );
    const page2Commits = [makeCommit({ id: "sha-page2-0" })];

    vi.mocked(fetchCommits)
      .mockResolvedValueOnce({
        commits: page1Commits,
        hasMore: true,
        rateLimitRemaining: 4899,
      })
      .mockResolvedValueOnce({
        commits: page2Commits,
        hasMore: false,
        rateLimitRemaining: 4898,
      });
    vi.mocked(getCommitsByRepo).mockResolvedValue({
      commits: page1Commits.slice(0, 10),
      total: 101,
    });

    await getCachedCommits(mockOctokit, { repo: "owner/repo" });

    expect(fetchCommits).toHaveBeenCalledTimes(2);
    // All commits from both pages should be stored
    expect(createCommits).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: "sha-page1-0" }),
        expect.objectContaining({ id: "sha-page2-0" }),
      ]),
    );
  });

  it("passes date range params to GitHub fetch", async () => {
    vi.mocked(getRepoByFullName).mockResolvedValue(undefined);
    vi.mocked(fetchCommits).mockResolvedValue({
      commits: [],
      hasMore: false,
      rateLimitRemaining: 4999,
    });
    vi.mocked(getCommitsByRepo).mockResolvedValue({ commits: [], total: 0 });

    await getCachedCommits(mockOctokit, {
      repo: "owner/repo",
      from: "2025-03-01T00:00:00Z",
      to: "2025-03-10T00:00:00Z",
    });

    expect(fetchCommits).toHaveBeenCalledWith(mockOctokit, expect.objectContaining({
      since: "2025-03-01T00:00:00Z",
      until: "2025-03-10T00:00:00Z",
    }));
  });

  it("does not call createCommits when no commits fetched", async () => {
    vi.mocked(getRepoByFullName).mockResolvedValue(undefined);
    vi.mocked(fetchCommits).mockResolvedValue({
      commits: [],
      hasMore: false,
      rateLimitRemaining: 4999,
    });
    vi.mocked(getCommitsByRepo).mockResolvedValue({ commits: [], total: 0 });

    await getCachedCommits(mockOctokit, { repo: "owner/repo" });

    expect(createCommits).not.toHaveBeenCalled();
  });

  it("computes hasMore correctly based on page and total", async () => {
    vi.mocked(getRepoByFullName).mockResolvedValue({
      id: "owner/repo",
      full_name: "owner/repo",
      description: null,
      default_branch: "main",
      language: null,
      webhook_id: null,
      webhook_secret: null,
      last_fetched_at: new Date(Date.now() - 60_000).toISOString(),
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    });
    vi.mocked(getCommitsByRepo).mockResolvedValue({
      commits: [makeCommit()],
      total: 250,
    });

    // page 1, limit 100: 100 < 250, hasMore = true
    const result1 = await getCachedCommits(mockOctokit, {
      repo: "owner/repo",
      page: 1,
      limit: 100,
    });
    expect(result1.hasMore).toBe(true);

    // page 3, limit 100: 300 >= 250, hasMore = false
    const result2 = await getCachedCommits(mockOctokit, {
      repo: "owner/repo",
      page: 3,
      limit: 100,
    });
    expect(result2.hasMore).toBe(false);
  });

  it("returns correct page number in result", async () => {
    vi.mocked(getRepoByFullName).mockResolvedValue({
      id: "owner/repo",
      full_name: "owner/repo",
      description: null,
      default_branch: "main",
      language: null,
      webhook_id: null,
      webhook_secret: null,
      last_fetched_at: new Date(Date.now() - 60_000).toISOString(),
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    });
    vi.mocked(getCommitsByRepo).mockResolvedValue({
      commits: [],
      total: 50,
    });

    const result = await getCachedCommits(mockOctokit, {
      repo: "owner/repo",
      page: 2,
    });
    expect(result.page).toBe(2);
  });

  it("passes page and limit to DB query on cache hit", async () => {
    vi.mocked(getRepoByFullName).mockResolvedValue({
      id: "owner/repo",
      full_name: "owner/repo",
      description: null,
      default_branch: "main",
      language: null,
      webhook_id: null,
      webhook_secret: null,
      last_fetched_at: new Date(Date.now() - 60_000).toISOString(),
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    });
    vi.mocked(getCommitsByRepo).mockResolvedValue({ commits: [], total: 0 });

    await getCachedCommits(mockOctokit, {
      repo: "owner/repo",
      from: "2025-03-01T00:00:00Z",
      to: "2025-03-10T00:00:00Z",
      page: 2,
      limit: 50,
    });

    expect(getCommitsByRepo).toHaveBeenCalledWith("owner/repo", {
      from: "2025-03-01T00:00:00Z",
      to: "2025-03-10T00:00:00Z",
      page: 2,
      limit: 50,
    });
  });
});
