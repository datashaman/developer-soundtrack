"use client";

import { LANGUAGE_SYNTH_MAP } from "@/lib/music/synths";

/** Language color map */
const LANGUAGE_COLORS: Record<string, string> = {
  Python: "#3572A5",
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Rust: "#dea584",
  Go: "#00ADD8",
  Java: "#b07219",
  C: "#555555",
  "C++": "#f34b7d",
  Ruby: "#701516",
  CSS: "#563d7c",
  HTML: "#e34c26",
  Shell: "#89e051",
  Markdown: "#083fa1",
  Other: "#00ffc8",
};

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
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {activeLanguages.map((lang) => {
          const config = LANGUAGE_SYNTH_MAP[lang] ?? LANGUAGE_SYNTH_MAP["Other"];
          const instrumentName = SYNTH_DISPLAY_NAMES[config.type] ?? config.type;
          const color = LANGUAGE_COLORS[lang] ?? LANGUAGE_COLORS.Other;

          return (
            <span
              key={lang}
              className="flex items-center gap-1.5 text-xs font-mono text-white/50"
            >
              <span
                className="inline-block h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-white/70">{lang}</span>
              <span className="text-white/30">{instrumentName}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
