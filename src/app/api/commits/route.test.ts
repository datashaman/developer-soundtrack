import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { Session } from "next-auth";
import { GET } from "./route";

const mockedAuth = vi.fn<() => Promise<Session | null>>();
vi.mock("@/lib/auth", () => ({
  auth: (...args: unknown[]) => mockedAuth(...(args as [])),
}));

vi.mock("@/lib/github/client", () => ({
  createOctokitClient: vi.fn(),
}));

vi.mock("@/lib/github/cache", () => ({
  getCachedCommits: vi.fn(),
}));

import { createOctokitClient } from "@/lib/github/client";
import { getCachedCommits } from "@/lib/github/cache";

const mockedCreateOctokitClient = vi.mocked(createOctokitClient);
const mockedGetCachedCommits = vi.mocked(getCachedCommits);

function makeRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"));
}

function authedSession(): Session {
  return {
    accessToken: "ghp_test123",
    user: { name: "test" },
    expires: "2099-01-01",
  } as Session;
}

describe("GET /api/commits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockedAuth.mockResolvedValue(null);
    const response = await GET(makeRequest("/api/commits?repo=user/repo"));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when session has no accessToken", async () => {
    mockedAuth.mockResolvedValue({
      user: { name: "test" },
      expires: "2099-01-01",
    } as Session);
    const response = await GET(makeRequest("/api/commits?repo=user/repo"));
    expect(response.status).toBe(401);
  });

  it("returns 400 when repo param is missing", async () => {
    mockedAuth.mockResolvedValue(authedSession());
    const response = await GET(makeRequest("/api/commits"));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Missing required parameter: repo");
  });

  it("returns 400 when repo format is invalid", async () => {
    mockedAuth.mockResolvedValue(authedSession());
    const response = await GET(makeRequest("/api/commits?repo=invalid-repo"));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid repo format. Expected: owner/repo");
  });

  it("returns 400 for invalid page parameter", async () => {
    mockedAuth.mockResolvedValue(authedSession());
    const response = await GET(
      makeRequest("/api/commits?repo=user/repo&page=abc"),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid page parameter");
  });

  it("returns 400 for page < 1", async () => {
    mockedAuth.mockResolvedValue(authedSession());
    const response = await GET(
      makeRequest("/api/commits?repo=user/repo&page=0"),
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid limit parameter", async () => {
    mockedAuth.mockResolvedValue(authedSession());
    const response = await GET(
      makeRequest("/api/commits?repo=user/repo&limit=abc"),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid limit parameter. Must be between 1 and 100");
  });

  it("returns 400 for limit > 100", async () => {
    mockedAuth.mockResolvedValue(authedSession());
    const response = await GET(
      makeRequest("/api/commits?repo=user/repo&limit=200"),
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 for limit < 1", async () => {
    mockedAuth.mockResolvedValue(authedSession());
    const response = await GET(
      makeRequest("/api/commits?repo=user/repo&limit=0"),
    );
    expect(response.status).toBe(400);
  });

  it("returns commits with default pagination", async () => {
    mockedAuth.mockResolvedValue(authedSession());
    mockedCreateOctokitClient.mockReturnValue("octokit-instance" as never);

    const mockResult = {
      commits: [
        {
          id: "abc123",
          repoId: "user/repo",
          timestamp: "2025-03-15T10:00:00Z",
          author: "alice",
          message: "Initial commit",
          stats: { additions: 100, deletions: 0, filesChanged: 5 },
          primaryLanguage: "TypeScript",
          languages: { TypeScript: 80, JavaScript: 20 },
          ciStatus: "pass" as const,
          musicalParams: {
            instrument: "FMSynth",
            note: "E4",
            duration: 0.82,
            velocity: 0.5,
            octave: 4,
            scale: "major" as const,
            pan: 0,
            effects: { reverb: 0.2, delay: 0 },
          },
        },
      ],
      total: 1,
      page: 1,
      hasMore: false,
      fromCache: true,
      rateLimitRemaining: null,
    };
    mockedGetCachedCommits.mockResolvedValue(mockResult);

    const response = await GET(makeRequest("/api/commits?repo=user/repo"));
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.commits).toEqual(mockResult.commits);
    expect(body.total).toBe(1);
    expect(body.page).toBe(1);
    expect(body.hasMore).toBe(false);
    // fromCache should not be exposed in API response
    expect(body.fromCache).toBeUndefined();
  });

  it("passes all query params to getCachedCommits", async () => {
    mockedAuth.mockResolvedValue(authedSession());
    mockedCreateOctokitClient.mockReturnValue("octokit-instance" as never);
    mockedGetCachedCommits.mockResolvedValue({
      commits: [],
      total: 0,
      page: 2,
      hasMore: false,
      fromCache: false,
      rateLimitRemaining: null,
    });

    await GET(
      makeRequest(
        "/api/commits?repo=owner/project&from=2025-03-01T00:00:00Z&to=2025-03-15T00:00:00Z&page=2&limit=50",
      ),
    );

    expect(mockedGetCachedCommits).toHaveBeenCalledWith("octokit-instance", {
      repo: "owner/project",
      from: "2025-03-01T00:00:00Z",
      to: "2025-03-15T00:00:00Z",
      page: 2,
      limit: 50,
    });
  });

  it("creates octokit client with session access token", async () => {
    mockedAuth.mockResolvedValue(authedSession());
    mockedCreateOctokitClient.mockReturnValue("octokit-instance" as never);
    mockedGetCachedCommits.mockResolvedValue({
      commits: [],
      total: 0,
      page: 1,
      hasMore: false,
      fromCache: false,
      rateLimitRemaining: null,
    });

    await GET(makeRequest("/api/commits?repo=user/repo"));
    expect(mockedCreateOctokitClient).toHaveBeenCalledWith("ghp_test123");
  });

  it("returns empty commits array when no commits found", async () => {
    mockedAuth.mockResolvedValue(authedSession());
    mockedCreateOctokitClient.mockReturnValue("octokit-instance" as never);
    mockedGetCachedCommits.mockResolvedValue({
      commits: [],
      total: 0,
      page: 1,
      hasMore: false,
      fromCache: false,
      rateLimitRemaining: null,
    });

    const response = await GET(makeRequest("/api/commits?repo=user/repo"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.commits).toEqual([]);
    expect(body.total).toBe(0);
    expect(body.hasMore).toBe(false);
  });

  it("returns hasMore true when more commits exist", async () => {
    mockedAuth.mockResolvedValue(authedSession());
    mockedCreateOctokitClient.mockReturnValue("octokit-instance" as never);
    mockedGetCachedCommits.mockResolvedValue({
      commits: [{ id: "abc" }] as never,
      total: 200,
      page: 1,
      hasMore: true,
      fromCache: true,
      rateLimitRemaining: null,
    });

    const response = await GET(makeRequest("/api/commits?repo=user/repo"));
    const body = await response.json();
    expect(body.hasMore).toBe(true);
    expect(body.total).toBe(200);
  });

  it("handles errors from getCachedCommits gracefully", async () => {
    mockedAuth.mockResolvedValue(authedSession());
    mockedCreateOctokitClient.mockReturnValue("octokit-instance" as never);

    const error = new Error("API rate limit exceeded");
    (error as unknown as { status: number }).status = 403;
    mockedGetCachedCommits.mockRejectedValue(error);

    const response = await GET(makeRequest("/api/commits?repo=user/repo"));
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("API rate limit exceeded");
  });

  it("returns 500 for unknown errors", async () => {
    mockedAuth.mockResolvedValue(authedSession());
    mockedCreateOctokitClient.mockReturnValue("octokit-instance" as never);
    mockedGetCachedCommits.mockRejectedValue("string error");

    const response = await GET(makeRequest("/api/commits?repo=user/repo"));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Failed to fetch commits");
  });

  it("uses default values when optional params are omitted", async () => {
    mockedAuth.mockResolvedValue(authedSession());
    mockedCreateOctokitClient.mockReturnValue("octokit-instance" as never);
    mockedGetCachedCommits.mockResolvedValue({
      commits: [],
      total: 0,
      page: 1,
      hasMore: false,
      fromCache: false,
      rateLimitRemaining: null,
    });

    await GET(makeRequest("/api/commits?repo=user/repo"));

    expect(mockedGetCachedCommits).toHaveBeenCalledWith("octokit-instance", {
      repo: "user/repo",
      from: undefined,
      to: undefined,
      page: 1,
      limit: 100,
    });
  });
});
