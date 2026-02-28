import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

vi.mock("@/lib/db/repos", () => ({
  getRepoByFullName: vi.fn(),
}));

vi.mock("@/lib/db/commits", () => ({
  getCommitsByRepo: vi.fn(),
}));

import { getRepoByFullName } from "@/lib/db/repos";
import { getCommitsByRepo } from "@/lib/db/commits";

function makeRequest(params: Record<string, string>): NextRequest {
  const url = new URL("http://localhost/api/share");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

describe("GET /api/share", () => {
  beforeEach(() => {
    vi.mocked(getRepoByFullName).mockResolvedValue(undefined);
    vi.mocked(getCommitsByRepo).mockResolvedValue({ commits: [], total: 0 });
  });

  it("returns 400 when repo is missing", async () => {
    const res = await GET(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when repo format is invalid", async () => {
    const res = await GET(makeRequest({ repo: "invalid" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when repo not in cache", async () => {
    vi.mocked(getRepoByFullName).mockResolvedValue(undefined);

    const res = await GET(makeRequest({ repo: "owner/repo" }));
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain("not available");
  });

  it("returns 404 when no commits in range", async () => {
    vi.mocked(getRepoByFullName).mockResolvedValue({
      id: "owner/repo",
      full_name: "owner/repo",
    } as never);
    vi.mocked(getCommitsByRepo).mockResolvedValue({ commits: [], total: 0 });

    const res = await GET(makeRequest({ repo: "owner/repo" }));
    expect(res.status).toBe(404);
  });

  it("returns commits when repo is cached", async () => {
    const commits = [
      {
        id: "abc",
        repoId: "owner/repo",
        timestamp: "2025-01-01T00:00:00Z",
        author: "dev",
        message: "fix",
        stats: { additions: 10, deletions: 2, filesChanged: 1 },
        primaryLanguage: "TypeScript",
        languages: {},
        ciStatus: "pass",
        musicalParams: {},
      },
    ];
    vi.mocked(getRepoByFullName).mockResolvedValue({
      id: "owner/repo",
      full_name: "owner/repo",
    } as never);
    vi.mocked(getCommitsByRepo).mockResolvedValue({ commits, total: 1 });

    const res = await GET(makeRequest({ repo: "owner/repo", from: "2025-01-01", to: "2025-01-31" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.commits).toHaveLength(1);
    expect(data.total).toBe(1);
    expect(getCommitsByRepo).toHaveBeenCalledWith("owner/repo", expect.objectContaining({
      from: "2025-01-01",
      to: "2025-01-31",
      limit: 500,
      page: 1,
    }));
  });
});
