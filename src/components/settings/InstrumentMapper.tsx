"use client";

import { useCallback, useRef, useState } from "react";
import * as Tone from "tone";
import {
  LANGUAGE_SYNTH_MAP,
  type SynthConfig,
  type SynthType,
} from "@/lib/music/synths";
import { LANGUAGE_COLORS } from "@/components/shared/LanguageIcon";

const SYNTH_TYPES: SynthType[] = [
  "AMSynth",
  "FMSynth",
  "MonoSynth",
  "MetalSynth",
  "NoiseSynth",
  "PluckSynth",
  "Synth",
];

const LANGUAGES = Object.keys(LANGUAGE_SYNTH_MAP);

type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U>
    ? Array<RecursivePartial<U>>
    : T[P] extends object
      ? RecursivePartial<T[P]>
      : T[P];
};

function createPreviewSynth(config: SynthConfig): Tone.Synth | Tone.AMSynth | Tone.FMSynth | Tone.MonoSynth | Tone.MetalSynth | Tone.NoiseSynth | Tone.PluckSynth {
  const opts = config.options;
  switch (config.type) {
    case "AMSynth":
      return new Tone.AMSynth(opts as RecursivePartial<Tone.AMSynthOptions>);
    case "FMSynth":
      return new Tone.FMSynth(opts as RecursivePartial<Tone.FMSynthOptions>);
    case "MonoSynth":
      return new Tone.MonoSynth(opts as RecursivePartial<Tone.MonoSynthOptions>);
    case "MetalSynth":
      return new Tone.MetalSynth(opts as RecursivePartial<Tone.MetalSynthOptions>);
    case "NoiseSynth":
      return new Tone.NoiseSynth(opts as RecursivePartial<Tone.NoiseSynthOptions>);
    case "PluckSynth":
      return new Tone.PluckSynth(opts as RecursivePartial<Tone.PluckSynthOptions>);
    case "Synth":
    default:
      return new Tone.Synth(opts as RecursivePartial<Tone.SynthOptions>);
  }
}

interface InstrumentMapperProps {
  overrides: Record<string, string>;
  onChange: (overrides: Record<string, string>) => void;
}

export function InstrumentMapper({ overrides, onChange }: InstrumentMapperProps) {
  const [previewingLang, setPreviewingLang] = useState<string | null>(null);
  const previewSynthRef = useRef<Tone.Synth | Tone.AMSynth | Tone.FMSynth | Tone.MonoSynth | Tone.MetalSynth | Tone.NoiseSynth | Tone.PluckSynth | null>(null);

  const getEffectiveSynthType = useCallback((language: string): SynthType => {
    if (overrides[language] && SYNTH_TYPES.includes(overrides[language] as SynthType)) {
      return overrides[language] as SynthType;
    }
    return LANGUAGE_SYNTH_MAP[language].type;
  }, [overrides]);

  const handleChange = useCallback((language: string, synthType: string) => {
    const defaultType = LANGUAGE_SYNTH_MAP[language].type;
    const newOverrides = { ...overrides };
    if (synthType === defaultType) {
      delete newOverrides[language];
    } else {
      newOverrides[language] = synthType;
    }
    onChange(newOverrides);
  }, [overrides, onChange]);

  const handlePreview = useCallback(async (language: string) => {
    try {
      await Tone.start();

      // Clean up any previous preview
      if (previewSynthRef.current) {
        previewSynthRef.current.dispose();
        previewSynthRef.current = null;
      }

      const synthType = getEffectiveSynthType(language);
      const defaultConfig = LANGUAGE_SYNTH_MAP[language];
      const config: SynthConfig = {
        type: synthType,
        options: synthType === defaultConfig.type ? defaultConfig.options : {},
      };

      const synth = createPreviewSynth(config);
      synth.toDestination();
      previewSynthRef.current = synth;
      setPreviewingLang(language);

      if (config.type === "NoiseSynth") {
        (synth as Tone.NoiseSynth).triggerAttackRelease("8n");
      } else if (config.type === "MetalSynth") {
        (synth as Tone.MetalSynth).triggerAttackRelease("C4", "8n");
      } else {
        (synth as Tone.Synth).triggerAttackRelease("C4", "8n");
      }

      setTimeout(() => {
        if (previewSynthRef.current === synth) {
          synth.dispose();
          previewSynthRef.current = null;
          setPreviewingLang(null);
        }
      }, 1000);
    } catch {
      setPreviewingLang(null);
    }
  }, [getEffectiveSynthType]);

  const handleReset = useCallback(() => {
    onChange({});
  }, [onChange]);

  const hasOverrides = Object.keys(overrides).length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-mono text-text-primary">
            Instrument Overrides
          </h3>
          <p className="text-xs text-text-faint mt-0.5">
            Customize which synth represents each language
          </p>
        </div>
        <button
          onClick={handleReset}
          disabled={!hasOverrides}
          className="text-xs font-mono text-text-muted hover:text-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Reset to defaults"
        >
          Reset to defaults
        </button>
      </div>

      <div className="rounded-lg border border-border-strong overflow-hidden">
        <table className="w-full text-sm" role="table">
          <thead>
            <tr className="border-b border-border-strong bg-surface">
              <th className="text-left px-4 py-2.5 text-xs font-mono font-semibold text-text-muted uppercase tracking-wider">
                Language
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-mono font-semibold text-text-muted uppercase tracking-wider">
                Instrument
              </th>
              <th className="px-4 py-2.5 w-20">
                <span className="sr-only">Preview</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {LANGUAGES.map((language) => {
              const defaultType = LANGUAGE_SYNTH_MAP[language].type;
              const currentType = getEffectiveSynthType(language);
              const isOverridden = overrides[language] !== undefined;
              const color = LANGUAGE_COLORS[language] ?? LANGUAGE_COLORS.Other;
              const isPreviewing = previewingLang === language;

              return (
                <tr
                  key={language}
                  className="border-b border-border-strong last:border-b-0 hover:bg-surface/50 transition-colors"
                >
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className={`font-mono ${isOverridden ? "text-accent" : "text-text-primary"}`}>
                        {language}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <select
                      value={currentType}
                      onChange={(e) => handleChange(language, e.target.value)}
                      aria-label={`Instrument for ${language}`}
                      className="rounded-md bg-input-bg border border-border-strong text-foreground px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 appearance-none cursor-pointer"
                    >
                      {SYNTH_TYPES.map((type) => (
                        <option key={type} value={type} className="bg-option-bg">
                          {type}{type === defaultType ? " (default)" : ""}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <button
                      onClick={() => handlePreview(language)}
                      disabled={isPreviewing}
                      aria-label={`Preview ${language}`}
                      className="inline-flex items-center gap-1 text-xs font-mono text-text-muted hover:text-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isPreviewing ? (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" className="text-accent animate-pulse">
                          <circle cx="4" cy="7" r="2" />
                          <circle cx="10" cy="7" r="2" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                          <path d="M3 2l9 5-9 5V2z" />
                        </svg>
                      )}
                      <span className="hidden sm:inline">
                        {isPreviewing ? "Playing" : "Preview"}
                      </span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
