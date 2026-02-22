import type { Commit, MusicalParams } from "@/types";
import { getDatabase } from "./index";

export interface CommitRow {
  id: string;
  repo_id: string;
  timestamp: string;
  author: string;
  message: string;
  additions: number;
  deletions: number;
  files_changed: number;
  primary_language: string;
  languages: string;
  ci_status: string;
  musical_params: string;
  created_at: string;
}

function rowToCommit(row: CommitRow): Commit {
  return {
    id: row.id,
    repoId: row.repo_id,
    timestamp: row.timestamp,
    author: row.author,
    message: row.message,
    stats: {
      additions: row.additions,
      deletions: row.deletions,
      filesChanged: row.files_changed,
    },
    primaryLanguage: row.primary_language,
    languages: JSON.parse(row.languages) as Record<string, number>,
    ciStatus: row.ci_status as Commit["ciStatus"],
    musicalParams: JSON.parse(row.musical_params) as MusicalParams,
  };
}

export function createCommit(commit: Commit): Commit {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO commits
      (id, repo_id, timestamp, author, message, additions, deletions,
       files_changed, primary_language, languages, ci_status, musical_params)
    VALUES
      (@id, @repoId, @timestamp, @author, @message, @additions, @deletions,
       @filesChanged, @primaryLanguage, @languages, @ciStatus, @musicalParams)
  `);
  stmt.run({
    id: commit.id,
    repoId: commit.repoId,
    timestamp: commit.timestamp,
    author: commit.author,
    message: commit.message,
    additions: commit.stats.additions,
    deletions: commit.stats.deletions,
    filesChanged: commit.stats.filesChanged,
    primaryLanguage: commit.primaryLanguage,
    languages: JSON.stringify(commit.languages),
    ciStatus: commit.ciStatus,
    musicalParams: JSON.stringify(commit.musicalParams),
  });
  return commit;
}

export function createCommits(commits: Commit[]): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO commits
      (id, repo_id, timestamp, author, message, additions, deletions,
       files_changed, primary_language, languages, ci_status, musical_params)
    VALUES
      (@id, @repoId, @timestamp, @author, @message, @additions, @deletions,
       @filesChanged, @primaryLanguage, @languages, @ciStatus, @musicalParams)
  `);
  const insertMany = db.transaction((items: Commit[]) => {
    for (const commit of items) {
      stmt.run({
        id: commit.id,
        repoId: commit.repoId,
        timestamp: commit.timestamp,
        author: commit.author,
        message: commit.message,
        additions: commit.stats.additions,
        deletions: commit.stats.deletions,
        filesChanged: commit.stats.filesChanged,
        primaryLanguage: commit.primaryLanguage,
        languages: JSON.stringify(commit.languages),
        ciStatus: commit.ciStatus,
        musicalParams: JSON.stringify(commit.musicalParams),
      });
    }
  });
  insertMany(commits);
}

export function getCommitById(id: string): Commit | undefined {
  const db = getDatabase();
  const row = db.prepare("SELECT * FROM commits WHERE id = ?").get(id) as
    | CommitRow
    | undefined;
  return row ? rowToCommit(row) : undefined;
}

export function getCommitsByRepo(
  repoId: string,
  options?: {
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }
): { commits: Commit[]; total: number } {
  const db = getDatabase();
  const conditions: string[] = ["repo_id = @repoId"];
  const values: Record<string, unknown> = { repoId };

  if (options?.from) {
    conditions.push("timestamp >= @from");
    values.from = options.from;
  }
  if (options?.to) {
    conditions.push("timestamp <= @to");
    values.to = options.to;
  }

  const where = conditions.join(" AND ");

  const countRow = db
    .prepare(`SELECT COUNT(*) as count FROM commits WHERE ${where}`)
    .get(values) as { count: number };
  const total = countRow.count;

  const limit = options?.limit ?? 100;
  const page = options?.page ?? 1;
  const offset = (page - 1) * limit;

  const rows = db
    .prepare(
      `SELECT * FROM commits WHERE ${where} ORDER BY timestamp ASC LIMIT @limit OFFSET @offset`
    )
    .all({ ...values, limit, offset }) as CommitRow[];

  return { commits: rows.map(rowToCommit), total };
}

export function getCommitsByAuthor(author: string): Commit[] {
  const db = getDatabase();
  const rows = db
    .prepare("SELECT * FROM commits WHERE author = ? ORDER BY timestamp ASC")
    .all(author) as CommitRow[];
  return rows.map(rowToCommit);
}

export function deleteCommitsByRepo(repoId: string): number {
  const db = getDatabase();
  const result = db
    .prepare("DELETE FROM commits WHERE repo_id = ?")
    .run(repoId);
  return result.changes;
}
