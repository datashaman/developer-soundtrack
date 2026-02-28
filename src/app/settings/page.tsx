"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { InstrumentMapper } from "@/components/settings/InstrumentMapper";
import { LanguageToggle } from "@/components/settings/LanguageToggle";
import { useTheme } from "@/hooks/useTheme";
import type { UserSettings } from "@/types";

interface Repo {
  fullName: string;
  description: string | null;
  language: string | null;
  pushedAt: string | null;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  const [tempo, setTempo] = useState(1.0);
  const [volume, setVolume] = useState(80);
  const [defaultRepo, setDefaultRepo] = useState("");
  const [instrumentOverrides, setInstrumentOverrides] = useState<Record<string, string>>({});
  const [enabledLanguages, setEnabledLanguages] = useState<string[]>([]);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [reposLoading, setReposLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState("");

  // Load settings on mount
  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const response = await fetch("/api/settings");
        if (!response.ok) return;
        const data = await response.json();
        const settings: UserSettings = data.settings;
        if (cancelled) return;
        setTempo(settings.defaultTempo);
        setVolume(Math.round(settings.volume * 100));
        setDefaultRepo(settings.defaultRepo);
        setInstrumentOverrides(settings.instrumentOverrides ?? {});
        setEnabledLanguages(settings.enabledLanguages ?? []);
      } catch {
        // Settings will use defaults
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadSettings();
    return () => { cancelled = true; };
  }, []);

  // Load repos for dropdown
  useEffect(() => {
    let cancelled = false;

    async function loadRepos() {
      try {
        const response = await fetch("/api/repos");
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled) setRepos(data.repos);
      } catch {
        // Repos will be empty
      } finally {
        if (!cancelled) setReposLoading(false);
      }
    }

    loadRepos();
    return () => { cancelled = true; };
  }, []);

  const handleSave = useCallback(async () => {
    setSaveStatus("saving");
    setSaveError("");

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultTempo: tempo,
          volume: volume / 100,
          defaultRepo,
          theme,
          instrumentOverrides,
          enabledLanguages,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Failed to save (${response.status})`);
      }

      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err: unknown) {
      setSaveStatus("error");
      setSaveError(err instanceof Error ? err.message : "Failed to save settings");
    }
  }, [tempo, volume, defaultRepo, theme, instrumentOverrides, enabledLanguages]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-text-muted text-sm font-mono">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto max-w-3xl px-4 pt-8 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="min-h-11 min-w-11 md:min-h-0 md:min-w-0 flex items-center justify-center text-text-faint hover:text-text-secondary transition-colors shrink-0"
            aria-label="Back to dashboard"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-accent font-mono">
            Settings
          </h1>
        </div>
        <ThemeToggle />
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        {/* Playback Section */}
        <div className="rounded-xl border border-border-strong bg-surface p-6 space-y-6">
          <h2 className="text-sm font-mono font-semibold text-text-muted uppercase tracking-wider">
            Playback
          </h2>

          {/* Tempo */}
          <div>
            <label
              htmlFor="tempo-slider"
              className="block text-sm font-mono text-text-primary mb-1"
            >
              Tempo
            </label>
            <p className="text-xs text-text-faint mb-3">
              Time between notes (seconds)
            </p>
            <div className="flex items-center gap-4">
              <input
                id="tempo-slider"
                type="range"
                min="0.3"
                max="5.0"
                step="0.1"
                value={tempo}
                onChange={(e) => setTempo(parseFloat(e.target.value))}
                className="flex-1 h-2 rounded-full appearance-none bg-progress-bg accent-accent cursor-pointer"
              />
              <input
                type="number"
                min="0.3"
                max="5.0"
                step="0.1"
                value={tempo}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v)) setTempo(Math.min(5.0, Math.max(0.3, v)));
                }}
                aria-label="Tempo value"
                className="w-20 rounded-lg bg-input-bg border border-border-strong text-foreground px-3 py-2 text-sm font-mono text-center focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30"
              />
              <span className="text-xs text-text-faint font-mono w-4">s</span>
            </div>
          </div>

          {/* Volume */}
          <div>
            <label
              htmlFor="volume-slider"
              className="block text-sm font-mono text-text-primary mb-1"
            >
              Volume
            </label>
            <p className="text-xs text-text-faint mb-3">
              Default playback volume
            </p>
            <div className="flex items-center gap-4">
              <input
                id="volume-slider"
                type="range"
                min="0"
                max="100"
                step="1"
                value={volume}
                onChange={(e) => setVolume(parseInt(e.target.value, 10))}
                className="flex-1 h-2 rounded-full appearance-none bg-progress-bg accent-accent cursor-pointer"
              />
              <span className="text-sm font-mono text-text-primary w-12 text-right">
                {volume}%
              </span>
            </div>
          </div>
        </div>

        {/* Instrument Overrides Section */}
        <div className="rounded-xl border border-border-strong bg-surface p-6">
          <InstrumentMapper
            overrides={instrumentOverrides}
            onChange={setInstrumentOverrides}
          />
        </div>

        {/* Language Toggles Section */}
        <div className="rounded-xl border border-border-strong bg-surface p-6">
          <LanguageToggle
            enabledLanguages={enabledLanguages}
            onChange={setEnabledLanguages}
          />
        </div>

        {/* Default Repository Section */}
        <div className="rounded-xl border border-border-strong bg-surface p-6">
          <h2 className="text-sm font-mono font-semibold text-text-muted uppercase tracking-wider mb-4">
            Default Repository
          </h2>
          <p className="text-xs text-text-faint mb-3">
            Pre-selected repository when you open the dashboard
          </p>
          <select
            id="default-repo"
            value={defaultRepo}
            onChange={(e) => setDefaultRepo(e.target.value)}
            disabled={reposLoading}
            className="w-full rounded-lg bg-input-bg border border-border-strong text-foreground px-4 py-3 min-h-11 text-sm font-mono focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 disabled:opacity-50 disabled:cursor-wait appearance-none"
          >
            <option value="" className="bg-option-bg">
              {reposLoading ? "Loading repositories..." : "None"}
            </option>
            {repos.map((repo) => (
              <option
                key={repo.fullName}
                value={repo.fullName}
                className="bg-option-bg"
              >
                {repo.fullName}
                {repo.language ? ` · ${repo.language}` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Appearance Section */}
        <div className="rounded-xl border border-border-strong bg-surface p-6">
          <h2 className="text-sm font-mono font-semibold text-text-muted uppercase tracking-wider mb-4">
            Appearance
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-mono text-text-primary">Theme</p>
              <p className="text-xs text-text-faint mt-0.5">
                Choose between dark and light mode
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTheme("dark")}
                className={`px-4 py-2 min-h-11 rounded-lg text-sm font-mono transition-colors ${
                  theme === "dark"
                    ? "bg-accent/15 text-accent border border-accent/30"
                    : "bg-input-bg text-text-muted border border-border-strong hover:bg-progress-bg hover:text-text-primary"
                }`}
              >
                Dark
              </button>
              <button
                onClick={() => setTheme("light")}
                className={`px-4 py-2 min-h-11 rounded-lg text-sm font-mono transition-colors ${
                  theme === "light"
                    ? "bg-accent/15 text-accent border border-accent/30"
                    : "bg-input-bg text-text-muted border border-border-strong hover:bg-progress-bg hover:text-text-primary"
                }`}
              >
                Light
              </button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saveStatus === "saving"}
            className="rounded-lg bg-accent hover:bg-accent-hover disabled:bg-progress-bg disabled:text-text-ghost text-background font-semibold px-8 py-3 min-h-11 text-sm transition-colors disabled:cursor-not-allowed"
          >
            {saveStatus === "saving" ? "Saving..." : "Save Settings"}
          </button>

          {saveStatus === "saved" && (
            <span className="text-sm font-mono text-green-400">
              Settings saved successfully
            </span>
          )}

          {saveStatus === "error" && (
            <span className="text-sm font-mono text-red-400">
              {saveError}
            </span>
          )}
        </div>
      </main>
    </div>
  );
}
