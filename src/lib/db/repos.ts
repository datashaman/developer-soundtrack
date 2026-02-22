import { getDatabase } from "./index";

export interface RepoRow {
  id: string;
  full_name: string;
  description: string | null;
  default_branch: string;
  language: string | null;
  webhook_id: string | null;
  webhook_secret: string | null;
  last_fetched_at: string | null;
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
}

export function createRepo(input: CreateRepoInput): RepoRow {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO repos (id, full_name, description, default_branch, language)
    VALUES (@id, @fullName, @description, @defaultBranch, @language)
  `);
  stmt.run({
    id: input.id,
    fullName: input.fullName,
    description: input.description ?? null,
    defaultBranch: input.defaultBranch ?? "main",
    language: input.language ?? null,
  });
  return getRepoById(input.id)!;
}

export function getRepoById(id: string): RepoRow | undefined {
  const db = getDatabase();
  return db.prepare("SELECT * FROM repos WHERE id = ?").get(id) as
    | RepoRow
    | undefined;
}

export function getRepoByFullName(fullName: string): RepoRow | undefined {
  const db = getDatabase();
  return db.prepare("SELECT * FROM repos WHERE full_name = ?").get(fullName) as
    | RepoRow
    | undefined;
}

export function getAllRepos(): RepoRow[] {
  const db = getDatabase();
  return db.prepare("SELECT * FROM repos ORDER BY updated_at DESC").all() as RepoRow[];
}

export function updateRepo(id: string, input: UpdateRepoInput): RepoRow | undefined {
  const db = getDatabase();
  const fields: string[] = [];
  const values: Record<string, unknown> = { id };

  if (input.description !== undefined) {
    fields.push("description = @description");
    values.description = input.description;
  }
  if (input.defaultBranch !== undefined) {
    fields.push("default_branch = @defaultBranch");
    values.defaultBranch = input.defaultBranch;
  }
  if (input.language !== undefined) {
    fields.push("language = @language");
    values.language = input.language;
  }
  if (input.webhookId !== undefined) {
    fields.push("webhook_id = @webhookId");
    values.webhookId = input.webhookId;
  }
  if (input.webhookSecret !== undefined) {
    fields.push("webhook_secret = @webhookSecret");
    values.webhookSecret = input.webhookSecret;
  }
  if (input.lastFetchedAt !== undefined) {
    fields.push("last_fetched_at = @lastFetchedAt");
    values.lastFetchedAt = input.lastFetchedAt;
  }

  if (fields.length === 0) return getRepoById(id);

  fields.push("updated_at = datetime('now')");

  db.prepare(`UPDATE repos SET ${fields.join(", ")} WHERE id = @id`).run(values);
  return getRepoById(id);
}

export function deleteRepo(id: string): boolean {
  const db = getDatabase();
  const result = db.prepare("DELETE FROM repos WHERE id = ?").run(id);
  return result.changes > 0;
}
