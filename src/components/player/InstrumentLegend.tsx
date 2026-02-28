"use client";

import { LANGUAGE_SYNTH_MAP } from "@/lib/music/synths";
import { LanguageIcon } from "@/components/shared/LanguageIcon";

/** Friendly display names for synth types */
const SYNTH_DISPLAY_NAMES: Record<string, string> = {
  AMSynth: "AM Synth",
  FMSynth: "FM Synth",
  MonoSynth: "Mono Synth",
  MetalSynth: "Metal Synth",
  NoiseSynth: "Noise Synth",
  PluckSynth: "Pluck Synth",
  Synth: "Synth",
};

interface InstrumentLegendProps {
  activeLanguages: string[];
}

export function InstrumentLegend({ activeLanguages }: InstrumentLegendProps) {
  if (activeLanguages.length === 0) return null;

  return (
    <div className="rounded-xl bg-surface border border-border-subtle px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {activeLanguages.map((lang) => {
          const config = LANGUAGE_SYNTH_MAP[lang] ?? LANGUAGE_SYNTH_MAP["Other"];
          const instrumentName = SYNTH_DISPLAY_NAMES[config.type] ?? config.type;

          return (
            <span
              key={lang}
              className="flex items-center gap-1.5 text-xs font-mono text-text-muted"
            >
              <LanguageIcon language={lang} size={8} showLabel />
              <span className="text-text-ghost">{instrumentName}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
