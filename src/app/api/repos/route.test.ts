import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Session } from "next-auth";
import { GET } from "./route";

const mockedAuth = vi.fn<() => Promise<Session | null>>();
vi.mock("@/lib/auth", () => ({
  auth: (...args: unknown[]) => mockedAuth(...(args as [])),
}));

vi.mock("@/lib/github/client", () => ({
  createOctokitClient: vi.fn(),
}));

import { createOctokitClient } from "@/lib/github/client";

const mockedCreateOctokitClient = vi.mocked(createOctokitClient);

describe("GET /api/repos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockedAuth.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when session has no accessToken", async () => {
    mockedAuth.mockResolvedValue({
      user: { name: "test" },
      expires: "2099-01-01",
    } as Session);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns repos sorted by most recently pushed", async () => {
    mockedAuth.mockResolvedValue({
      accessToken: "ghp_test123",
      user: { name: "test" },
      expires: "2099-01-01",
    } as Session);

    const mockOctokit = {
      rest: {
        repos: {
          listForAuthenticatedUser: vi.fn().mockResolvedValue({
            data: [
              {
                full_name: "user/repo-a",
                description: "First repo",
                language: "TypeScript",
                pushed_at: "2025-03-15T10:00:00Z",
              },
              {
                full_name: "user/repo-b",
                description: null,
                language: "Python",
                pushed_at: "2025-03-14T08:00:00Z",
              },
            ],
          }),
        },
      },
    };
    mockedCreateOctokitClient.mockReturnValue(mockOctokit as never);

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.repos).toEqual([
      {
        fullName: "user/repo-a",
        description: "First repo",
        language: "TypeScript",
        pushedAt: "2025-03-15T10:00:00Z",
      },
      {
        fullName: "user/repo-b",
        description: null,
        language: "Python",
        pushedAt: "2025-03-14T08:00:00Z",
      },
    ]);

    expect(mockOctokit.rest.repos.listForAuthenticatedUser).toHaveBeenCalledWith({
      visibility: "all",
      sort: "pushed",
      direction: "desc",
      per_page: 100,
    });
  });

  it("creates octokit client with session access token", async () => {
    mockedAuth.mockResolvedValue({
      accessToken: "ghp_mytoken",
      user: { name: "test" },
      expires: "2099-01-01",
    } as Session);

    const mockOctokit = {
      rest: {
        repos: {
          listForAuthenticatedUser: vi.fn().mockResolvedValue({ data: [] }),
        },
      },
    };
    mockedCreateOctokitClient.mockReturnValue(mockOctokit as never);

    await GET();
    expect(mockedCreateOctokitClient).toHaveBeenCalledWith("ghp_mytoken");
  });

  it("returns empty repos array when user has no repos", async () => {
    mockedAuth.mockResolvedValue({
      accessToken: "ghp_test",
      user: { name: "test" },
      expires: "2099-01-01",
    } as Session);

    const mockOctokit = {
      rest: {
        repos: {
          listForAuthenticatedUser: vi.fn().mockResolvedValue({ data: [] }),
        },
      },
    };
    mockedCreateOctokitClient.mockReturnValue(mockOctokit as never);

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.repos).toEqual([]);
  });

  it("handles Octokit errors gracefully", async () => {
    mockedAuth.mockResolvedValue({
      accessToken: "ghp_test",
      user: { name: "test" },
      expires: "2099-01-01",
    } as Session);

    const error = new Error("Bad credentials");
    (error as unknown as { status: number }).status = 401;

    const mockOctokit = {
      rest: {
        repos: {
          listForAuthenticatedUser: vi.fn().mockRejectedValue(error),
        },
      },
    };
    mockedCreateOctokitClient.mockReturnValue(mockOctokit as never);

    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Bad credentials");
  });

  it("returns 500 for unknown errors", async () => {
    mockedAuth.mockResolvedValue({
      accessToken: "ghp_test",
      user: { name: "test" },
      expires: "2099-01-01",
    } as Session);

    const mockOctokit = {
      rest: {
        repos: {
          listForAuthenticatedUser: vi.fn().mockRejectedValue("string error"),
        },
      },
    };
    mockedCreateOctokitClient.mockReturnValue(mockOctokit as never);

    const response = await GET();
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Failed to fetch repositories");
  });
});
