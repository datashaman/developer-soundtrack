import Database from "better-sqlite3";
import path from "path";
import { initializeSchema } from "./schema";

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (db) return db;

  const dbPath =
    process.env.DATABASE_PATH || path.join(process.cwd(), "data", "soundtrack.db");

  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  initializeSchema(db);

  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
