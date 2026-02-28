import type { AuthorMotif, UserSettings } from "@/types";
import type { Row } from "@libsql/client";
import { getDatabase, ensureSchema } from "./index";

const DEFAULT_SETTINGS: Omit<UserSettings, "userId"> = {
  defaultTempo: 1.0,
  defaultRepo: "",
  theme: "dark",
  instrumentOverrides: {},
  enabledLanguages: [],
  authorMotifs: [],
  volume: 0.8,
};

function rowToSettings(row: Row): UserSettings {
  return {
    userId: row.user_id as string,
    defaultTempo: row.default_tempo as number,
    defaultRepo: (row.default_repo as string | null) ?? "",
    theme: (row.theme as string) as UserSettings["theme"],
    instrumentOverrides: JSON.parse(row.instrument_overrides as string) as Record<string, string>,
    enabledLanguages: JSON.parse(row.enabled_languages as string) as string[],
    authorMotifs: JSON.parse(row.author_motifs as string) as AuthorMotif[],
    volume: row.volume as number,
  };
}

export async function getSettings(userId: string): Promise<UserSettings> {
  await ensureSchema();
  const db = getDatabase();
  const result = await db.execute({
    sql: "SELECT * FROM user_settings WHERE user_id = ?",
    args: [userId],
  });

  if (result.rows.length === 0) {
    return { userId, ...DEFAULT_SETTINGS };
  }

  return rowToSettings(result.rows[0]);
}

export async function saveSettings(settings: UserSettings): Promise<UserSettings> {
  await ensureSchema();
  const db = getDatabase();
  await db.execute({
    sql: `INSERT INTO user_settings
      (user_id, default_tempo, default_repo, theme, instrument_overrides,
       enabled_languages, author_motifs, volume)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      default_tempo = ?,
      default_repo = ?,
      theme = ?,
      instrument_overrides = ?,
      enabled_languages = ?,
      author_motifs = ?,
      volume = ?,
      updated_at = datetime('now')`,
    args: [
      settings.userId,
      settings.defaultTempo,
      settings.defaultRepo || null,
      settings.theme,
      JSON.stringify(settings.instrumentOverrides),
      JSON.stringify(settings.enabledLanguages),
      JSON.stringify(settings.authorMotifs),
      settings.volume,
      // ON CONFLICT SET values
      settings.defaultTempo,
      settings.defaultRepo || null,
      settings.theme,
      JSON.stringify(settings.instrumentOverrides),
      JSON.stringify(settings.enabledLanguages),
      JSON.stringify(settings.authorMotifs),
      settings.volume,
    ],
  });

  return getSettings(settings.userId);
}

export async function deleteSettings(userId: string): Promise<boolean> {
  await ensureSchema();
  const db = getDatabase();
  const result = await db.execute({
    sql: "DELETE FROM user_settings WHERE user_id = ?",
    args: [userId],
  });
  return (result.rowsAffected ?? 0) > 0;
}
