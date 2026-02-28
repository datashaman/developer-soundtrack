import type { Commit, MusicalParams } from "@/types";
import type { Row } from "@libsql/client";
import { getDatabase, ensureSchema } from "./index";

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

function rowToCommit(row: Row): Commit {
  return {
    id: row.id as string,
    repoId: row.repo_id as string,
    timestamp: row.timestamp as string,
    author: row.author as string,
    message: row.message as string,
    stats: {
      additions: row.additions as number,
      deletions: row.deletions as number,
      filesChanged: row.files_changed as number,
    },
    primaryLanguage: row.primary_language as string,
    languages: JSON.parse(row.languages as string) as Record<string, number>,
    ciStatus: (row.ci_status as string) as Commit["ciStatus"],
    musicalParams: JSON.parse(row.musical_params as string) as MusicalParams,
  };
}

export async function createCommit(commit: Commit): Promise<Commit> {
  await ensureSchema();
  const db = getDatabase();
  await db.execute({
    sql: `INSERT OR REPLACE INTO commits
      (id, repo_id, timestamp, author, message, additions, deletions,
       files_changed, primary_language, languages, ci_status, musical_params)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      commit.id,
      commit.repoId,
      commit.timestamp,
      commit.author,
      commit.message,
      commit.stats.additions,
      commit.stats.deletions,
      commit.stats.filesChanged,
      commit.primaryLanguage,
      JSON.stringify(commit.languages),
      commit.ciStatus,
      JSON.stringify(commit.musicalParams),
    ],
  });
  return commit;
}

export async function createCommits(commits: Commit[]): Promise<void> {
  await ensureSchema();
  const db = getDatabase();
  await db.batch(
    commits.map((commit) => ({
      sql: `INSERT OR REPLACE INTO commits
        (id, repo_id, timestamp, author, message, additions, deletions,
         files_changed, primary_language, languages, ci_status, musical_params)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        commit.id,
        commit.repoId,
        commit.timestamp,
        commit.author,
        commit.message,
        commit.stats.additions,
        commit.stats.deletions,
        commit.stats.filesChanged,
        commit.primaryLanguage,
        JSON.stringify(commit.languages),
        commit.ciStatus,
        JSON.stringify(commit.musicalParams),
      ],
    })),
  );
}

export async function getCommitById(id: string): Promise<Commit | undefined> {
  await ensureSchema();
  const db = getDatabase();
  const result = await db.execute({
    sql: "SELECT * FROM commits WHERE id = ?",
    args: [id],
  });
  return result.rows.length > 0 ? rowToCommit(result.rows[0]) : undefined;
}

export async function getCommitsByIds(ids: string[]): Promise<Commit[]> {
  if (ids.length === 0) return [];
  await ensureSchema();
  const db = getDatabase();
  const placeholders = ids.map(() => "?").join(", ");
  const result = await db.execute({
    sql: `SELECT * FROM commits WHERE id IN (${placeholders}) ORDER BY timestamp ASC`,
    args: ids,
  });
  return result.rows.map(rowToCommit);
}

export async function getCommitsByRepo(
  repoId: string,
  options?: {
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  },
): Promise<{ commits: Commit[]; total: number }> {
  await ensureSchema();
  const db = getDatabase();
  const conditions: string[] = ["repo_id = ?"];
  const values: (string | number)[] = [repoId];

  if (options?.from) {
    conditions.push("timestamp >= ?");
    values.push(options.from);
  }
  if (options?.to) {
    conditions.push("timestamp <= ?");
    values.push(options.to);
  }

  const where = conditions.join(" AND ");

  const countResult = await db.execute({
    sql: `SELECT COUNT(*) as count FROM commits WHERE ${where}`,
    args: values,
  });
  const total = countResult.rows[0].count as number;

  const limit = options?.limit ?? 100;
  const page = options?.page ?? 1;
  const offset = (page - 1) * limit;

  const result = await db.execute({
    sql: `SELECT * FROM commits WHERE ${where} ORDER BY timestamp ASC LIMIT ? OFFSET ?`,
    args: [...values, limit, offset],
  });

  return { commits: result.rows.map(rowToCommit), total };
}

export async function getCommitsByAuthor(author: string): Promise<Commit[]> {
  await ensureSchema();
  const db = getDatabase();
  const result = await db.execute({
    sql: "SELECT * FROM commits WHERE author = ? ORDER BY timestamp ASC",
    args: [author],
  });
  return result.rows.map(rowToCommit);
}

export async function getDistinctAuthors(): Promise<string[]> {
  await ensureSchema();
  const db = getDatabase();
  const result = await db.execute({
    sql: "SELECT DISTINCT author FROM commits ORDER BY author ASC",
    args: [],
  });
  return result.rows.map((row) => row.author as string);
}

export async function deleteCommitsByRepo(repoId: string): Promise<number> {
  await ensureSchema();
  const db = getDatabase();
  const result = await db.execute({
    sql: "DELETE FROM commits WHERE repo_id = ?",
    args: [repoId],
  });
  return result.rowsAffected ?? 0;
}
