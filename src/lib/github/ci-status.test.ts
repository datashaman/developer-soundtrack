import { describe, it, expect, vi } from "vitest";
import { fetchCIStatus } from "./ci-status";

function createMockOctokit(checkRuns: Array<{
  status: string;
  conclusion: string | null;
}>) {
  const listForRef = vi.fn().mockResolvedValue({
    data: {
      check_runs: checkRuns,
    },
  });

  return {
    rest: {
      checks: {
        listForRef,
      },
    },
    _mocks: { listForRef },
  };
}

describe("fetchCIStatus", () => {
  it("calls listForRef with correct parameters", async () => {
    const mock = createMockOctokit([]);
    await fetchCIStatus(
      mock as unknown as Parameters<typeof fetchCIStatus>[0],
      "owner",
      "repo",
      "abc123",
    );

    expect(mock._mocks.listForRef).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repo",
      ref: "abc123",
    });
  });

  it("returns 'unknown' when there are no check runs", async () => {
    const mock = createMockOctokit([]);
    const status = await fetchCIStatus(
      mock as unknown as Parameters<typeof fetchCIStatus>[0],
      "owner",
      "repo",
      "sha1",
    );
    expect(status).toBe("unknown");
  });

  it("returns 'pass' when all checks succeed", async () => {
    const mock = createMockOctokit([
      { status: "completed", conclusion: "success" },
      { status: "completed", conclusion: "success" },
      { status: "completed", conclusion: "neutral" },
    ]);
    const status = await fetchCIStatus(
      mock as unknown as Parameters<typeof fetchCIStatus>[0],
      "owner",
      "repo",
      "sha1",
    );
    expect(status).toBe("pass");
  });

  it("returns 'fail' when any check has failure conclusion", async () => {
    const mock = createMockOctokit([
      { status: "completed", conclusion: "success" },
      { status: "completed", conclusion: "failure" },
    ]);
    const status = await fetchCIStatus(
      mock as unknown as Parameters<typeof fetchCIStatus>[0],
      "owner",
      "repo",
      "sha1",
    );
    expect(status).toBe("fail");
  });

  it("returns 'fail' when any check has timed_out conclusion", async () => {
    const mock = createMockOctokit([
      { status: "completed", conclusion: "success" },
      { status: "completed", conclusion: "timed_out" },
    ]);
    const status = await fetchCIStatus(
      mock as unknown as Parameters<typeof fetchCIStatus>[0],
      "owner",
      "repo",
      "sha1",
    );
    expect(status).toBe("fail");
  });

  it("returns 'fail' when any check has cancelled conclusion", async () => {
    const mock = createMockOctokit([
      { status: "completed", conclusion: "cancelled" },
      { status: "completed", conclusion: "success" },
    ]);
    const status = await fetchCIStatus(
      mock as unknown as Parameters<typeof fetchCIStatus>[0],
      "owner",
      "repo",
      "sha1",
    );
    expect(status).toBe("fail");
  });

  it("returns 'pending' when checks are in_progress (no failures)", async () => {
    const mock = createMockOctokit([
      { status: "completed", conclusion: "success" },
      { status: "in_progress", conclusion: null },
    ]);
    const status = await fetchCIStatus(
      mock as unknown as Parameters<typeof fetchCIStatus>[0],
      "owner",
      "repo",
      "sha1",
    );
    expect(status).toBe("pending");
  });

  it("returns 'pending' when checks are queued (no failures)", async () => {
    const mock = createMockOctokit([
      { status: "queued", conclusion: null },
    ]);
    const status = await fetchCIStatus(
      mock as unknown as Parameters<typeof fetchCIStatus>[0],
      "owner",
      "repo",
      "sha1",
    );
    expect(status).toBe("pending");
  });

  it("failure takes priority over pending", async () => {
    const mock = createMockOctokit([
      { status: "completed", conclusion: "failure" },
      { status: "in_progress", conclusion: null },
      { status: "completed", conclusion: "success" },
    ]);
    const status = await fetchCIStatus(
      mock as unknown as Parameters<typeof fetchCIStatus>[0],
      "owner",
      "repo",
      "sha1",
    );
    expect(status).toBe("fail");
  });

  it("returns 'pass' when all checks have skipped conclusion", async () => {
    const mock = createMockOctokit([
      { status: "completed", conclusion: "skipped" },
      { status: "completed", conclusion: "success" },
    ]);
    const status = await fetchCIStatus(
      mock as unknown as Parameters<typeof fetchCIStatus>[0],
      "owner",
      "repo",
      "sha1",
    );
    expect(status).toBe("pass");
  });

  it("returns 'pass' for a single successful check", async () => {
    const mock = createMockOctokit([
      { status: "completed", conclusion: "success" },
    ]);
    const status = await fetchCIStatus(
      mock as unknown as Parameters<typeof fetchCIStatus>[0],
      "owner",
      "repo",
      "sha1",
    );
    expect(status).toBe("pass");
  });
});
