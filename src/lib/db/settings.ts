import type { AuthorMotif, UserSettings } from "@/types";
import { getDatabase } from "./index";

interface SettingsRow {
  user_id: string;
  default_tempo: number;
  default_repo: string | null;
  theme: string;
  instrument_overrides: string;
  enabled_languages: string;
  author_motifs: string;
  volume: number;
  created_at: string;
  updated_at: string;
}

const DEFAULT_SETTINGS: Omit<UserSettings, "userId"> = {
  defaultTempo: 1.0,
  defaultRepo: "",
  theme: "dark",
  instrumentOverrides: {},
  enabledLanguages: [],
  authorMotifs: [],
  volume: 0.8,
};

function rowToSettings(row: SettingsRow): UserSettings {
  return {
    userId: row.user_id,
    defaultTempo: row.default_tempo,
    defaultRepo: row.default_repo ?? "",
    theme: row.theme as UserSettings["theme"],
    instrumentOverrides: JSON.parse(row.instrument_overrides) as Record<string, string>,
    enabledLanguages: JSON.parse(row.enabled_languages) as string[],
    authorMotifs: JSON.parse(row.author_motifs) as AuthorMotif[],
    volume: row.volume,
  };
}

export function getSettings(userId: string): UserSettings {
  const db = getDatabase();
  const row = db
    .prepare("SELECT * FROM user_settings WHERE user_id = ?")
    .get(userId) as SettingsRow | undefined;

  if (!row) {
    return { userId, ...DEFAULT_SETTINGS };
  }

  return rowToSettings(row);
}

export function saveSettings(settings: UserSettings): UserSettings {
  const db = getDatabase();
  db.prepare(`
    INSERT INTO user_settings
      (user_id, default_tempo, default_repo, theme, instrument_overrides,
       enabled_languages, author_motifs, volume)
    VALUES
      (@userId, @defaultTempo, @defaultRepo, @theme, @instrumentOverrides,
       @enabledLanguages, @authorMotifs, @volume)
    ON CONFLICT(user_id) DO UPDATE SET
      default_tempo = @defaultTempo,
      default_repo = @defaultRepo,
      theme = @theme,
      instrument_overrides = @instrumentOverrides,
      enabled_languages = @enabledLanguages,
      author_motifs = @authorMotifs,
      volume = @volume,
      updated_at = datetime('now')
  `).run({
    userId: settings.userId,
    defaultTempo: settings.defaultTempo,
    defaultRepo: settings.defaultRepo || null,
    theme: settings.theme,
    instrumentOverrides: JSON.stringify(settings.instrumentOverrides),
    enabledLanguages: JSON.stringify(settings.enabledLanguages),
    authorMotifs: JSON.stringify(settings.authorMotifs),
    volume: settings.volume,
  });

  return getSettings(settings.userId);
}

export function deleteSettings(userId: string): boolean {
  const db = getDatabase();
  const result = db
    .prepare("DELETE FROM user_settings WHERE user_id = ?")
    .run(userId);
  return result.changes > 0;
}
