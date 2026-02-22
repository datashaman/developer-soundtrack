import Database from "better-sqlite3";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { initializeSchema } from "./schema";
import type { Commit, UserSettings } from "@/types";

// We test against a real in-memory SQLite database instead of mocking.
// Each test gets a fresh database to ensure isolation.

let db: Database.Database;

// Mock getDatabase to return our test database
vi.mock("./index", () => ({
  getDatabase: () => db,
  closeDatabase: () => {
    if (db) db.close();
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

beforeEach(() => {
  db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  initializeSchema(db);
});

afterEach(() => {
  db.close();
});

// --- Schema Tests ---

describe("schema", () => {
  it("creates repos table", () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='repos'")
      .all();
    expect(tables).toHaveLength(1);
  });

  it("creates commits table", () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='commits'")
      .all();
    expect(tables).toHaveLength(1);
  });

  it("creates user_settings table", () => {
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='user_settings'"
      )
      .all();
    expect(tables).toHaveLength(1);
  });

  it("creates idx_commits_repo_time index", () => {
    const indexes = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_commits_repo_time'"
      )
      .all();
    expect(indexes).toHaveLength(1);
  });

  it("creates idx_commits_author index", () => {
    const indexes = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_commits_author'"
      )
      .all();
    expect(indexes).toHaveLength(1);
  });

  it("is idempotent — running initializeSchema twice does not error", () => {
    expect(() => initializeSchema(db)).not.toThrow();
  });
});

// --- Repos CRUD Tests ---

describe("repos", () => {
  it("creates a repo", () => {
    const repo = createRepo({
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

  it("gets repo by ID", () => {
    createRepo({ id: "repo-1", fullName: "alice/my-project" });
    const repo = getRepoById("repo-1");
    expect(repo).toBeDefined();
    expect(repo!.full_name).toBe("alice/my-project");
  });

  it("returns undefined for nonexistent repo", () => {
    expect(getRepoById("nonexistent")).toBeUndefined();
  });

  it("gets repo by full name", () => {
    createRepo({ id: "repo-1", fullName: "alice/my-project" });
    const repo = getRepoByFullName("alice/my-project");
    expect(repo).toBeDefined();
    expect(repo!.id).toBe("repo-1");
  });

  it("gets all repos", () => {
    createRepo({ id: "repo-1", fullName: "alice/project-a" });
    createRepo({ id: "repo-2", fullName: "alice/project-b" });
    const repos = getAllRepos();
    expect(repos).toHaveLength(2);
  });

  it("updates a repo", () => {
    createRepo({ id: "repo-1", fullName: "alice/my-project" });
    const updated = updateRepo("repo-1", {
      description: "Updated desc",
      webhookId: "wh-123",
      lastFetchedAt: "2025-03-10T12:00:00Z",
    });
    expect(updated!.description).toBe("Updated desc");
    expect(updated!.webhook_id).toBe("wh-123");
    expect(updated!.last_fetched_at).toBe("2025-03-10T12:00:00Z");
  });

  it("update with no fields returns existing repo", () => {
    createRepo({ id: "repo-1", fullName: "alice/my-project" });
    const repo = updateRepo("repo-1", {});
    expect(repo!.id).toBe("repo-1");
  });

  it("deletes a repo", () => {
    createRepo({ id: "repo-1", fullName: "alice/my-project" });
    expect(deleteRepo("repo-1")).toBe(true);
    expect(getRepoById("repo-1")).toBeUndefined();
  });

  it("delete returns false for nonexistent repo", () => {
    expect(deleteRepo("nonexistent")).toBe(false);
  });

  it("enforces unique full_name", () => {
    createRepo({ id: "repo-1", fullName: "alice/my-project" });
    expect(() =>
      createRepo({ id: "repo-2", fullName: "alice/my-project" })
    ).toThrow();
  });
});

// --- Commits CRUD Tests ---

describe("commits", () => {
  beforeEach(() => {
    createRepo({ id: "repo-1", fullName: "alice/my-project" });
  });

  it("creates a commit", () => {
    const commit = makeCommit();
    const result = createCommit(commit);
    expect(result.id).toBe("abc123");
  });

  it("gets commit by ID", () => {
    createCommit(makeCommit());
    const commit = getCommitById("abc123");
    expect(commit).toBeDefined();
    expect(commit!.author).toBe("alice");
    expect(commit!.stats.additions).toBe(50);
    expect(commit!.languages).toEqual({ TypeScript: 120, CSS: 30 });
    expect(commit!.musicalParams.instrument).toBe("FMSynth");
  });

  it("returns undefined for nonexistent commit", () => {
    expect(getCommitById("nonexistent")).toBeUndefined();
  });

  it("creates multiple commits in a transaction", () => {
    const commits = [
      makeCommit({ id: "c1", timestamp: "2025-03-10T10:00:00Z" }),
      makeCommit({ id: "c2", timestamp: "2025-03-10T11:00:00Z" }),
      makeCommit({ id: "c3", timestamp: "2025-03-10T12:00:00Z" }),
    ];
    createCommits(commits);
    const { total } = getCommitsByRepo("repo-1");
    expect(total).toBe(3);
  });

  it("gets commits by repo with pagination", () => {
    const commits = Array.from({ length: 5 }, (_, i) =>
      makeCommit({
        id: `c${i}`,
        timestamp: `2025-03-10T1${i}:00:00Z`,
      })
    );
    createCommits(commits);

    const page1 = getCommitsByRepo("repo-1", { page: 1, limit: 2 });
    expect(page1.commits).toHaveLength(2);
    expect(page1.total).toBe(5);

    const page2 = getCommitsByRepo("repo-1", { page: 2, limit: 2 });
    expect(page2.commits).toHaveLength(2);

    const page3 = getCommitsByRepo("repo-1", { page: 3, limit: 2 });
    expect(page3.commits).toHaveLength(1);
  });

  it("filters commits by date range", () => {
    createCommits([
      makeCommit({ id: "c1", timestamp: "2025-03-09T10:00:00Z" }),
      makeCommit({ id: "c2", timestamp: "2025-03-10T10:00:00Z" }),
      makeCommit({ id: "c3", timestamp: "2025-03-11T10:00:00Z" }),
    ]);

    const { commits, total } = getCommitsByRepo("repo-1", {
      from: "2025-03-10T00:00:00Z",
      to: "2025-03-10T23:59:59Z",
    });
    expect(commits).toHaveLength(1);
    expect(total).toBe(1);
    expect(commits[0].id).toBe("c2");
  });

  it("gets commits by author", () => {
    createCommits([
      makeCommit({ id: "c1", author: "alice" }),
      makeCommit({ id: "c2", author: "bob" }),
      makeCommit({ id: "c3", author: "alice" }),
    ]);

    const aliceCommits = getCommitsByAuthor("alice");
    expect(aliceCommits).toHaveLength(2);
  });

  it("upserts commits (INSERT OR REPLACE)", () => {
    createCommit(makeCommit({ id: "c1", message: "original" }));
    createCommit(makeCommit({ id: "c1", message: "updated" }));

    const commit = getCommitById("c1");
    expect(commit!.message).toBe("updated");
  });

  it("deletes commits by repo", () => {
    createCommits([
      makeCommit({ id: "c1" }),
      makeCommit({ id: "c2" }),
    ]);
    const deleted = deleteCommitsByRepo("repo-1");
    expect(deleted).toBe(2);
    expect(getCommitsByRepo("repo-1").total).toBe(0);
  });

  it("cascades delete when repo is deleted", () => {
    createCommit(makeCommit());
    deleteRepo("repo-1");
    expect(getCommitById("abc123")).toBeUndefined();
  });

  it("returns commits ordered by timestamp", () => {
    createCommits([
      makeCommit({ id: "c2", timestamp: "2025-03-10T12:00:00Z" }),
      makeCommit({ id: "c1", timestamp: "2025-03-10T10:00:00Z" }),
      makeCommit({ id: "c3", timestamp: "2025-03-10T14:00:00Z" }),
    ]);

    const { commits } = getCommitsByRepo("repo-1");
    expect(commits.map((c) => c.id)).toEqual(["c1", "c2", "c3"]);
  });
});

// --- Settings CRUD Tests ---

describe("settings", () => {
  it("returns defaults for new user", () => {
    const settings = getSettings("user-1");
    expect(settings.userId).toBe("user-1");
    expect(settings.defaultTempo).toBe(1.0);
    expect(settings.volume).toBe(0.8);
    expect(settings.theme).toBe("dark");
    expect(settings.instrumentOverrides).toEqual({});
    expect(settings.enabledLanguages).toEqual([]);
    expect(settings.authorMotifs).toEqual([]);
  });

  it("saves and retrieves settings", () => {
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
    saveSettings(input);

    const settings = getSettings("user-1");
    expect(settings.defaultTempo).toBe(2.0);
    expect(settings.defaultRepo).toBe("alice/my-project");
    expect(settings.theme).toBe("light");
    expect(settings.instrumentOverrides).toEqual({ Python: "FMSynth" });
    expect(settings.enabledLanguages).toEqual(["TypeScript", "Python"]);
    expect(settings.authorMotifs).toHaveLength(1);
    expect(settings.authorMotifs[0].login).toBe("alice");
    expect(settings.volume).toBe(0.6);
  });

  it("upserts settings on save", () => {
    saveSettings({
      userId: "user-1",
      defaultTempo: 1.0,
      defaultRepo: "",
      theme: "dark",
      instrumentOverrides: {},
      enabledLanguages: [],
      authorMotifs: [],
      volume: 0.8,
    });
    saveSettings({
      userId: "user-1",
      defaultTempo: 3.0,
      defaultRepo: "bob/repo",
      theme: "light",
      instrumentOverrides: {},
      enabledLanguages: [],
      authorMotifs: [],
      volume: 0.5,
    });

    const settings = getSettings("user-1");
    expect(settings.defaultTempo).toBe(3.0);
    expect(settings.defaultRepo).toBe("bob/repo");
    expect(settings.volume).toBe(0.5);
  });

  it("deletes settings", () => {
    saveSettings({
      userId: "user-1",
      defaultTempo: 1.0,
      defaultRepo: "",
      theme: "dark",
      instrumentOverrides: {},
      enabledLanguages: [],
      authorMotifs: [],
      volume: 0.8,
    });
    expect(deleteSettings("user-1")).toBe(true);

    // Should return defaults after deletion
    const settings = getSettings("user-1");
    expect(settings.defaultTempo).toBe(1.0);
  });

  it("delete returns false for nonexistent user", () => {
    expect(deleteSettings("nonexistent")).toBe(false);
  });
});
