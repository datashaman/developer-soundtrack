import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Session } from "next-auth";
import { NextRequest } from "next/server";
import { GET } from "./route";

const mockedAuth = vi.fn<() => Promise<Session | null>>();
vi.mock("@/lib/auth", () => ({
  auth: (...args: unknown[]) => mockedAuth(...(args as [])),
}));

const mockedSubscribe = vi.fn<(repo: string, cb: (commits: unknown[]) => boolean) => string>();
const mockedUnsubscribe = vi.fn();

vi.mock("@/lib/sse/event-bus", () => ({
  sseEventBus: {
    subscribe: (...args: unknown[]) => mockedSubscribe(...(args as [string, (commits: unknown[]) => boolean])),
    unsubscribe: (...args: unknown[]) => mockedUnsubscribe(...(args as [string, string])),
  },
}));

function makeRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"));
}

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    accessToken: "ghp_test123",
    user: { name: "test" },
    expires: "2099-01-01",
    ...overrides,
  } as Session;
}

describe("GET /api/live", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedSubscribe.mockReturnValue("client-1");
  });

  it("returns 401 when not authenticated", async () => {
    mockedAuth.mockResolvedValue(null);
    const response = await GET(makeRequest("/api/live?repo=owner/repo"));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when session has no accessToken", async () => {
    mockedAuth.mockResolvedValue({
      user: { name: "test" },
      expires: "2099-01-01",
    } as Session);
    const response = await GET(makeRequest("/api/live?repo=owner/repo"));
    expect(response.status).toBe(401);
  });

  it("returns 400 when repo param is missing", async () => {
    mockedAuth.mockResolvedValue(makeSession());
    const response = await GET(makeRequest("/api/live"));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("repo");
  });

  it("returns 400 when repo param is invalid format", async () => {
    mockedAuth.mockResolvedValue(makeSession());
    const response = await GET(makeRequest("/api/live?repo=noslash"));
    expect(response.status).toBe(400);
  });

  it("returns an SSE stream with correct headers", async () => {
    mockedAuth.mockResolvedValue(makeSession());
    const response = await GET(makeRequest("/api/live?repo=owner/repo"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    expect(response.headers.get("Cache-Control")).toBe("no-cache, no-transform");
    expect(response.headers.get("Connection")).toBe("keep-alive");
  });

  it("subscribes to the event bus for the requested repo", async () => {
    mockedAuth.mockResolvedValue(makeSession());
    await GET(makeRequest("/api/live?repo=owner/my-repo"));

    expect(mockedSubscribe).toHaveBeenCalledWith(
      "owner/my-repo",
      expect.any(Function),
    );
  });

  it("sends initial connected event", async () => {
    mockedAuth.mockResolvedValue(makeSession());
    const response = await GET(makeRequest("/api/live?repo=owner/repo"));

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    const { value } = await reader.read();
    const text = decoder.decode(value);

    expect(text).toContain("event: connected");
    expect(text).toContain('"repo":"owner/repo"');

    reader.cancel();
  });

  it("streams commits when event bus callback is invoked", async () => {
    let capturedCallback: ((commits: unknown[]) => boolean) | null = null;
    mockedSubscribe.mockImplementation((_repo, cb) => {
      capturedCallback = cb;
      return "client-1";
    });

    mockedAuth.mockResolvedValue(makeSession());
    const response = await GET(makeRequest("/api/live?repo=owner/repo"));

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    // Read the initial connected event
    await reader.read();

    // Simulate commit broadcast
    const mockCommit = { id: "abc123", message: "test commit" };
    const result = capturedCallback!([mockCommit]);
    expect(result).toBe(true);

    const { value } = await reader.read();
    const text = decoder.decode(value);

    expect(text).toContain("event: commits");
    expect(text).toContain('"id":"abc123"');
    expect(text).toContain('"message":"test commit"');

    reader.cancel();
  });

  it("unsubscribes from event bus when client disconnects via abort", async () => {
    mockedAuth.mockResolvedValue(makeSession());

    const abortController = new AbortController();
    const request = new NextRequest(
      new URL("/api/live?repo=owner/repo", "http://localhost:3000"),
      { signal: abortController.signal },
    );

    await GET(request);

    // Trigger disconnect
    abortController.abort();

    // Allow microtasks to run
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockedUnsubscribe).toHaveBeenCalledWith("owner/repo", "client-1");
  });
});
