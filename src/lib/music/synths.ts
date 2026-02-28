import * as Tone from "tone";

type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U>
    ? Array<RecursivePartial<U>>
    : T[P] extends object
      ? RecursivePartial<T[P]>
      : T[P];
};

export type SynthType =
  | "AMSynth"
  | "FMSynth"
  | "MonoSynth"
  | "MetalSynth"
  | "NoiseSynth"
  | "PluckSynth"
  | "Synth";

export interface SynthConfig {
  type: SynthType;
  options: Record<string, unknown>;
}

export const LANGUAGE_SYNTH_MAP: Record<string, SynthConfig> = {
  Python: {
    type: "AMSynth",
    options: {
      oscillator: { type: "sine" },
      envelope: { attack: 0.05, decay: 0.3, sustain: 0.4, release: 0.8 },
    },
  },
  JavaScript: {
    type: "FMSynth",
    options: {
      modulationIndex: 5,
      oscillator: { type: "sine" },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.5 },
      modulation: { type: "square" },
    },
  },
  TypeScript: {
    type: "FMSynth",
    options: {
      modulationIndex: 12,
      oscillator: { type: "sine" },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.6 },
      modulation: { type: "triangle" },
    },
  },
  Rust: {
    type: "MonoSynth",
    options: {
      oscillator: { type: "sawtooth" },
      envelope: { attack: 0.02, decay: 0.2, sustain: 0.3, release: 0.4 },
      filterEnvelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.3, baseFrequency: 200, octaves: 3 },
    },
  },
  Go: {
    type: "Synth",
    options: {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.02, decay: 0.2, sustain: 0.5, release: 0.6 },
    },
  },
  Java: {
    type: "AMSynth",
    options: {
      oscillator: { type: "square" },
      envelope: { attack: 0.03, decay: 0.3, sustain: 0.5, release: 0.7 },
    },
  },
  PHP: {
    type: "AMSynth",
    options: {
      oscillator: { type: "sine" },
      envelope: { attack: 0.04, decay: 0.25, sustain: 0.5, release: 0.6 },
    },
  },
  C: {
    type: "MonoSynth",
    options: {
      oscillator: { type: "square" },
      envelope: { attack: 0.01, decay: 0.15, sustain: 0.4, release: 0.3 },
      filterEnvelope: { attack: 0.01, decay: 0.1, sustain: 0.6, release: 0.3, baseFrequency: 300, octaves: 2 },
    },
  },
  "C++": {
    type: "MonoSynth",
    options: {
      oscillator: { type: "square" },
      envelope: { attack: 0.01, decay: 0.15, sustain: 0.4, release: 0.3 },
      filterEnvelope: { attack: 0.01, decay: 0.1, sustain: 0.6, release: 0.3, baseFrequency: 300, octaves: 2 },
    },
  },
  Ruby: {
    type: "MonoSynth",
    options: {
      oscillator: { type: "sawtooth" },
      envelope: { attack: 0.05, decay: 0.3, sustain: 0.5, release: 0.8 },
      filterEnvelope: { attack: 0.02, decay: 0.2, sustain: 0.7, release: 0.5, baseFrequency: 400, octaves: 2 },
    },
  },
  CSS: {
    type: "MetalSynth",
    options: {
      envelope: { attack: 0.01, decay: 0.3, release: 0.3 },
      harmonicity: 5.1,
      modulationIndex: 16,
      resonance: 4000,
      octaves: 1.5,
    },
  },
  HTML: {
    type: "MetalSynth",
    options: {
      envelope: { attack: 0.01, decay: 0.3, release: 0.3 },
      harmonicity: 5.1,
      modulationIndex: 16,
      resonance: 4000,
      octaves: 1.5,
    },
  },
  Shell: {
    type: "NoiseSynth",
    options: {
      noise: { type: "brown" },
      envelope: { attack: 0.01, decay: 0.15, sustain: 0.1, release: 0.2 },
    },
  },
  Markdown: {
    type: "PluckSynth",
    options: {
      attackNoise: 1,
      dampening: 4000,
      resonance: 0.9,
    },
  },
  Other: {
    type: "Synth",
    options: {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.03, decay: 0.2, sustain: 0.4, release: 0.5 },
    },
  },
};

export type ToneInstrument =
  | Tone.Synth
  | Tone.AMSynth
  | Tone.FMSynth
  | Tone.MonoSynth
  | Tone.MetalSynth
  | Tone.NoiseSynth
  | Tone.PluckSynth;

const synthCache = new Map<string, ToneInstrument>();

function createSynthInstance(config: SynthConfig): ToneInstrument {
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

/**
 * Get or create a Tone.js synth instance for a given programming language.
 * Synth instances are cached and reused (lazy creation).
 */
export function getSynthForLanguage(language: string): ToneInstrument {
  const key = language in LANGUAGE_SYNTH_MAP ? language : "Other";

  const cached = synthCache.get(key);
  if (cached) {
    return cached;
  }

  const config = LANGUAGE_SYNTH_MAP[key];
  const synth = createSynthInstance(config);
  synthCache.set(key, synth);
  return synth;
}

/**
 * Get the synth configuration for a given language without creating an instance.
 */
export function getSynthConfig(language: string): SynthConfig {
  return LANGUAGE_SYNTH_MAP[language] ?? LANGUAGE_SYNTH_MAP["Other"];
}

/**
 * Dispose all cached synth instances and clear the cache.
 */
export function disposeAllSynths(): void {
  for (const synth of synthCache.values()) {
    synth.dispose();
  }
  synthCache.clear();
}

/**
 * Get the number of currently cached synth instances.
 */
export function getCachedSynthCount(): number {
  return synthCache.size;
}
