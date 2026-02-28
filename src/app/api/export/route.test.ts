import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

vi.mock("@/lib/db/commits", () => ({
  getCommitsByIds: vi.fn(),
}));

import { getCommitsByIds } from "@/lib/db/commits";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/export", () => {
  beforeEach(() => {
    vi.mocked(getCommitsByIds).mockResolvedValue([]);
  });

  it("returns 400 when commitIds is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("commitIds");
  });

  it("returns 400 when commitIds is not an array", async () => {
    const res = await POST(makeRequest({ commitIds: "abc" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when commitIds is empty", async () => {
    const res = await POST(makeRequest({ commitIds: [] }));
    expect(res.status).toBe(400);
  });

  it("returns commits when given valid commitIds", async () => {
    const commits = [
      {
        id: "abc123",
        repoId: "r1",
        timestamp: "2025-01-01T00:00:00Z",
        author: "dev",
        message: "fix",
        stats: { additions: 10, deletions: 2, filesChanged: 1 },
        primaryLanguage: "TypeScript",
        languages: { TypeScript: 10 },
        ciStatus: "pass",
        musicalParams: {
          instrument: "FMSynth",
          note: "C4",
          duration: 0.5,
          velocity: 0.8,
          octave: 4,
          scale: "major",
          pan: 0,
          effects: { reverb: 0.2, delay: 0 },
        },
      },
    ];
    vi.mocked(getCommitsByIds).mockResolvedValue(commits as never);

    const res = await POST(makeRequest({ commitIds: ["abc123"] }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.commits).toEqual(commits);
    expect(getCommitsByIds).toHaveBeenCalledWith(["abc123"]);
  });
});
