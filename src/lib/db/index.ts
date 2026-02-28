import { createClient, type Client } from "@libsql/client";
import { initializeSchema } from "./schema";

let client: Client | null = null;
let schemaReady: Promise<void> | null = null;

export function getDatabase(): Client {
  if (client) return client;

  const url = process.env.TURSO_DATABASE_URL || "file:./data/soundtrack.db";
  const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

  client = createClient({ url, authToken });
  return client;
}

export async function ensureSchema(): Promise<void> {
  const db = getDatabase();
  if (!schemaReady) {
    schemaReady = initializeSchema(db);
  }
  await schemaReady;
}

export function closeDatabase(): void {
  if (client) {
    client.close();
    client = null;
    schemaReady = null;
  }
}
