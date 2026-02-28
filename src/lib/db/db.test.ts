import { createClient, type Client } from "@libsql/client";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { initializeSchema } from "./schema";
import type { Commit, UserSettings } from "@/types";

// We test against a real in-memory libsql database instead of mocking.
// Each test gets a fresh database to ensure isolation.

let client: Client;

// Mock getDatabase to return our test client
vi.mock("./index", () => ({
  getDatabase: () => client,
  ensureSchema: () => Promise.resolve(),
  closeDatabase: () => {
    if (client) client.close();
  },
}));

// Import CRUD modules after mock setup
import {
  createRepo,
  getRepoById,
  getRepoByFullName,
  getAllRepos,
  updateRepo,
  deleteRepo,
} from "./repos";
import {
  createCommit,
  createCommits,
  getCommitById,
  getCommitsByRepo,
  getCommitsByAuthor,
  deleteCommitsByRepo,
} from "./commits";
import { getSettings, saveSettings, deleteSettings } from "./settings";

function makeCommit(overrides: Partial<Commit> = {}): Commit {
  return {
    id: "abc123",
    repoId: "repo-1",
    timestamp: "2025-03-10T10:00:00Z",
    author: "alice",
    message: "feat: add login page",
    stats: { additions: 50, deletions: 10, filesChanged: 3 },
    primaryLanguage: "TypeScript",
    languages: { TypeScript: 120, CSS: 30 },
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

beforeEach(async () => {
  client = createClient({ url: ":memory:" });
  await initializeSchema(client);
});

afterEach(() => {
  client.close();
});

// --- Schema Tests ---

describe("schema", () => {
  it("creates repos table", async () => {
    const result = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='repos'",
    );
    expect(result.rows).toHaveLength(1);
  });

  it("creates commits table", async () => {
    const result = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='commits'",
    );
    expect(result.rows).toHaveLength(1);
  });

  it("creates user_settings table", async () => {
    const result = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='user_settings'",
    );
    expect(result.rows).toHaveLength(1);
  });

  it("creates idx_commits_repo_time index", async () => {
    const result = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_commits_repo_time'",
    );
    expect(result.rows).toHaveLength(1);
  });

  it("creates idx_commits_author index", async () => {
    const result = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_commits_author'",
    );
    expect(result.rows).toHaveLength(1);
  });

  it("is idempotent — running initializeSchema twice does not error", async () => {
    await expect(initializeSchema(client)).resolves.not.toThrow();
  });
});

// --- Repos CRUD Tests ---

describe("repos", () => {
  it("creates a repo", async () => {
    const repo = await createRepo({
      id: "repo-1",
      fullName: "alice/my-project",
      description: "A test project",
      language: "TypeScript",
    });
    expect(repo.id).toBe("repo-1");
    expect(repo.full_name).toBe("alice/my-project");
    expect(repo.description).toBe("A test project");
    expect(repo.default_branch).toBe("main");
    expect(repo.language).toBe("TypeScript");
    expect(repo.webhook_id).toBeNull();
  });

  it("gets repo by ID", async () => {
    await createRepo({ id: "repo-1", fullName: "alice/my-project" });
    const repo = await getRepoById("repo-1");
    expect(repo).toBeDefined();
    expect(repo!.full_name).toBe("alice/my-project");
  });

  it("returns undefined for nonexistent repo", async () => {
    expect(await getRepoById("nonexistent")).toBeUndefined();
  });

  it("gets repo by full name", async () => {
    await createRepo({ id: "repo-1", fullName: "alice/my-project" });
    const repo = await getRepoByFullName("alice/my-project");
    expect(repo).toBeDefined();
    expect(repo!.id).toBe("repo-1");
  });

  it("gets all repos", async () => {
    await createRepo({ id: "repo-1", fullName: "alice/project-a" });
    await createRepo({ id: "repo-2", fullName: "alice/project-b" });
    const repos = await getAllRepos();
    expect(repos).toHaveLength(2);
  });

  it("updates a repo", async () => {
    await createRepo({ id: "repo-1", fullName: "alice/my-project" });
    const updated = await updateRepo("repo-1", {
      description: "Updated desc",
      webhookId: "wh-123",
      lastFetchedAt: "2025-03-10T12:00:00Z",
    });
    expect(updated!.description).toBe("Updated desc");
    expect(updated!.webhook_id).toBe("wh-123");
    expect(updated!.last_fetched_at).toBe("2025-03-10T12:00:00Z");
  });

  it("update with no fields returns existing repo", async () => {
    await createRepo({ id: "repo-1", fullName: "alice/my-project" });
    const repo = await updateRepo("repo-1", {});
    expect(repo!.id).toBe("repo-1");
  });

  it("deletes a repo", async () => {
    await createRepo({ id: "repo-1", fullName: "alice/my-project" });
    expect(await deleteRepo("repo-1")).toBe(true);
    expect(await getRepoById("repo-1")).toBeUndefined();
  });

  it("delete returns false for nonexistent repo", async () => {
    expect(await deleteRepo("nonexistent")).toBe(false);
  });

  it("enforces unique full_name", async () => {
    await createRepo({ id: "repo-1", fullName: "alice/my-project" });
    await expect(
      createRepo({ id: "repo-2", fullName: "alice/my-project" }),
    ).rejects.toThrow();
  });
});

// --- Commits CRUD Tests ---

describe("commits", () => {
  beforeEach(async () => {
    await createRepo({ id: "repo-1", fullName: "alice/my-project" });
  });

  it("creates a commit", async () => {
    const commit = makeCommit();
    const result = await createCommit(commit);
    expect(result.id).toBe("abc123");
  });

  it("gets commit by ID", async () => {
    await createCommit(makeCommit());
    const commit = await getCommitById("abc123");
    expect(commit).toBeDefined();
    expect(commit!.author).toBe("alice");
    expect(commit!.stats.additions).toBe(50);
    expect(commit!.languages).toEqual({ TypeScript: 120, CSS: 30 });
    expect(commit!.musicalParams.instrument).toBe("FMSynth");
  });

  it("returns undefined for nonexistent commit", async () => {
    expect(await getCommitById("nonexistent")).toBeUndefined();
  });

  it("creates multiple commits in a batch", async () => {
    const commits = [
      makeCommit({ id: "c1", timestamp: "2025-03-10T10:00:00Z" }),
      makeCommit({ id: "c2", timestamp: "2025-03-10T11:00:00Z" }),
      makeCommit({ id: "c3", timestamp: "2025-03-10T12:00:00Z" }),
    ];
    await createCommits(commits);
    const { total } = await getCommitsByRepo("repo-1");
    expect(total).toBe(3);
  });

  it("gets commits by repo with pagination", async () => {
    const commits = Array.from({ length: 5 }, (_, i) =>
      makeCommit({
        id: `c${i}`,
        timestamp: `2025-03-10T1${i}:00:00Z`,
      }),
    );
    await createCommits(commits);

    const page1 = await getCommitsByRepo("repo-1", { page: 1, limit: 2 });
    expect(page1.commits).toHaveLength(2);
    expect(page1.total).toBe(5);

    const page2 = await getCommitsByRepo("repo-1", { page: 2, limit: 2 });
    expect(page2.commits).toHaveLength(2);

    const page3 = await getCommitsByRepo("repo-1", { page: 3, limit: 2 });
    expect(page3.commits).toHaveLength(1);
  });

  it("filters commits by date range", async () => {
    await createCommits([
      makeCommit({ id: "c1", timestamp: "2025-03-09T10:00:00Z" }),
      makeCommit({ id: "c2", timestamp: "2025-03-10T10:00:00Z" }),
      makeCommit({ id: "c3", timestamp: "2025-03-11T10:00:00Z" }),
    ]);

    const { commits, total } = await getCommitsByRepo("repo-1", {
      from: "2025-03-10T00:00:00Z",
      to: "2025-03-10T23:59:59Z",
    });
    expect(commits).toHaveLength(1);
    expect(total).toBe(1);
    expect(commits[0].id).toBe("c2");
  });

  it("gets commits by author", async () => {
    await createCommits([
      makeCommit({ id: "c1", author: "alice" }),
      makeCommit({ id: "c2", author: "bob" }),
      makeCommit({ id: "c3", author: "alice" }),
    ]);

    const aliceCommits = await getCommitsByAuthor("alice");
    expect(aliceCommits).toHaveLength(2);
  });

  it("upserts commits (INSERT OR REPLACE)", async () => {
    await createCommit(makeCommit({ id: "c1", message: "original" }));
    await createCommit(makeCommit({ id: "c1", message: "updated" }));

    const commit = await getCommitById("c1");
    expect(commit!.message).toBe("updated");
  });

  it("deletes commits by repo", async () => {
    await createCommits([
      makeCommit({ id: "c1" }),
      makeCommit({ id: "c2" }),
    ]);
    const deleted = await deleteCommitsByRepo("repo-1");
    expect(deleted).toBe(2);
    expect((await getCommitsByRepo("repo-1")).total).toBe(0);
  });

  it("cascades delete when repo is deleted", async () => {
    await createCommit(makeCommit());
    await deleteRepo("repo-1");
    expect(await getCommitById("abc123")).toBeUndefined();
  });

  it("returns commits ordered by timestamp", async () => {
    await createCommits([
      makeCommit({ id: "c2", timestamp: "2025-03-10T12:00:00Z" }),
      makeCommit({ id: "c1", timestamp: "2025-03-10T10:00:00Z" }),
      makeCommit({ id: "c3", timestamp: "2025-03-10T14:00:00Z" }),
    ]);

    const { commits } = await getCommitsByRepo("repo-1");
    expect(commits.map((c) => c.id)).toEqual(["c1", "c2", "c3"]);
  });
});

// --- Settings CRUD Tests ---

describe("settings", () => {
  it("returns defaults for new user", async () => {
    const settings = await getSettings("user-1");
    expect(settings.userId).toBe("user-1");
    expect(settings.defaultTempo).toBe(1.0);
    expect(settings.volume).toBe(0.8);
    expect(settings.theme).toBe("dark");
    expect(settings.instrumentOverrides).toEqual({});
    expect(settings.enabledLanguages).toEqual([]);
    expect(settings.authorMotifs).toEqual([]);
  });

  it("saves and retrieves settings", async () => {
    const input: UserSettings = {
      userId: "user-1",
      defaultTempo: 2.0,
      defaultRepo: "alice/my-project",
      theme: "light",
      instrumentOverrides: { Python: "FMSynth" },
      enabledLanguages: ["TypeScript", "Python"],
      authorMotifs: [
        { login: "alice", rhythmPattern: [1, 0.5], panPosition: -0.3, color: "#ff0000" },
      ],
      volume: 0.6,
    };
    await saveSettings(input);

    const settings = await getSettings("user-1");
    expect(settings.defaultTempo).toBe(2.0);
    expect(settings.defaultRepo).toBe("alice/my-project");
    expect(settings.theme).toBe("light");
    expect(settings.instrumentOverrides).toEqual({ Python: "FMSynth" });
    expect(settings.enabledLanguages).toEqual(["TypeScript", "Python"]);
    expect(settings.authorMotifs).toHaveLength(1);
    expect(settings.authorMotifs[0].login).toBe("alice");
    expect(settings.volume).toBe(0.6);
  });

  it("upserts settings on save", async () => {
    await saveSettings({
      userId: "user-1",
      defaultTempo: 1.0,
      defaultRepo: "",
      theme: "dark",
      instrumentOverrides: {},
      enabledLanguages: [],
      authorMotifs: [],
      volume: 0.8,
    });
    await saveSettings({
      userId: "user-1",
      defaultTempo: 3.0,
      defaultRepo: "bob/repo",
      theme: "light",
      instrumentOverrides: {},
      enabledLanguages: [],
      authorMotifs: [],
      volume: 0.5,
    });

    const settings = await getSettings("user-1");
    expect(settings.defaultTempo).toBe(3.0);
    expect(settings.defaultRepo).toBe("bob/repo");
    expect(settings.volume).toBe(0.5);
  });

  it("deletes settings", async () => {
    await saveSettings({
      userId: "user-1",
      defaultTempo: 1.0,
      defaultRepo: "",
      theme: "dark",
      instrumentOverrides: {},
      enabledLanguages: [],
      authorMotifs: [],
      volume: 0.8,
    });
    expect(await deleteSettings("user-1")).toBe(true);

    // Should return defaults after deletion
    const settings = await getSettings("user-1");
    expect(settings.defaultTempo).toBe(1.0);
  });

  it("delete returns false for nonexistent user", async () => {
    expect(await deleteSettings("nonexistent")).toBe(false);
  });
});
