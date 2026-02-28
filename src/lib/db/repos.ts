import { getDatabase, ensureSchema } from "./index";
import type { Row } from "@libsql/client";

export interface RepoRow {
  id: string;
  full_name: string;
  description: string | null;
  default_branch: string;
  language: string | null;
  webhook_id: string | null;
  webhook_secret: string | null;
  last_fetched_at: string | null;
  last_fetched_from: string | null;
  last_fetched_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateRepoInput {
  id: string;
  fullName: string;
  description?: string | null;
  defaultBranch?: string;
  language?: string | null;
}

export interface UpdateRepoInput {
  description?: string | null;
  defaultBranch?: string;
  language?: string | null;
  webhookId?: string | null;
  webhookSecret?: string | null;
  lastFetchedAt?: string | null;
  lastFetchedFrom?: string | null;
  lastFetchedTo?: string | null;
}

function rowToRepo(row: Row): RepoRow {
  return {
    id: row.id as string,
    full_name: row.full_name as string,
    description: row.description as string | null,
    default_branch: row.default_branch as string,
    language: row.language as string | null,
    webhook_id: row.webhook_id as string | null,
    webhook_secret: row.webhook_secret as string | null,
    last_fetched_at: row.last_fetched_at as string | null,
    last_fetched_from: row.last_fetched_from as string | null,
    last_fetched_to: row.last_fetched_to as string | null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function createRepo(input: CreateRepoInput): Promise<RepoRow> {
  await ensureSchema();
  const db = getDatabase();
  await db.execute({
    sql: `INSERT INTO repos (id, full_name, description, default_branch, language)
          VALUES (?, ?, ?, ?, ?)`,
    args: [
      input.id,
      input.fullName,
      input.description ?? null,
      input.defaultBranch ?? "main",
      input.language ?? null,
    ],
  });
  return (await getRepoById(input.id))!;
}

export async function getRepoById(id: string): Promise<RepoRow | undefined> {
  await ensureSchema();
  const db = getDatabase();
  const result = await db.execute({
    sql: "SELECT * FROM repos WHERE id = ?",
    args: [id],
  });
  return result.rows.length > 0 ? rowToRepo(result.rows[0]) : undefined;
}

export async function getRepoByFullName(fullName: string): Promise<RepoRow | undefined> {
  await ensureSchema();
  const db = getDatabase();
  const result = await db.execute({
    sql: "SELECT * FROM repos WHERE full_name = ?",
    args: [fullName],
  });
  return result.rows.length > 0 ? rowToRepo(result.rows[0]) : undefined;
}

export async function getAllRepos(): Promise<RepoRow[]> {
  await ensureSchema();
  const db = getDatabase();
  const result = await db.execute("SELECT * FROM repos ORDER BY updated_at DESC");
  return result.rows.map(rowToRepo);
}

export async function updateRepo(id: string, input: UpdateRepoInput): Promise<RepoRow | undefined> {
  await ensureSchema();
  const db = getDatabase();
  const fields: string[] = [];
  const values: (string | null)[] = [];

  if (input.description !== undefined) {
    fields.push("description = ?");
    values.push(input.description ?? null);
  }
  if (input.defaultBranch !== undefined) {
    fields.push("default_branch = ?");
    values.push(input.defaultBranch);
  }
  if (input.language !== undefined) {
    fields.push("language = ?");
    values.push(input.language ?? null);
  }
  if (input.webhookId !== undefined) {
    fields.push("webhook_id = ?");
    values.push(input.webhookId ?? null);
  }
  if (input.webhookSecret !== undefined) {
    fields.push("webhook_secret = ?");
    values.push(input.webhookSecret ?? null);
  }
  if (input.lastFetchedAt !== undefined) {
    fields.push("last_fetched_at = ?");
    values.push(input.lastFetchedAt ?? null);
  }
  if (input.lastFetchedFrom !== undefined) {
    fields.push("last_fetched_from = ?");
    values.push(input.lastFetchedFrom ?? null);
  }
  if (input.lastFetchedTo !== undefined) {
    fields.push("last_fetched_to = ?");
    values.push(input.lastFetchedTo ?? null);
  }

  if (fields.length === 0) return getRepoById(id);

  fields.push("updated_at = datetime('now')");
  values.push(id);

  await db.execute({
    sql: `UPDATE repos SET ${fields.join(", ")} WHERE id = ?`,
    args: values,
  });
  return getRepoById(id);
}

export async function deleteRepo(id: string): Promise<boolean> {
  await ensureSchema();
  const db = getDatabase();
  const result = await db.execute({
    sql: "DELETE FROM repos WHERE id = ?",
    args: [id],
  });
  return (result.rowsAffected ?? 0) > 0;
}
