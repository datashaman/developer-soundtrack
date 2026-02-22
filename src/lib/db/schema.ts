import type Database from "better-sqlite3";

export function initializeSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS repos (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL UNIQUE,
      description TEXT,
      default_branch TEXT NOT NULL DEFAULT 'main',
      language TEXT,
      webhook_id TEXT,
      webhook_secret TEXT,
      last_fetched_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS commits (
      id TEXT PRIMARY KEY,
      repo_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      author TEXT NOT NULL,
      message TEXT NOT NULL,
      additions INTEGER NOT NULL DEFAULT 0,
      deletions INTEGER NOT NULL DEFAULT 0,
      files_changed INTEGER NOT NULL DEFAULT 0,
      primary_language TEXT NOT NULL DEFAULT 'Other',
      languages TEXT NOT NULL DEFAULT '{}',
      ci_status TEXT NOT NULL DEFAULT 'unknown',
      musical_params TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (repo_id) REFERENCES repos(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_commits_repo_time
      ON commits(repo_id, timestamp);

    CREATE INDEX IF NOT EXISTS idx_commits_author
      ON commits(author);

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY,
      default_tempo REAL NOT NULL DEFAULT 1.0,
      default_repo TEXT,
      theme TEXT NOT NULL DEFAULT 'dark',
      instrument_overrides TEXT NOT NULL DEFAULT '{}',
      enabled_languages TEXT NOT NULL DEFAULT '[]',
      author_motifs TEXT NOT NULL DEFAULT '[]',
      volume REAL NOT NULL DEFAULT 0.8,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}
