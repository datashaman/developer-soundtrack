"use client";

import { useCallback } from "react";
import { LANGUAGE_SYNTH_MAP } from "@/lib/music/synths";
import { LANGUAGE_COLORS } from "@/components/shared/LanguageIcon";

const LANGUAGES = Object.keys(LANGUAGE_SYNTH_MAP);

interface LanguageToggleProps {
  enabledLanguages: string[];
  onChange: (enabledLanguages: string[]) => void;
}

export function LanguageToggle({ enabledLanguages, onChange }: LanguageToggleProps) {
  // Empty array means all enabled (default state)
  const allEnabled = enabledLanguages.length === 0;

  const isEnabled = useCallback(
    (language: string) => allEnabled || enabledLanguages.includes(language),
    [allEnabled, enabledLanguages],
  );

  const handleToggle = useCallback(
    (language: string) => {
      if (allEnabled) {
        // Switching from "all enabled" to explicit list: enable all except this one
        onChange(LANGUAGES.filter((l) => l !== language));
      } else if (enabledLanguages.includes(language)) {
        // Disable this language — but don't allow disabling all
        const next = enabledLanguages.filter((l) => l !== language);
        if (next.length === 0) return;
        onChange(next);
      } else {
        // Enable this language
        const next = [...enabledLanguages, language];
        // If all are now enabled, reset to empty array (default)
        if (next.length === LANGUAGES.length) {
          onChange([]);
        } else {
          onChange(next);
        }
      }
    },
    [allEnabled, enabledLanguages, onChange],
  );

  const handleEnableAll = useCallback(() => {
    onChange([]);
  }, [onChange]);

  const disabledCount = allEnabled
    ? 0
    : LANGUAGES.length - enabledLanguages.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-mono text-text-primary">
            Language Toggles
          </h3>
          <p className="text-xs text-text-faint mt-0.5">
            Mute languages to skip them during playback
          </p>
        </div>
        <button
          onClick={handleEnableAll}
          disabled={allEnabled}
          className="text-xs font-mono text-text-muted hover:text-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Enable all languages"
        >
          Enable all
        </button>
      </div>

      {disabledCount > 0 && (
        <p className="text-xs font-mono text-amber-400">
          {disabledCount} language{disabledCount > 1 ? "s" : ""} muted
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {LANGUAGES.map((language) => {
          const color = LANGUAGE_COLORS[language] ?? LANGUAGE_COLORS.Other;
          const enabled = isEnabled(language);

          return (
            <label
              key={language}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors select-none ${
                enabled
                  ? "border-border-strong bg-surface hover:bg-surface/80"
                  : "border-border-strong/50 bg-surface/30 opacity-50 hover:opacity-70"
              }`}
            >
              <input
                type="checkbox"
                checked={enabled}
                onChange={() => handleToggle(language)}
                className="sr-only"
                aria-label={`Toggle ${language}`}
              />
              <span
                className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${
                  enabled ? "bg-accent" : "bg-progress-bg"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform mt-0.5 ${
                    enabled ? "translate-x-4 ml-0.5" : "translate-x-0.5"
                  }`}
                />
              </span>
              <span
                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-sm font-mono text-text-primary truncate">
                {language}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
