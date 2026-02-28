import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createHmac } from "crypto";
import { POST } from "./route";

const mockedGetRepoByFullName = vi.fn();
vi.mock("@/lib/db/repos", () => ({
  getRepoByFullName: (...args: unknown[]) => mockedGetRepoByFullName(...args),
}));

const mockedCreateCommits = vi.fn();
vi.mock("@/lib/db/commits", () => ({
  createCommits: (...args: unknown[]) => mockedCreateCommits(...args),
}));

const mockedTrigger = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/pusher/server", () => ({
  getPusher: () => ({ trigger: mockedTrigger }),
}));

const WEBHOOK_SECRET = "test-secret-abc123";

function sign(payload: string, secret: string = WEBHOOK_SECRET): string {
  return (
    "sha256=" + createHmac("sha256", secret).update(payload).digest("hex")
  );
}

function makePushPayload(overrides: Record<string, unknown> = {}) {
  return {
    ref: "refs/heads/main",
    repository: {
      id: 12345,
      full_name: "octocat/hello-world",
    },
    commits: [
      {
        id: "abc123def456",
        message: "Add new feature",
        timestamp: "2025-03-15T10:30:00Z",
        author: {
          name: "Octocat",
          username: "octocat",
        },
        added: ["src/feature.ts", "src/feature.test.ts"],
        removed: [],
        modified: ["src/index.ts"],
      },
    ],
    ...overrides,
  };
}

function makeWebhookRequest(
  body: string,
  headers: Record<string, string> = {},
): NextRequest {
  return new NextRequest(new URL("/api/webhook", "http://localhost:3000"), {
    method: "POST",
    body,
    headers: {
      "content-type": "application/json",
      "x-github-event": "push",
      "x-hub-signature-256": sign(body),
      ...headers,
    },
  });
}

function repoWithWebhook() {
  return {
    id: "12345",
    full_name: "octocat/hello-world",
    webhook_id: "999",
    webhook_secret: WEBHOOK_SECRET,
  };
}

describe("POST /api/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetRepoByFullName.mockResolvedValue(repoWithWebhook());
    mockedCreateCommits.mockResolvedValue(undefined);
  });

  it("returns 400 for empty request body", async () => {
    const req = new NextRequest(
      new URL("/api/webhook", "http://localhost:3000"),
      {
        method: "POST",
        body: "",
        headers: { "content-type": "application/json" },
      },
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/empty|invalid/i);
  });

  it("returns 400 for invalid JSON", async () => {
    const req = new NextRequest(
      new URL("/api/webhook", "http://localhost:3000"),
      {
        method: "POST",
        body: "not valid json {{{",
        headers: {
          "content-type": "application/json",
          "x-github-event": "push",
          "x-hub-signature-256": "sha256=invalid",
        },
      },
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid json/i);
  });

  it("returns 400 for malformed payload (missing repository)", async () => {
    const payload = JSON.stringify({ commits: [] });
    const req = makeWebhookRequest(payload);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/malformed|repository/i);
  });

  it("returns 401 when repo has no webhook registered", async () => {
    mockedGetRepoByFullName.mockResolvedValue(undefined);
    const payload = JSON.stringify(makePushPayload());
    const req = makeWebhookRequest(payload);
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/no webhook/i);
  });

  it("returns 401 when repo has no webhook secret", async () => {
    mockedGetRepoByFullName.mockResolvedValue({
      id: "12345",
      full_name: "octocat/hello-world",
      webhook_id: "999",
      webhook_secret: null,
    });
    const payload = JSON.stringify(makePushPayload());
    const req = makeWebhookRequest(payload);
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 when X-Hub-Signature-256 header is missing", async () => {
    const payload = JSON.stringify(makePushPayload());
    const req = new NextRequest(
      new URL("/api/webhook", "http://localhost:3000"),
      {
        method: "POST",
        body: payload,
        headers: {
          "content-type": "application/json",
          "x-github-event": "push",
        },
      },
    );
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/missing.*signature/i);
  });

  it("returns 401 when signature is invalid", async () => {
    const payload = JSON.stringify(makePushPayload());
    const req = makeWebhookRequest(payload, {
      "x-hub-signature-256": "sha256=invalid_signature_here",
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/invalid signature/i);
  });

  it("returns 401 when signed with wrong secret", async () => {
    const payload = JSON.stringify(makePushPayload());
    const req = makeWebhookRequest(payload, {
      "x-hub-signature-256": sign(payload, "wrong-secret"),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("responds to ping events", async () => {
    const payload = JSON.stringify(makePushPayload());
    const req = makeWebhookRequest(payload, {
      "x-github-event": "ping",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe("pong");
  });

  it("ignores non-push, non-ping events", async () => {
    const payload = JSON.stringify(makePushPayload());
    const req = makeWebhookRequest(payload, {
      "x-github-event": "check_run",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toMatch(/ignored/i);
  });

  it("processes push events with commits", async () => {
    const payload = JSON.stringify(makePushPayload());
    const req = makeWebhookRequest(payload);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.processed).toBe(1);
    expect(mockedCreateCommits).toHaveBeenCalledTimes(1);
  });

  it("stores commits with correct fields", async () => {
    const payload = JSON.stringify(makePushPayload());
    const req = makeWebhookRequest(payload);
    await POST(req);

    const storedCommits = mockedCreateCommits.mock.calls[0][0];
    expect(storedCommits).toHaveLength(1);
    const commit = storedCommits[0];
    expect(commit.id).toBe("abc123def456");
    expect(commit.repoId).toBe("octocat/hello-world");
    expect(commit.author).toBe("octocat");
    expect(commit.message).toBe("Add new feature");
    expect(commit.timestamp).toBe("2025-03-15T10:30:00Z");
    expect(commit.primaryLanguage).toBe("TypeScript");
    expect(commit.ciStatus).toBe("unknown");
  });

  it("computes musical params for commits", async () => {
    const payload = JSON.stringify(makePushPayload());
    const req = makeWebhookRequest(payload);
    await POST(req);

    const storedCommits = mockedCreateCommits.mock.calls[0][0];
    const commit = storedCommits[0];
    expect(commit.musicalParams).toBeDefined();
    expect(commit.musicalParams.instrument).toBeTruthy();
    expect(commit.musicalParams.note).toBeTruthy();
    expect(commit.musicalParams.duration).toBeGreaterThan(0);
    expect(commit.musicalParams.velocity).toBeGreaterThan(0);
  });

  it("computes language counts from file lists", async () => {
    const payload = JSON.stringify(makePushPayload());
    const req = makeWebhookRequest(payload);
    await POST(req);

    const storedCommits = mockedCreateCommits.mock.calls[0][0];
    const commit = storedCommits[0];
    expect(commit.languages).toHaveProperty("TypeScript");
    expect(commit.stats.filesChanged).toBe(3);
    expect(commit.stats.additions).toBe(3); // 2 added + 1 modified
    expect(commit.stats.deletions).toBe(0);
  });

  it("handles push with no commits", async () => {
    const payload = JSON.stringify(makePushPayload({ commits: [] }));
    const req = makeWebhookRequest(payload);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.processed).toBe(0);
    expect(mockedCreateCommits).not.toHaveBeenCalled();
  });

  it("handles multiple commits in a single push", async () => {
    const pushPayload = makePushPayload({
      commits: [
        {
          id: "commit1",
          message: "First commit",
          timestamp: "2025-03-15T10:00:00Z",
          author: { name: "Alice", username: "alice" },
          added: ["src/app.py"],
          removed: [],
          modified: [],
        },
        {
          id: "commit2",
          message: "Second commit",
          timestamp: "2025-03-15T10:05:00Z",
          author: { name: "Bob", username: "bob" },
          added: [],
          removed: ["old.rs"],
          modified: ["lib.rs"],
        },
      ],
    });
    const payload = JSON.stringify(pushPayload);
    const req = makeWebhookRequest(payload);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.processed).toBe(2);

    const storedCommits = mockedCreateCommits.mock.calls[0][0];
    expect(storedCommits).toHaveLength(2);
    expect(storedCommits[0].primaryLanguage).toBe("Python");
    expect(storedCommits[1].primaryLanguage).toBe("Rust");
  });

  it("falls back to author name when username is missing", async () => {
    const pushPayload = makePushPayload({
      commits: [
        {
          id: "commit-no-username",
          message: "External commit",
          timestamp: "2025-03-15T10:00:00Z",
          author: { name: "External User" },
          added: ["README.md"],
          removed: [],
          modified: [],
        },
      ],
    });
    const payload = JSON.stringify(pushPayload);
    const req = makeWebhookRequest(payload);
    await POST(req);

    const storedCommits = mockedCreateCommits.mock.calls[0][0];
    expect(storedCommits[0].author).toBe("External User");
  });

  it("looks up repo by full_name from payload", async () => {
    const payload = JSON.stringify(makePushPayload());
    const req = makeWebhookRequest(payload);
    await POST(req);
    expect(mockedGetRepoByFullName).toHaveBeenCalledWith(
      "octocat/hello-world",
    );
  });

  it("triggers Pusher with correct channel and commits", async () => {
    const payload = JSON.stringify(makePushPayload());
    const req = makeWebhookRequest(payload);
    await POST(req);

    expect(mockedTrigger).toHaveBeenCalledTimes(1);
    expect(mockedTrigger).toHaveBeenCalledWith(
      "repo-octocat-hello-world",
      "commits",
      expect.arrayContaining([
        expect.objectContaining({ id: "abc123def456" }),
      ]),
    );
  });

  it("does not trigger Pusher when there are no commits", async () => {
    const payload = JSON.stringify(makePushPayload({ commits: [] }));
    const req = makeWebhookRequest(payload);
    await POST(req);
    expect(mockedTrigger).not.toHaveBeenCalled();
  });
});
